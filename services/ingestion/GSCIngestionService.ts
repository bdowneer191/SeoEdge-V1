import { Buffer } from 'node:buffer';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
import { normalizeUrl } from './urlUtils';

// Define the structure for a raw GSC data row in Firestore
interface GscRawData {
  siteUrl: string;
  date: string;
  query: string;
  page: string;
  device: string;
  country: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

const FIRESTORE_COLLECTION = 'gsc_raw';
const FIRESTORE_BATCH_SIZE = 500;
const GSC_ROW_LIMIT = 25000; // Max rows per API request

/**
 * Service to handle ingestion of Google Search Console data into Firestore.
 */
export class GSCIngestionService {
  private firestore: admin.firestore.Firestore;
  private searchconsole;

  constructor() {
    this.initializeFirebase();
    this.initializeGSC();
  }

  /**
   * Initializes the Firebase Admin SDK.
   */
  private initializeFirebase() {
    if (admin.apps.length) {
      this.firestore = admin.firestore();
      return;
    }

    const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
    if (!serviceAccountBase64) {
      throw new Error('FIREBASE_ADMIN_SDK_JSON_BASE64 env variable not set.');
    }
    const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('ascii');
    const serviceAccount = JSON.parse(serviceAccountJson);

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    this.firestore = admin.firestore();
  }

  /**
   * Initializes the Google Search Console API client.
   */
  private initializeGSC() {
    const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
    if (!serviceAccountBase64) {
      throw new Error('FIREBASE_ADMIN_SDK_JSON_BASE64 env variable not set.');
    }
    const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('ascii');
    const credentials = JSON.parse(serviceAccountJson);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });

    this.searchconsole = google.searchconsole({ version: 'v1', auth });
  }

  /**
   * Fetches data from GSC API with an exponential backoff retry mechanism.
   */
  private async fetchWithRetry(request: any, attempt = 1, maxAttempts = 5): Promise<any> {
    try {
      const response = await this.searchconsole.searchanalytics.query(request);
      return response;
    } catch (error) {
      if (attempt >= maxAttempts) {
        console.error(`GSC API call failed after ${maxAttempts} attempts.`);
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
      // Log the detailed error object from the Google API client.
      console.warn(`GSC API call failed (attempt ${attempt}). Retrying in ${Math.round(delay/1000)}s... Error:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
      return this.fetchWithRetry(request, attempt + 1, maxAttempts);
    }
  }

  /**
   * Fetches GSC performance data for a given site and date range, and persists it to Firestore.
   * @param siteUrl The URL of the GSC property.
   * @param startDate The start date in YYYY-MM-DD format.
   * @param endDate The end date in YYYY-MM-DD format.
   */
  public async ingestData(siteUrl: string, startDate: string, endDate: string): Promise<void> {
    console.log(`Starting GSC data ingestion for ${siteUrl} from ${startDate} to ${endDate}.`);

    let startRow = 0;
    let totalRowsFetched = 0;
    let hasMoreData = true;
    let batch = this.firestore.batch();
    let docsInBatch = 0;

    while (hasMoreData) {
      console.log(`Fetching rows starting from ${startRow}...`);
      const request = {
        siteUrl,
        requestBody: {
          startDate,
          endDate,
          dimensions: ['date', 'query', 'page', 'device', 'country'],
          rowLimit: GSC_ROW_LIMIT,
          startRow,
        },
      };

      const response = await this.fetchWithRetry(request);
      const rows = response.data.rows;

      if (!rows || rows.length === 0) {
        hasMoreData = false;
        continue;
      }

      for (const row of rows) {
        const [date, query, page, device, country] = row.keys;
        const normalizedPage = normalizeUrl(page);

        const docData: GscRawData = {
          siteUrl,
          date,
          query,
          page: normalizedPage,
          device,
          country,
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: row.ctr,
          position: row.position,
        };

        const docRef = this.firestore.collection(FIRESTORE_COLLECTION).doc();
        batch.set(docRef, docData);
        docsInBatch++;

        if (docsInBatch === FIRESTORE_BATCH_SIZE) {
          await batch.commit();
          console.log(`Wrote ${docsInBatch} rows to Firestore.`);
          batch = this.firestore.batch();
          docsInBatch = 0;
        }
      }

      totalRowsFetched += rows.length;
      if (rows.length < GSC_ROW_LIMIT) {
        hasMoreData = false;
      } else {
        startRow += GSC_ROW_LIMIT;
      }
    }

    if (docsInBatch > 0) {
      await batch.commit();
      console.log(`Wrote final ${docsInBatch} rows to Firestore.`);
    }

    console.log(`✅ Ingestion complete. Fetched and wrote ${totalRowsFetched} rows to ${FIRESTORE_COLLECTION}.`);
  }
}
