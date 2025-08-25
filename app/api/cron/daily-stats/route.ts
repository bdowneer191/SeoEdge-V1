import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import type { AnalyticsAggData } from '@/services/ingestion/GSCIngestionService';

export const dynamic = 'force-dynamic';

// --- Data Structures ---
interface SmartMetric {
  isAnomaly: boolean | null;
  message: string | null;
  trend: 'up' | 'down' | 'stable' | null;
  trendConfidence: number | null;
  thirtyDayForecast: number | null;
  benchmarks: {
    industry: number;
    historicalAvg: number;
  };
  recommendations: string[];
}
interface HealthScoreComponent { score: number; details: string; }
interface HealthScore {
  overall: number;
  technical: HealthScoreComponent;
  content: HealthScoreComponent;
  authority: HealthScoreComponent;
}

// --- Enhanced Statistical & Logic Helper Functions ---
function trendAnalysis(data: number[]): { m: number; b: number; rSquared: number } {
  const n = data.length;
  if (n < 2) return { m: 0, b: n === 1 ? data[0] : 0, rSquared: 1 };
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) { sumX += i; sumY += data[i]; sumXY += i * data[i]; sumXX += i * i; }
  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) || 0;
  const b = (sumY - m * sumX) / n;
  const yMean = sumY / n;
  let ssTot = 0; let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const yPred = m * i + b;
    ssTot += Math.pow(data[i] - yMean, 2);
    ssRes += Math.pow(data[i] - yPred, 2);
  }
  const rSquared = ssTot === 0 ? 1 : 1 - (ssRes / ssTot);
  return { m, b, rSquared };
}

function getStats(data: number[]): { mean: number; stdDev: number } {
  const n = data.length;
  if (n === 0) return { mean: 0, stdDev: 0 };
  const mean = data.reduce((a, b) => a + b) / n;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  return { mean, stdDev: Math.sqrt(variance) };
}

function detectAnomaly(latestValue: number, historicalData: number[]): { isAnomaly: boolean; message: string } {
  const { mean, stdDev } = getStats(historicalData);
  const isAnomaly = stdDev > 0 && Math.abs(latestValue - mean) > 2 * stdDev;
  const message = isAnomaly
    ? `Value of ${latestValue.toFixed(2)} is a significant deviation from the recent average of ${mean.toFixed(2)}.`
    : `Value of ${latestValue.toFixed(2)} is stable within the recent average of ${mean.toFixed(2)}.`;
  return { isAnomaly, message };
}

function generateRecommendations(metricName: string, metric: SmartMetric): string[] {
    const recommendations: string[] = [];
    if (metric.isAnomaly && metric.trend === 'down') {
        recommendations.push(`Investigate the sharp downward trend in ${metricName}.`);
    }
    if (metric.trend === 'down' && metric.trendConfidence && metric.trendConfidence > 0.75) {
        recommendations.push(`The downward trend for ${metricName} is strong. Prioritize analysis.`);
    }
    if (metricName === 'averageCtr' && metric.benchmarks.historicalAvg < 0.02) {
        recommendations.push('Overall CTR is low. Review and optimize page titles and meta descriptions.');
    }
    if (metricName === 'averagePosition' && metric.trend === 'down') {
        recommendations.push('Average position is declining. Review keyword strategy.');
    }
    if (recommendations.length === 0) {
        recommendations.push(`The ${metricName} metric appears stable. Continue monitoring.`);
    }
    return recommendations;
}

function calculateTechnicalScore(avgPosition: number): HealthScoreComponent {
    let score = 0;
    if (avgPosition <= 5) score = 95;
    else if (avgPosition <= 10) score = 80;
    else if (avgPosition <= 20) score = 60;
    else if (avgPosition <= 50) score = 40;
    else score = 20;
    return { score, details: `Score is based on an average ranking position of ${avgPosition.toFixed(1)}.` };
}

