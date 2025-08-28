// app/api/cron/daily-stats/route.ts - Updated version
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { trendAnalysis } from '@/lib/analytics/trend';
import { runAdvancedPageTiering } from './enhanced-tiering'; // Import our new system
import type { AnalyticsAggData } from '@/services/ingestion/GSCIngestionService';

export const dynamic = 'force-dynamic';

// --- Enhanced Data Structures ---
interface SmartMetric {
  isAnomaly: boolean | null;
  message: string | null;
  trend: 'up' | 'down' | 'stable' | null;
  trendConfidence: number | null;
  thirtyDayForecast: number | null;
  benchmarks: {
    industry: number;
    competitors: number;
    historicalAvg: number;
  };
  recommendations: string[];
  // Added for predictive overlays
  forecastUpperBound?: number | null;
  forecastLowerBound?: number | null;
}

interface HealthScoreComponent {
  score: number;
  details: string;
}

interface HealthScore {
  overall: number;
  technical: HealthScoreComponent;
  content: HealthScoreComponent;
  userExperience: HealthScoreComponent;
  authority: HealthScoreComponent;
}

// Your existing enhanced statistical & logic helper functions
function getStats(data: number[]): { mean: number; stdDev: number } {
  const n = data.length;
  if (n === 0) return { mean: 0, stdDev: 0 };
  const mean = data.reduce((a, b) => a + b) / n;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  return { mean, stdDev: Math.sqrt(variance) };
}

function detectAnomaly(latestValue: number, historicalData: number[]): { isAnomaly: boolean; message: string } {
  if (historicalData.length < 7) {
    return {
      isAnomaly: false,
      message: `Current value: ${latestValue.toFixed(2)} (insufficient data for anomaly detection).`
    };
  }
  const { mean, stdDev } = getStats(historicalData);
  const threshold = 2;
  const isAnomaly = stdDev > 0 && Math.abs(latestValue - mean) > threshold * stdDev;
  const message = isAnomaly
    ? `Value of ${latestValue.toFixed(2)} is a significant deviation from the recent average of ${mean.toFixed(2)}.`
    : `Value of ${latestValue.toFixed(2)} is stable within the recent average of ${mean.toFixed(2)}.`;
  return { isAnomaly, message };
}

function getIndustryBenchmarks(metricName: string): { industry: number; competitors: number } {
  // Mock industry benchmarks - in production, these would come from external APIs
  const benchmarks: { [key: string]: { industry: number; competitors: number } } = {
    totalClicks: { industry: 0, competitors: 0 }, // Not applicable for absolute values
    totalImpressions: { industry: 0, competitors: 0 }, // Not applicable for absolute values
    averageCtr: { industry: 0.05, competitors: 0.048 }, // 5% industry average, 4.8% competitors
    averagePosition: { industry: 15.2, competitors: 12.8 }, // Position 15.2 industry, 12.8 competitors
  };

  return benchmarks[metricName] || { industry: 0, competitors: 0 };
}

