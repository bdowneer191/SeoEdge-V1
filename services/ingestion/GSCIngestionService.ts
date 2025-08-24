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

// Copied from AggregationService - this will be the new home for this interface
export interface AnalyticsAggData {
  date: string;
  siteUrl: string;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  aggregatesByCountry: { [country: string]: any }; // simplified for this context
  aggregatesByDevice: { [device: string]: any }; // simplified for this context
}

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
   * @param searchType Optional search type (e.g., 'web', 'image', 'news').
   */
  public async ingestData(siteUrl: string, startDate: string, endDate: string, searchType?: string): Promise<void> {
    console.log(`Starting GSC data ingestion for ${siteUrl} (${searchType || 'all types'}) from ${startDate} to ${endDate}.`);

    let startRow = 0;
    let totalRowsFetched = 0;
    let hasMoreData = true;
    let batch = this.firestore.batch();
    let docsInBatch = 0;

    while (hasMoreData) {
      console.log(`Fetching rows starting from ${startRow}...`);

      const requestBody: any = {
        startDate,
        endDate,
        dimensions: ['date', 'query', 'page', 'device', 'country'],
        rowLimit: GSC_ROW_LIMIT,
        startRow,
      };

      if (searchType) {
        requestBody.searchType = searchType;
      }

      const request = {
        siteUrl,
        requestBody,
      };

      const response = await this.fetchWithRetry(request);
      console.log('GSC API response data:', JSON.stringify(response.data, null, 2));
      const rows = response.data.rows;
      console.log(`Received ${rows ? rows.length : 0} rows from GSC.`);

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

  /**
   * Fetches the daily aggregated summary for a site and persists it to Firestore.
   * This is a highly efficient way to get daily totals without processing raw data.
   * @param siteUrl The URL of the GSC property.
   * @param date The date to fetch the summary for, in YYYY-MM-DD format.
   */
  public async ingestDailySummary(siteUrl: string, date: string): Promise<void> {
    console.log(`Starting GSC daily summary ingestion for ${siteUrl} on ${date}.`);

    const requestBody = {
      startDate: date,
      endDate: date,
      dimensions: ['date'],
    };

    const request = {
      siteUrl,
      requestBody,
    };

    const response = await this.fetchWithRetry(request);
    const rows = response.data.rows;

    if (!rows || rows.length === 0) {
      console.log(`No summary data found for ${siteUrl} on ${date}.`);
      // It's possible there was no traffic. We'll write a zero-metrics document
      // to signify that the day has been processed.
      const zeroData: AnalyticsAggData = {
        date,
        siteUrl,
        totalClicks: 0,
        totalImpressions: 0,
        averageCtr: 0,
        averagePosition: 0,
        aggregatesByCountry: {},
        aggregatesByDevice: {},
      };
      const docId = `daily_${date.replace(/-/g, '')}_${siteUrl.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await this.firestore.collection('analytics_agg').doc(docId).set(zeroData);
      console.log(`Wrote zero-metrics summary for ${date}.`);
      return;
    }

    const summary = rows[0];
    const docData: AnalyticsAggData = {
      date: summary.keys[0],
      siteUrl,
      totalClicks: summary.clicks,
      totalImpressions: summary.impressions,
      averageCtr: summary.ctr,
      averagePosition: summary.position,
      // The simple aggregated query doesn't include per-country/device breakdowns.
      aggregatesByCountry: {},
      aggregatesByDevice: {},
    };

    const docId = `daily_${docData.date.replace(/-/g, '')}_${siteUrl.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await this.firestore.collection('analytics_agg').doc(docId).set(docData);

    console.log(`✅ Daily summary ingestion complete for ${date}. Wrote summary to analytics_agg/${docId}.`);
  }
}
