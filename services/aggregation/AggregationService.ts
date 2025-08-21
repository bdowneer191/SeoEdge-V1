import { Buffer } from 'node:buffer';
import * as admin from 'firebase-admin';

// Structure for a single raw data entry from gsc_raw collection
interface GscRawData {
  siteUrl: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  country: string;
  device: string;
}

// Structure for aggregated metrics (used for site-wide, per-country, per-device)
export interface AggregateMetrics {
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
}

// The final structure for a document in the analytics_agg collection
export interface AnalyticsAggData {
  date: string;
  siteUrl: string;
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  aggregatesByCountry: { [country: string]: AggregateMetrics };
  aggregatesByDevice: { [device: string]: AggregateMetrics };
}

// Helper class to calculate weighted averages for CTR and position
class MetricsAccumulator {
  totalClicks = 0;
  totalImpressions = 0;
  weightedPositionSum = 0;

  add(row: GscRawData) {
    this.totalClicks += row.clicks;
    this.totalImpressions += row.impressions;
    this.weightedPositionSum += row.position * row.impressions;
  }

  getMetrics(): AggregateMetrics {
    const totalImpressions = this.totalImpressions || 1; // Avoid division by zero
    return {
      totalClicks: this.totalClicks,
      totalImpressions: this.totalImpressions,
      averageCtr: this.totalClicks / totalImpressions,
      averagePosition: this.weightedPositionSum / totalImpressions,
    };
  }
}

const FIRESTORE_GSC_RAW_COLLECTION = 'gsc_raw';
const FIRESTORE_ANALYTICS_AGG_COLLECTION = 'analytics_agg';

/**
 * Service to aggregate raw GSC data for a specific day.
 */
export class AggregationService {
  private firestore: admin.firestore.Firestore;

  constructor() {
    this.initializeFirebase();
  }

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
   * Reads raw GSC data for a given date, computes daily aggregates, and saves them to Firestore.
   * @param date The date to process in YYYY-MM-DD format.
   */
  public async aggregateData(date: string): Promise<void> {
    console.log(`Starting aggregation for date: ${date}`);

    const snapshot = await this.firestore.collection(FIRESTORE_GSC_RAW_COLLECTION).where('date', '==', date).get();

    if (snapshot.empty) {
      console.log(`No data found for ${date}. Exiting.`);
      return;
    }

    const siteAccumulator = new MetricsAccumulator();
    const countryAccumulators: { [key: string]: MetricsAccumulator } = {};
    const deviceAccumulators: { [key: string]: MetricsAccumulator } = {};
    let siteUrl: string | null = null;

    snapshot.docs.forEach(doc => {
      const row = doc.data() as GscRawData;
      if (!siteUrl) siteUrl = row.siteUrl;

      siteAccumulator.add(row);

      if (!countryAccumulators[row.country]) {
        countryAccumulators[row.country] = new MetricsAccumulator();
      }
      countryAccumulators[row.country].add(row);

      if (!deviceAccumulators[row.device]) {
        deviceAccumulators[row.device] = new MetricsAccumulator();
      }
      deviceAccumulators[row.device].add(row);
    });

    if (!siteUrl) {
        console.warn('No siteUrl found in the raw data. Cannot save aggregate.');
        return;
    }

    const finalData: AnalyticsAggData = {
      date,
      siteUrl: siteUrl,
      ...siteAccumulator.getMetrics(),
      aggregatesByCountry: Object.fromEntries(
        Object.entries(countryAccumulators).map(([key, acc]) => [key, acc.getMetrics()])
      ),
      aggregatesByDevice: Object.fromEntries(
        Object.entries(deviceAccumulators).map(([key, acc]) => [key, acc.getMetrics()])
      ),
    };
    
    const docId = `daily_${date.replace(/-/g, '')}`;
    await this.firestore.collection(FIRESTORE_ANALYTICS_AGG_COLLECTION).doc(docId).set(finalData);

    console.log(`✅ Aggregation complete for ${date}. Wrote ${snapshot.size} rows summary to ${FIRESTORE_ANALYTICS_AGG_COLLECTION}/${docId}.`);
  }
}