function generateRecommendations(metricName: string, metric: SmartMetric): string[] {
  const recommendations: string[] = [];
  const { trend, trendConfidence, isAnomaly, benchmarks } = metric;

  // High-confidence trend recommendations
  if (trendConfidence && trendConfidence > 0.8) {
    if (trend === 'down') {
      recommendations.push(`Strong downward trend detected in ${metricName} (confidence: ${(trendConfidence * 100).toFixed(0)}%). Immediate investigation required.`);
    } else if (trend === 'up') {
      recommendations.push(`Strong upward trend in ${metricName} (confidence: ${(trendConfidence * 100).toFixed(0)}%). Identify and replicate success factors.`);
    }
  }

  // Anomaly-based recommendations
  if (isAnomaly) {
    recommendations.push(`Anomalous behavior detected in ${metricName}. Check for technical issues or external factors.`);
  }

  // Metric-specific benchmark recommendations
  switch (metricName) {
    case 'averageCtr':
      if (benchmarks.industry > 0) {
        const industryDiff = ((benchmarks.historicalAvg - benchmarks.industry) / benchmarks.industry) * 100;
        if (industryDiff < -20) {
          recommendations.push(`CTR is ${Math.abs(industryDiff).toFixed(0)}% below industry average. Focus on improving page titles and meta descriptions.`);
        } else if (industryDiff > 20) {
          recommendations.push(`CTR is ${industryDiff.toFixed(0)}% above industry average. Excellent performance - document best practices.`);
        }

        const competitorDiff = ((benchmarks.historicalAvg - benchmarks.competitors) / benchmarks.competitors) * 100;
        if (competitorDiff < -15) {
          recommendations.push(`CTR is ${Math.abs(competitorDiff).toFixed(0)}% below main competitors. Analyze competitor content strategies.`);
        }
      }
      break;

    case 'averagePosition':
      if (benchmarks.industry > 0) {
        const positionDiff = benchmarks.historicalAvg - benchmarks.industry;
        if (positionDiff > 5) {
          recommendations.push(`Average position is ${positionDiff.toFixed(1)} positions worse than industry average. Review keyword strategy and content optimization.`);
        } else if (positionDiff < -3) {
          recommendations.push(`Average position is ${Math.abs(positionDiff).toFixed(1)} positions better than industry average. Strong SEO performance.`);
        }
      }
      break;

    case 'totalClicks':
      if (trend === 'down' && trendConfidence && trendConfidence > 0.6) {
        recommendations.push('Declining clicks trend. Consider seasonal factors, algorithm updates, or competitor activity.');
      }
      break;

    case 'totalImpressions':
      if (trend === 'down' && trendConfidence && trendConfidence > 0.7) {
        recommendations.push('Declining impressions suggest reduced visibility. Review keyword rankings and indexing status.');
      }
      break;
  }

  // Default recommendation if none were generated
  if (recommendations.length === 0) {
    if (trend === 'stable') {
      recommendations.push(`${metricName} appears stable. Continue monitoring for changes.`);
    } else {
      recommendations.push(`Monitor ${metricName} trends and compare against historical performance.`);
    }
  }

  return recommendations;
}

function calculateTechnicalScore(avgPosition: number): HealthScoreComponent {
  let score = 0;

  if (avgPosition <= 5) {
    score = 95;
  } else if (avgPosition <= 10) {
    score = 80;
  } else if (avgPosition <= 20) {
    score = 60;
  } else if (avgPosition <= 50) {
    score = 40;
  } else {
    score = 20;
  }

  return {
    score,
    details: `Score is based on an average ranking position of ${avgPosition.toFixed(1)}.`
  };
}

function calculateContentScore(avgCtr: number): HealthScoreComponent {
  let score = 0;
  if (avgCtr >= 0.07) score = 95;
  else if (avgCtr >= 0.05) score = 85;
  else if (avgCtr >= 0.03) score = 70;
  else if (avgCtr >= 0.02) score = 50;
  else score = 30;

  return {
    score,
    details: `Based on average CTR of ${(avgCtr * 100).toFixed(2)}%. Higher CTR indicates more compelling content and titles.`
  };
}

function calculateUserExperienceScore(avgCtr: number): HealthScoreComponent {
  let score = 0;
  if (avgCtr >= 0.07) score = 95;
  else if (avgCtr >= 0.05) score = 85;
  else if (avgCtr >= 0.03) score = 70;
  else if (avgCtr >= 0.02) score = 50;
  else score = 30;

  return {
    score,
    details: `Score is based on an average CTR of ${(avgCtr * 100).toFixed(2)}%.`
  };
}

function calculateAuthorityScore(): HealthScoreComponent {
  // Placeholder for future authority metrics (backlinks, domain authority, etc.)
  return {
    score: 75,
    details: "Authority score based on domain strength indicators. Full authority metrics will be available in future updates."
  };
}

