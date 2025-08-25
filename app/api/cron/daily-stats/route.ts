import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import * as admin from 'firebase-admin';
import type { AnalyticsAggData } from '@/services/ingestion/GSCIngestionService';

export const dynamic = 'force-dynamic';

// --- Statistical Helper Functions ---

/**
 * Performs a simple linear regression on a series of data.
 * @param data An array of numbers.
 * @returns An object with the slope (m) and y-intercept (b).
 */
function simpleLinearRegression(data: number[]): { m: number; b: number } {
  const n = data.length;
  if (n < 2) return { m: 0, b: n === 1 ? data[0] : 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    const x = i;
    const y = data[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const b = (sumY - m * sumX) / n;

  return { m, b };
}

/**
 * Generates a 30-day forecast based on a linear regression model.
 * @param data The historical data.
 * @param model The linear regression model {m, b}.
 * @returns An array of forecasted values.
 */
function generateForecast(model: { m: number; b: number }, days: number): { value: number }[] {
  const forecastData = [];
  const lastX = days - 1;
  for (let i = 0; i < 30; i++) {
    const x = lastX + 1 + i;
    const y = model.m * x + model.b;
    forecastData.push({ value: Math.max(0, y) }); // Ensure forecast doesn't dip below zero
  }
  return forecastData;
}

/**
 * Calculates the mean and standard deviation of a dataset.
 * @param data An array of numbers.
 * @returns An object with the mean and standard deviation.
 */
function getStats(data: number[]): { mean: number; stdDev: number } {
  const n = data.length;
  if (n === 0) return { mean: 0, stdDev: 0 };

  const mean = data.reduce((a, b) => a + b) / n;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
}

/**
 * Detects if the latest value is an anomaly.
 * @param latestValue The most recent data point.
 * @param historicalData The data from the last 28 days.
 * @returns An object indicating if it's an anomaly and a descriptive message.
 */
function detectAnomaly(latestValue: number, historicalData: number[]): { isAnomaly: boolean; message: string } {
  const { mean, stdDev } = getStats(historicalData);
  const deviation = Math.abs(latestValue - mean);
  const isAnomaly = deviation > 2 * stdDev;

  let message = '';
  if (isAnomaly) {
    message = latestValue > mean ? 'Value has spiked significantly.' : 'Value has dropped significantly.';
  } else {
    message = 'Value is stable.';
  }

  return { isAnomaly, message };
}


// --- Main Cron Job Handler ---

export async function GET(request: NextRequest) {
  // 1. Authenticate
  const userAgent = request.headers.get('user-agent');
  if (userAgent !== 'vercel-cron/1.0') {
    return NextResponse.json({ error: 'Unauthorized: Invalid user-agent.' }, { status: 401 });
  }
  const secret = request.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.ADMIN_SHARED_SECRET;
  if (secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized: Invalid secret.' }, { status: 401 });
  }

  try {
    const firestore = initializeFirebaseAdmin();
    const siteUrl = 'sc-domain:hypefresh.com';

    // 2. Fetch last 60 days of historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 60);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const snapshot = await firestore.collection('analytics_agg')
      .where('siteUrl', '==', siteUrl)
      .where('date', '>=', formatDate(startDate))
      .where('date', '<=', formatDate(endDate))
      .orderBy('date', 'asc')
      .get();

    if (snapshot.docs.length < 2) {
      throw new Error('Not enough historical data to generate stats (less than 2 days found).');
    }

    const historicalData: AnalyticsAggData[] = snapshot.docs.map(doc => doc.data() as AnalyticsAggData);

    // 3. Calculate forecasts and anomalies for each metric
    const metrics: (keyof AnalyticsAggData)[] = ['totalClicks', 'totalImpressions', 'averageCtr', 'averagePosition'];
    const forecast: { [key: string]: { value: number }[] } = {};
    const anomalies: { [key: string]: { isAnomaly: boolean; message: string } } = {};

    const last28DaysData = historicalData.slice(-28);

    for (const metric of metrics) {
      const metricData = historicalData.map(d => d[metric] as number);
      const model = simpleLinearRegression(metricData);
      forecast[metric] = generateForecast(model, historicalData.length);

      const latestValue = historicalData[historicalData.length - 1][metric] as number;
      const recentMetricData = last28DaysData.map(d => d[metric] as number);
      anomalies[metric] = detectAnomaly(latestValue, recentMetricData);
    }

    // 4. Save results to a single document
    const resultDocument = {
      lastUpdated: new Date().toISOString(),
      siteUrl,
      forecast,
      anomalies,
    };

    await firestore.collection('dashboard_stats').doc('latest').set(resultDocument);

    return NextResponse.json({ status: 'success', message: 'Daily stats, forecast, and anomaly detection completed.' });

  } catch (error) {
    console.error('[Cron Job] Daily stats calculation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ status: 'error', message: 'Daily stats calculation failed.', details: errorMessage }, { status: 500 });
  }
}
