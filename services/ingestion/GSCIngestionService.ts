import * as admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { google } from 'googleapis';
import { normalizeUrl } from './urlUtils';

// Copied from AggregationService - this will be the new home for this interface
export interface AnalyticsAggData {
  page?: string;
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
    this.firestore = initializeFirebaseAdmin();
    this.initializeGSC();
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

  public async runSmartAnalytics(siteUrl: string): Promise<void> {
    console.log(`Starting smart analytics for ${siteUrl}.`);

    // 1. Define date ranges
    const today = new Date();
    const endDate1 = new Date(today);
    endDate1.setDate(today.getDate() - 1); // Yesterday
    const startDate1 = new Date(endDate1);
    startDate1.setDate(endDate1.getDate() - 90);

    const endDate2 = new Date(startDate1);
    endDate2.setDate(startDate1.getDate() - 1);
    const startDate2 = new Date(endDate2);
    startDate2.setDate(endDate2.getDate() - 90);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    console.log(`Period 1: ${formatDate(startDate1)} to ${formatDate(endDate1)}`);
    console.log(`Period 2: ${formatDate(startDate2)} to ${formatDate(endDate2)}`);

    // 2. Fetch data for both periods
    const period1Data = await this.fetchPerformanceData(siteUrl, formatDate(startDate1), formatDate(endDate1));
    const period2Data = await this.fetchPerformanceData(siteUrl, formatDate(startDate2), formatDate(endDate2));

    // 3. Compare data and find losers
    const losers = [];
    for (const [page, data1] of period1Data.entries()) {
      const data2 = period2Data.get(page);
      if (data2 && data2.impressions > 100) { // Add a threshold to avoid noise
        const impressionChange = (data1.impressions - data2.impressions) / data2.impressions;
        if (impressionChange < -0.5) {
          losers.push({
            page,
            impressions1: data1.impressions,
            impressions2: data2.impressions,
            impressionChange,
            absoluteImpressionLoss: data2.impressions - data1.impressions,
          });
        }
      }
    }

    // 4. Sort by absolute loss and get top 50
    losers.sort((a, b) => b.absoluteImpressionLoss - a.absoluteImpressionLoss);
    const top50Losers = losers.slice(0, 50);

    // 5. Write losing pages to Firestore
    if (top50Losers.length > 0) {
      const batch = this.firestore.batch();
      for (const loser of top50Losers) {
        const pageId = loser.page.replace(/[^a-zA-Z0-9]/g, '_');
        const docRef = this.firestore.collection('pages').doc(pageId);
        batch.set(docRef, {
          pageUrl: loser.page,
          last90days_impressions: loser.impressions1,
          prev90days_impressions: loser.impressions2,
          impression_change_percentage: loser.impressionChange,
          lastChecked: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      console.log(`Wrote ${top50Losers.length} losing pages to Firestore.`);
    } else {
      console.log('No pages with significant impression loss found.');
    }

    // 6. Find top 50 winning pages
    const winners = Array.from(period1Data.entries())
      .sort(([, dataA], [, dataB]) => dataB.clicks - dataA.clicks)
      .slice(0, 50)
      .map(([page, data]) => ({
        page,
        clicks: data.clicks,
        impressions: data.impressions,
      }));

    // 7. Fetch daily data for the last 90 days for the chart
    const historicalData = await this.fetchDailyMetricsForRange(siteUrl, formatDate(startDate1), formatDate(endDate1));

    // 8. Calculate site-wide metrics for the last 90 days
    const siteMetrics90days = historicalData.reduce((acc, item) => ({
        clicks: acc.clicks + item.clicks,
        impressions: acc.impressions + item.impressions,
        ctr: acc.ctr + item.ctr,
        position: acc.position + item.position,
    }), { clicks: 0, impressions: 0, ctr: 0, position: 0 });

    const numDays = historicalData.length;
    if (numDays > 0) {
        siteMetrics90days.ctr /= numDays;
        siteMetrics90days.position /= numDays;
    }

    // 9. Construct the dashboard data object
    const siteMetricsForDashboard = {
        totalClicks: { benchmarks: { historicalAvg: siteMetrics90days.clicks }, isAnomaly: null, message: null, trend: null, trendConfidence: null, thirtyDayForecast: null, recommendations: [] },
        totalImpressions: { benchmarks: { historicalAvg: siteMetrics90days.impressions }, isAnomaly: null, message: null, trend: null, trendConfidence: null, thirtyDayForecast: null, recommendations: [] },
        averageCtr: { benchmarks: { historicalAvg: siteMetrics90days.ctr }, isAnomaly: null, message: null, trend: null, trendConfidence: null, thirtyDayForecast: null, recommendations: [] },
        averagePosition: { benchmarks: { historicalAvg: siteMetrics90days.position }, isAnomaly: null, message: null, trend: null, trendConfidence: null, thirtyDayForecast: null, recommendations: [] },
    };

    const dashboardData = {
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        siteSummary: {
            historicalData,
            dashboardStats: {
                status: 'success',
                lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                metrics: siteMetricsForDashboard,
            }
        },
        losingPages: top50Losers,
        winningPages: winners,
    };

    // 10. Write to Firestore
    await this.firestore.collection('dashboard_stats').doc('latest').set(dashboardData);
    console.log('Wrote dashboard summary to dashboard_stats/latest.');


    console.log('Smart analytics finished.');
  }

  private async fetchPerformanceData(siteUrl: string, startDate: string, endDate: string): Promise<Map<string, { clicks: number, impressions: number }>> {
    const data = new Map<string, { clicks: number, impressions: number }>();
    const dateChunks = this.getDateChunks(startDate, endDate, 14);

    for (const chunk of dateChunks) {
      let startRow = 0;
      let hasMoreData = true;

      while (hasMoreData) {
        const requestBody = {
          startDate: chunk.start,
          endDate: chunk.end,
          dimensions: ['page'],
          rowLimit: 25000,
          startRow,
        };

        const request = {
          siteUrl,
          requestBody,
        };

        const response = await this.fetchWithRetry(request);
        const rows = response.data.rows;

        if (!rows || rows.length === 0) {
          hasMoreData = false;
          continue;
        }

        for (const row of rows) {
          const page = row.keys[0];
          const pageData = data.get(page) || { clicks: 0, impressions: 0 };
          pageData.clicks += row.clicks;
          pageData.impressions += row.impressions;
          data.set(page, pageData);
        }

        if (rows.length < 25000) {
          hasMoreData = false;
        } else {
          startRow += 25000;
        }
      }
    }
    return data;
  }

  private getDateChunks(startDate: string, endDate: string, chunkSize: number): { start: string, end: string }[] {
    const chunks = [];
    let currentStartDate = new Date(startDate);
    const finalEndDate = new Date(endDate);

    while (currentStartDate <= finalEndDate) {
      const currentEndDate = new Date(currentStartDate);
      currentEndDate.setDate(currentStartDate.getDate() + chunkSize - 1);

      const chunkEnd = currentEndDate > finalEndDate ? finalEndDate : currentEndDate;

      chunks.push({
        start: currentStartDate.toISOString().split('T')[0],
        end: chunkEnd.toISOString().split('T')[0],
      });

      currentStartDate.setDate(currentStartDate.getDate() + chunkSize);
    }

    return chunks;
  }

  private async fetchDailyMetricsForRange(siteUrl: string, startDate: string, endDate: string): Promise<{ date: string, clicks: number, impressions: number, ctr: number, position: number }[]> {
    const requestBody = {
      startDate,
      endDate,
      dimensions: ['date'],
    };

    const request = {
      siteUrl,
      requestBody,
    };

    const response = await this.fetchWithRetry(request);
    const rows = response.data.rows;

    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map((row: any) => ({
      date: row.keys[0],
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }));
  }
}
