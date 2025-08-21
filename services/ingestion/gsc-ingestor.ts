import { Buffer } from 'node:buffer';
import { google } from 'googleapis';
import { firestore } from './firestore-client'; // Import the singleton
import { normalizeUrl } from './urlUtils';

// New interface matching the prompt's schema
interface GscRawData {
  site: string;
  url: string;
  query: string;
  date: string;
  impressions: number;
  clicks: number;
  position: number;
  device: string;
  country: string;
  searchAppearance: string;
}

const FIRESTORE_COLLECTION = 'gsc_raw';
const FIRESTORE_BATCH_SIZE = 450; // Firestore batch limit is 500
const GSC_ROW_LIMIT = 25000;

// Reusable retry utility for any async function
async function withRetry<T>(fn: () => Promise<T>, attempts = 5, initialDelay = 1000): Promise<T> {
  let attempt = 1;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= attempts) {
        console.error(`Function call failed after ${attempts} attempts.`);
        throw error;
      }
      const delay = initialDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.warn(`Function call failed (attempt ${attempt}). Retrying in ${Math.round(delay / 1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
}

// Initialize GSC client
function getGscClient() {
  const serviceAccountBase64 = process.env.GSC_SERVICE_ACCOUNT_BASE64;
  if (!serviceAccountBase64) {
    throw new Error('GSC_SERVICE_ACCOUNT_BASE64 env variable not set.');
  }
  const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf-8');
  const credentials = JSON.parse(serviceAccountJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  return google.searchconsole({ version: 'v1', auth });
}

/**
 * Fetches GSC performance data for a given site and date range, and persists it to Firestore.
 * @param siteUrl The URL of the GSC property (e.g., "sc-domain:example.com").
 * @param startDate The start date in YYYY-MM-DD format.
 * @param endDate The end date in YYYY-MM-DD format.
 */
export async function ingestGscData(siteUrl: string, startDate: string, endDate: string): Promise<void> {
  const searchconsole = getGscClient();
  console.log(`Starting GSC data ingestion for ${siteUrl} from ${startDate} to ${endDate}.`);

  let startRow = 0;
  let totalRowsFetched = 0;
  let hasMoreData = true;
  let batch = firestore.batch();
  let docsInBatch = 0;

  while (hasMoreData) {
    console.log(`Fetching rows starting from ${startRow}...`);
    const request = {
      siteUrl,
      requestBody: {
        startDate,
        endDate,
        dimensions: ['date', 'query', 'page', 'device', 'country', 'searchAppearance'], // Added searchAppearance
        rowLimit: GSC_ROW_LIMIT,
        startRow,
      },
    };

    const response = await withRetry(() => searchconsole.searchanalytics.query(request));
    const rows = response.data.rows;

    if (!rows || rows.length === 0) {
      hasMoreData = false;
      continue;
    }

    for (const row of rows) {
      const [date, query, page, device, country, searchAppearance] = row.keys;
      const normalizedPage = normalizeUrl(page);

      const docData: GscRawData = {
        site: siteUrl, // Changed from siteUrl
        url: normalizedPage, // Changed from page
        query,
        date,
        device,
        country,
        searchAppearance, // Added field
        clicks: row.clicks,
        impressions: row.impressions,
        position: row.position,
        // ctr is removed
      };

      const docRef = firestore.collection(FIRESTORE_COLLECTION).doc();
      batch.set(docRef, docData);
      docsInBatch++;

      if (docsInBatch >= FIRESTORE_BATCH_SIZE) {
        await withRetry(() => batch.commit());
        console.log(`Wrote ${docsInBatch} rows to Firestore.`);
        batch = firestore.batch();
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
    await withRetry(() => batch.commit());
    console.log(`Wrote final ${docsInBatch} rows to Firestore.`);
  }

  console.log(`✅ Ingestion complete. Fetched and wrote ${totalRowsFetched} rows to ${FIRESTORE_COLLECTION}.`);
}