function calculateContentScore(avgCtr: number): HealthScoreComponent {
    let score = 0;
    if (avgCtr >= 0.07) score = 95;
    else if (avgCtr >= 0.05) score = 85;
    else if (avgCtr >= 0.03) score = 70;
    else if (avgCtr >= 0.02) score = 50;
    else score = 30;
    return { score, details: `Score is based on an average CTR of ${(avgCtr * 100).toFixed(2)}%.` };
}

function calculateAuthorityScore(): HealthScoreComponent {
    return { score: 75, details: "Authority metrics will be enabled in a future update." };
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

    // 2. Fetch historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 60);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];
    const snapshot = await firestore.collection('analytics_agg').where('siteUrl', '==', siteUrl).where('date', '>=', formatDate(startDate)).where('date', '<=', formatDate(endDate)).orderBy('date', 'asc').get();

    if (snapshot.empty) {
      throw new Error('No historical data found at all.');
    }
    const historicalData: AnalyticsAggData[] = snapshot.docs.map(doc => doc.data() as AnalyticsAggData);
    const dataLength = historicalData.length;

    // 3. Adaptively Calculate Smart Metrics
    const metricKeys: (keyof Omit<AnalyticsAggData, 'date' | 'siteUrl' | 'aggregatesByCountry' | 'aggregatesByDevice'>)[] = ['totalClicks', 'totalImpressions', 'averageCtr', 'averagePosition'];
    const metrics: { [key: string]: SmartMetric } = {};

    for (const key of metricKeys) {
      const dataSeries = historicalData.map(d => d[key] as number);
      const latestValue = dataSeries[dataSeries.length - 1];
      const { mean: historicalAvg } = getStats(dataSeries);

      // Initialize with default/base values
      let smartMetric: SmartMetric = {
        isAnomaly: null,
        message: 'Not enough data for anomaly detection.',
        trend: null,
        trendConfidence: null,
        thirtyDayForecast: null,
        benchmarks: { industry: 0, historicalAvg },
        recommendations: ['Collect more daily data for full analysis.'],
      };

      // Calculate Trend & Forecast if enough data exists (e.g., >= 7 days)
      if (dataLength >= 7) {
        const { m, b, rSquared } = trendAnalysis(dataSeries);
        smartMetric.trend = m > 0.01 ? 'up' : m < -0.01 ? 'down' : 'stable';
        smartMetric.trendConfidence = rSquared;
        smartMetric.thirtyDayForecast = Math.max(0, m * (dataLength + 29) + b);
      }

      // Calculate Anomaly if enough data exists (e.g., >= 14 days)
      if (dataLength >= 14) {
        const anomalyInfo = detectAnomaly(latestValue, dataSeries.slice(-Math.min(28, dataLength)));
        smartMetric.isAnomaly = anomalyInfo.isAnomaly;
        smartMetric.message = anomalyInfo.message;
      }

      // Generate recommendations based on available data
      smartMetric.recommendations = generateRecommendations(key, smartMetric);
      metrics[key] = smartMetric;
    }

    // 4. Adaptively Calculate Health Score
    let healthScore: HealthScore | null = null;
    if (dataLength >= 14) { // Only calculate score if we have enough data for all components
        const technicalScore = calculateTechnicalScore(metrics.averagePosition.benchmarks.historicalAvg);
        const contentScore = calculateContentScore(metrics.averageCtr.benchmarks.historicalAvg);
        const authorityScore = calculateAuthorityScore();
        const overallScore = (technicalScore.score * 0.4) + (contentScore.score * 0.4) + (authorityScore.score * 0.2);
        healthScore = {
            overall: Math.round(overallScore),
            technical: technicalScore,
            content: contentScore,
            authority: authorityScore,
        };
    }

    // 5. Save results
    const resultDocument = {
      status: 'success',
      lastUpdated: new Date().toISOString(),
      siteUrl,
      metrics,
      healthScore, // This will be null if not enough data
    };

    await firestore.collection('dashboard_stats').doc('latest').set(resultDocument);

    return NextResponse.json({ status: 'success', message: 'Adaptive stats calculation completed.' });

  } catch (error) {
    console.error('[Cron Job] Adaptive stats generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ status: 'error', message: 'Adaptive stats generation failed.', details: errorMessage }, { status: 500 });
  }
}