// Enhanced predictive overlays calculation with better uncertainty modeling
function calculatePredictiveOverlays(
  forecast: number,
  historicalData: number[],
  trendConfidence: number | null
): { upperBound: number; lowerBound: number } {

  // Base uncertainty starts at 15% and adjusts based on trend confidence and data variability
  let baseUncertainty = 0.15;

  // Adjust uncertainty based on trend confidence
  if (trendConfidence) {
    // Lower confidence = higher uncertainty
    const confidenceAdjustment = (1 - trendConfidence) * 0.2;
    baseUncertainty += confidenceAdjustment;
  }

  // Calculate historical volatility if we have enough data
  if (historicalData.length > 7) {
    const { stdDev, mean } = getStats(historicalData);
    const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;

    // Add volatility-based uncertainty (cap at 30%)
    const volatilityUncertainty = Math.min(0.3, coefficientOfVariation * 0.5);
    baseUncertainty += volatilityUncertainty;
  }

  // Cap total uncertainty at 50%
  const finalUncertainty = Math.min(0.5, baseUncertainty);

  const upperBound = forecast * (1 + finalUncertainty);
  const lowerBound = Math.max(0, forecast * (1 - finalUncertainty));

  return { upperBound, lowerBound };
}

export async function GET(request: NextRequest) {
  // Your existing authentication
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

    console.log('[Cron Job] Starting enhanced daily analytics and tiering...');

    // 1. Run your existing enhanced smart metrics calculation
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 60);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    const snapshot = await firestore
      .collection('analytics_agg')
      .where('siteUrl', '==', siteUrl)
      .where('date', '>=', formatDate(startDate))
      .where('date', '<=', formatDate(endDate))
      .orderBy('date', 'asc')
      .get();

    let smartMetricsResult = null;
    let healthScore: HealthScore | null = null;

    if (!snapshot.empty) {
      const historicalData: AnalyticsAggData[] = snapshot.docs.map(doc => doc.data() as AnalyticsAggData);
      const dataLength = historicalData.length;

      const metricKeys: (keyof Omit<AnalyticsAggData, 'date' | 'siteUrl' | 'aggregatesByCountry' | 'aggregatesByDevice'>)[] =
        ['totalClicks', 'totalImpressions', 'averageCtr', 'averagePosition'];

      const metrics: { [key: string]: SmartMetric } = {};

      for (const key of metricKeys) {
        const dataSeries = historicalData.map(d => d[key] as number);
        const latestValue = dataSeries[dataSeries.length - 1];
        const { mean: historicalAvg } = getStats(dataSeries);

        const externalBenchmarks = getIndustryBenchmarks(key);

        let smartMetric: SmartMetric = {
          isAnomaly: null,
          message: 'Insufficient data for analysis.',
          trend: null,
          trendConfidence: null,
          thirtyDayForecast: null,
          benchmarks: {
            industry: externalBenchmarks.industry,
            competitors: externalBenchmarks.competitors,
            historicalAvg
          },
          recommendations: ['Collect more daily data for comprehensive analysis.'],
          forecastUpperBound: null,
          forecastLowerBound: null,
        };

        if (dataLength >= 7) {
          const { m, b, rSquared, trend } = trendAnalysis(dataSeries);
          smartMetric.trend = trend;
          smartMetric.trendConfidence = rSquared;
          const forecast = Math.max(0, m * (dataLength + 29) + b);
          smartMetric.thirtyDayForecast = forecast;
          const { upperBound, lowerBound } = calculatePredictiveOverlays(forecast, dataSeries, rSquared);
          smartMetric.forecastUpperBound = upperBound;
          smartMetric.forecastLowerBound = lowerBound;
        }

        if (dataLength >= 14) {
          const recentData = dataSeries.slice(-Math.min(28, dataLength));
          const anomalyInfo = detectAnomaly(latestValue, recentData);
          smartMetric.isAnomaly = anomalyInfo.isAnomaly;
          smartMetric.message = anomalyInfo.message;
        }

        smartMetric.recommendations = generateRecommendations(key, smartMetric);
        metrics[key] = smartMetric;
      }

      if (dataLength >= 14) {
        const technicalScore = calculateTechnicalScore(metrics.averagePosition.benchmarks.historicalAvg);
        const contentScore = calculateContentScore(metrics.averageCtr.benchmarks.historicalAvg);
        const userExperienceScore = calculateUserExperienceScore(metrics.averageCtr.benchmarks.historicalAvg);
        const authorityScore = calculateAuthorityScore();
        const overallScore = Math.round(
          (technicalScore.score * 0.3) +
          (contentScore.score * 0.3) +
          (userExperienceScore.score * 0.25) +
          (authorityScore.score * 0.15)
        );
        healthScore = {
          overall: overallScore,
          technical: technicalScore,
          content: contentScore,
          userExperience: userExperienceScore,
          authority: authorityScore,
        };
      }

      smartMetricsResult = {
        status: 'success',
        lastUpdated: new Date().toISOString(),
        siteUrl,
        dataPointsAnalyzed: dataLength,
        metrics,
        healthScore,
      };

      // Save smart metrics
      await firestore.collection('dashboard_stats').doc('latest').set(smartMetricsResult);
    }

    // 2. Run the NEW enhanced page tiering system
    console.log('[Cron Job] Running advanced page tiering...');
    const tieringResult = await runAdvancedPageTiering(firestore);

    // 3. Create comprehensive response
    const response = {
      status: 'success',
      message: 'Enhanced analytics and tiering completed successfully',
      timestamp: new Date().toISOString(),
      smartMetrics: smartMetricsResult ? {
        dataPointsProcessed: smartMetricsResult.dataPointsAnalyzed,
        healthScoreAvailable: !!healthScore,
        metricsStatus: 'updated'
      } : { status: 'no_data' },
      pagetiering: {
        pagesProcessed: tieringResult.processed,
        tierDistribution: tieringResult.tiers,
        status: 'completed'
      },
      recommendations: generateActionableRecommendations(tieringResult.tiers)
    };

    console.log('[Cron Job] Enhanced processing completed:', response);
    return NextResponse.json(response);

  } catch (error) {
    console.error('[Cron Job] Enhanced analytics failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Save error state
    try {
      const firestore = initializeFirebaseAdmin();
      await firestore.collection('dashboard_stats').doc('latest').set({
        status: 'error',
        lastUpdated: new Date().toISOString(),
        error: errorMessage,
        message: 'Enhanced analytics generation failed'
      });
    } catch (saveError) {
      console.error('[Cron Job] Failed to save error state:', saveError);
    }

    return NextResponse.json({
      status: 'error',
      message: 'Enhanced analytics generation failed',
      details: errorMessage
    }, { status: 500 });
  }
}

