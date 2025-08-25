import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import type { AnalyticsAggData } from '@/services/ingestion/GSCIngestionService';

export const dynamic = 'force-dynamic';

// --- New Data Structures ---
interface SmartMetric {
  isAnomaly: boolean;
  message: string;
  trend: 'up' | 'down' | 'stable';
  trendConfidence: number; // R-squared value
  thirtyDayForecast: number;
  benchmarks: {
    industry: number;
    historicalAvg: number;
  };
  recommendations: string[];
}

// --- Enhanced Statistical & Logic Helper Functions ---

/**
 * Performs simple linear regression and calculates R-squared for trend confidence.
 * @param data An array of numbers.
 * @returns An object with slope (m), y-intercept (b), and R-squared value.
 */
function trendAnalysis(data: number[]): { m: number; b: number; rSquared: number } {
  const n = data.length;
  if (n < 2) return { m: 0, b: n === 1 ? data[0] : 0, rSquared: 1 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += data[i];
    sumXY += i * data[i];
    sumXX += i * i;
  }

  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
  const b = (sumY - m * sumX) / n;

  // Calculate R-squared for trend confidence
  const yMean = sumY / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const y = data[i];
    const yPred = m * i + b;
    ssTot += Math.pow(y - yMean, 2);
    ssRes += Math.pow(y - yPred, 2);
  }

  const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);

  return { m, b, rSquared };
}

/**
 * Calculates the mean and standard deviation.
 */
function getStats(data: number[]): { mean: number; stdDev: number } {
  const n = data.length;
  if (n === 0) return { mean: 0, stdDev: 0 };
  const mean = data.reduce((a, b) => a + b) / n;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  return { mean, stdDev: Math.sqrt(variance) };
}

/**
 * Detects if the latest value is an anomaly (2 standard deviations from 28-day mean).
 */
function detectAnomaly(latestValue: number, historicalData: number[]): { isAnomaly: boolean; message: string } {
  const { mean, stdDev } = getStats(historicalData);
  const isAnomaly = stdDev > 0 && Math.abs(latestValue - mean) > 2 * stdDev;
  const message = isAnomaly
    ? `Value of ${latestValue.toFixed(2)} is a significant deviation from the 28-day average of ${mean.toFixed(2)}.`
    : `Value of ${latestValue.toFixed(2)} is stable within the 28-day average of ${mean.toFixed(2)}.`;
  return { isAnomaly, message };
}

/**
 * Generates rule-based recommendations.
 */
function generateRecommendations(metricName: string, metric: SmartMetric): string[] {
    const recommendations: string[] = [];
    if (metric.isAnomaly && metric.trend === 'down') {
        recommendations.push(`Investigate the sharp downward trend in ${metricName}. Check recent site changes or external events.`);
    }
    if (metric.trend === 'down' && metric.trendConfidence > 0.75) {
        recommendations.push(`The downward trend for ${metricName} is strong. Prioritize analysis to reverse this.`);
    }
    if (metricName === 'averageCtr' && metric.benchmarks.historicalAvg < 0.02) {
        recommendations.push('Overall CTR is low. Review and optimize page titles and meta descriptions for better click-through rates.');
    }
    if (metricName === 'averagePosition' && metric.trend === 'down') {
        recommendations.push('Average search position is declining. Review keyword strategy and check for new competitors.');
    }
    if (recommendations.length === 0) {
        recommendations.push(`The ${metricName} metric appears stable. Continue monitoring.`);
    }
    return recommendations;
}


// --- Main Cron Job Handler ---

export async function GET(request: NextRequest) {
  // 1. Authenticate
  const userAgent = request.headers.get('user-agent');
  if (userAgent !== 'vercel-cron/1.0') {
    return NextResponse.json({ error: 'Unauthorized: Invalid user-agent.' }, { status: 401 });
  }
  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_SHARED_SECRET) {
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

    if (snapshot.docs.length < 28) { // Need at least 28 days for meaningful stats
      throw new Error(`Not enough historical data (found ${snapshot.docs.length}, need at least 28).`);
    }

    const historicalData: AnalyticsAggData[] = snapshot.docs.map(doc => doc.data() as AnalyticsAggData);

    // 3. Calculate Smart Metrics for each key metric
    const metricKeys: (keyof Omit<AnalyticsAggData, 'date' | 'siteUrl' | 'aggregatesByCountry' | 'aggregatesByDevice'>)[] = ['totalClicks', 'totalImpressions', 'averageCtr', 'averagePosition'];
    const metrics: { [key: string]: SmartMetric } = {};

    for (const key of metricKeys) {
      const dataSeries = historicalData.map(d => d[key] as number);
      const last28Days = dataSeries.slice(-28);
      const latestValue = dataSeries[dataSeries.length - 1];

      const { m, b, rSquared } = trendAnalysis(dataSeries);
      const { mean: historicalAvg } = getStats(dataSeries);
      const anomalyInfo = detectAnomaly(latestValue, last28Days);

      const smartMetric: SmartMetric = {
        isAnomaly: anomalyInfo.isAnomaly,
        message: anomalyInfo.message,
        trend: m > 0.01 ? 'up' : m < -0.01 ? 'down' : 'stable',
        trendConfidence: rSquared,
        thirtyDayForecast: m * (dataSeries.length + 29) + b,
        benchmarks: {
          industry: 0, // Placeholder for industry benchmark
          historicalAvg: historicalAvg,
        },
        recommendations: [], // Will be populated next
      };

      smartMetric.recommendations = generateRecommendations(key, smartMetric);
      metrics[key] = smartMetric;
    }

    // 4. Save results to a single document
    const resultDocument = {
      lastUpdated: new Date().toISOString(),
      siteUrl,
      metrics,
    };

    await firestore.collection('dashboard_stats').doc('latest').set(resultDocument);

    return NextResponse.json({ status: 'success', message: 'Smart KPI card data generated successfully.' });

  } catch (error) {
    console.error('[Cron Job] Smart KPI data generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ status: 'error', message: 'Smart KPI data generation failed.', details: errorMessage }, { status: 500 });
  }
}