// Generate actionable recommendations based on tier distribution
function generateActionableRecommendations(tiers: Record<string, number>) {
  const recommendations = [];
  const totalPages = Object.values(tiers).reduce((sum, count) => sum + count, 0);

  if (tiers['At Risk'] > 0) {
    recommendations.push({
      priority: 'Critical',
      action: `Immediate attention needed: ${tiers['At Risk']} pages are at risk of losing significant traffic`,
      impact: 'High',
      timeframe: 'This week'
    });
  }

  if (tiers['Quick Wins'] > 0) {
    recommendations.push({
      priority: 'High',
      action: `Low-effort high-impact: ${tiers['Quick Wins']} pages need title/meta optimization`,
      impact: 'Medium-High',
      timeframe: '1-2 weeks'
    });
  }

  if (tiers['Rising Stars'] > 0) {
    recommendations.push({
      priority: 'Medium',
      action: `Amplify success: ${tiers['Rising Stars']} pages showing strong growth - replicate strategies`,
      impact: 'Medium',
      timeframe: '2-4 weeks'
    });
  }

  if (tiers['Hidden Gems'] > 0) {
    recommendations.push({
      priority: 'Medium',
      action: `Unlock potential: ${tiers['Hidden Gems']} pages have good rankings but poor CTR`,
      impact: 'Medium',
      timeframe: '2-3 weeks'
    });
  }

  const problemRatio = (tiers['Problem Pages'] + tiers['At Risk']) / totalPages;
  if (problemRatio > 0.2) {
    recommendations.push({
      priority: 'High',
      action: `Site health concern: ${(problemRatio * 100).toFixed(0)}% of pages need significant work`,
      impact: 'High',
      timeframe: 'Strategic review needed'
    });
  }

  return recommendations;
}
