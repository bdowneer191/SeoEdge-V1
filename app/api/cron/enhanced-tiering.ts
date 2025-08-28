// Enhanced Performance Tiering Logic for better marketing decisions
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { trendAnalysis } from '@/lib/analytics/trend';
import type { AnalyticsAggData } from '@/services/ingestion/GSCIngestionService';

// Enhanced Performance Tier Types
type PerformanceTier =
  | 'Champions' // High performing, consistent winners
  | 'Rising Stars' // Strong upward trend, emerging winners
  | 'Cash Cows' // High traffic, stable performance
  | 'Hidden Gems' // Good potential, needs optimization
  | 'Quick Wins' // Easy optimization opportunities
  | 'Declining' // Losing traffic, needs attention
  | 'At Risk' // Declining with concerning trends
  | 'Problem Pages' // Multiple issues, needs immediate action
  | 'New/Low Data' // Insufficient data for analysis

interface PerformanceMetrics {
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
  dataPoints: number[];
  period: string;
}

interface TierAnalysis {
  tier: PerformanceTier;
  score: number; // 0-100 overall performance score
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | 'Monitor';
  reasoning: string;
  marketingAction: string;
  technicalAction: string;
  expectedImpact: string;
  timeframe: string;
  confidence: number; // 0-1, how confident we are in this analysis
  kpis: {
    clicksChange: number;
    impressionsChange: number;
    ctrChange: number;
    positionChange: number;
    trendStrength: number;
  };
}

// Industry benchmarks for different types of content
const INDUSTRY_BENCHMARKS = {
  averageCtr: 0.045, // 4.5% industry average
  goodCtr: 0.06, // 6%+ is considered good
  excellentCtr: 0.08, // 8%+ is excellent
  topPositions: 5, // Top 5 positions
  visiblePositions: 20, // First page
};

// Thresholds for different actions (more realistic than before)
const PERFORMANCE_THRESHOLDS = {
  significantChange: 0.15, // 15% change is significant
  strongChange: 0.25, // 25% change is strong
  dramaticChange: 0.40, // 40% change is dramatic
  minConfidence: 0.3, // Lower confidence threshold
  minImpressions: 100, // Minimum impressions to be considered
  minClicks: 10, // Minimum clicks for reliable analysis
};

async function getPageAnalytics(
  firestore: FirebaseFirestore.Firestore,
  pageUrl: string,
  siteUrl: string,
  startDate: Date,
  endDate: Date
): Promise<PerformanceMetrics> {
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  const snapshot = await firestore.collection('analytics')
    .where('siteUrl', '==', siteUrl)
    .where('page', '==', pageUrl)
    .where('date', '>=', formatDate(startDate))
    .where('date', '<=', formatDate(endDate))
    .orderBy('date', 'asc')
    .get();

  const analytics = snapshot.docs.map(doc => doc.data() as AnalyticsAggData);

  if (analytics.length === 0) {
    return {
      totalClicks: 0,
      totalImpressions: 0,
      averageCtr: 0,
      averagePosition: 0,
      dataPoints: [],
      period: `${formatDate(startDate)} to ${formatDate(endDate)}`
    };
  }

  const totalClicks = analytics.reduce((sum, item) => sum + item.totalClicks, 0);
  const totalImpressions = analytics.reduce((sum, item) => sum + item.totalImpressions, 0);
  const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
  const averagePosition = analytics.reduce((sum, item) => sum + item.averagePosition, 0) / analytics.length;

  return {
    totalClicks,
    totalImpressions,
    averageCtr,
    averagePosition,
    dataPoints: analytics.map(d => d.totalClicks),
    period: `${formatDate(startDate)} to ${formatDate(endDate)}`
  };
}

function calculatePerformanceScore(
  recent: PerformanceMetrics,
  baseline: PerformanceMetrics,
  trend: any
): number {
  let score = 50; // Start with neutral score

  // Traffic volume component (30%)
  if (recent.totalClicks > 1000) score += 15;
  else if (recent.totalClicks > 500) score += 10;
  else if (recent.totalClicks > 100) score += 5;

  // CTR performance component (25%)
  if (recent.averageCtr > INDUSTRY_BENCHMARKS.excellentCtr) score += 12;
  else if (recent.averageCtr > INDUSTRY_BENCHMARKS.goodCtr) score += 8;
  else if (recent.averageCtr > INDUSTRY_BENCHMARKS.averageCtr) score += 4;
  else score -= 5;

  // Position component (20%)
  if (recent.averagePosition <= 3) score += 10;
  else if (recent.averagePosition <= 5) score += 8;
  else if (recent.averagePosition <= 10) score += 5;
  else if (recent.averagePosition > 20) score -= 5;

  // Trend component (25%)
  if (trend.trend === 'up' && trend.rSquared > 0.3) {
    score += Math.min(12, trend.rSquared * 15);
  } else if (trend.trend === 'down' && trend.rSquared > 0.3) {
    score -= Math.min(12, trend.rSquared * 15);
  }

  // Growth component - compare recent vs baseline
  if (baseline.totalClicks > 0) {
    const clicksChange = (recent.totalClicks - baseline.totalClicks) / baseline.totalClicks;
    if (clicksChange > 0.2) score += 8;
    else if (clicksChange < -0.2) score -= 8;
  }

  return Math.max(0, Math.min(100, score));
}

function analyzePage(
  pageUrl: string,
  recent: PerformanceMetrics,
  baseline: PerformanceMetrics,
  trend: any
): TierAnalysis {
  const score = calculatePerformanceScore(recent, baseline, trend);

  // Calculate key changes
  const clicksChange = baseline.totalClicks > 0 ?
    (recent.totalClicks - baseline.totalClicks) / baseline.totalClicks : 0;
  const impressionsChange = baseline.totalImpressions > 0 ?
    (recent.totalImpressions - baseline.totalImpressions) / baseline.totalImpressions : 0;
  const ctrChange = baseline.averageCtr > 0 ?
    (recent.averageCtr - baseline.averageCtr) / baseline.averageCtr : 0;
  const positionChange = baseline.averagePosition > 0 ?
    (recent.averagePosition - baseline.averagePosition) / baseline.averagePosition : 0;

  const kpis = {
    clicksChange,
    impressionsChange,
    ctrChange,
    positionChange,
    trendStrength: trend.rSquared || 0
  };

  // Insufficient data check
  if (recent.totalImpressions < PERFORMANCE_THRESHOLDS.minImpressions) {
    return {
      tier: 'New/Low Data',
      score,
      priority: 'Monitor',
      reasoning: 'Insufficient traffic data for reliable analysis',
      marketingAction: 'Monitor performance and consider content promotion',
      technicalAction: 'Ensure page is indexed and crawlable',
      expectedImpact: 'Data collection for future analysis',
      timeframe: '4-8 weeks',
      confidence: 0.2,
      kpis
    };
  }

  // Champions - High performing pages with consistent results
  if (score >= 80 && recent.totalClicks > 500 && recent.averageCtr > INDUSTRY_BENCHMARKS.goodCtr) {
    return {
      tier: 'Champions',
      score,
      priority: 'Monitor',
      reasoning: `Top performer with ${recent.totalClicks} clicks and ${(recent.averageCtr * 100).toFixed(2)}% CTR`,
      marketingAction: 'Document and replicate success factors across similar pages',
      technicalAction: 'Ensure optimal technical performance and monitor for any issues',
      expectedImpact: 'Maintain current performance levels',
      timeframe: 'Ongoing monitoring',
      confidence: 0.9,
      kpis
    };
  }

  // Rising Stars - Strong upward trend
  if (trend.trend === 'up' && trend.rSquared > 0.4 && clicksChange > PERFORMANCE_THRESHOLDS.strongChange) {
    return {
      tier: 'Rising Stars',
      score,
      priority: 'Medium',
      reasoning: `Strong upward trend with ${(clicksChange * 100).toFixed(0)}% clicks increase`,
      marketingAction: 'Amplify with social promotion and internal linking',
      technicalAction: 'Optimize for featured snippets and related keywords',
      expectedImpact: `Potential for ${Math.round(clicksChange * 100 * 1.5)}% additional growth`,
      timeframe: '2-4 weeks',
      confidence: trend.rSquared,
      kpis
    };
  }

  // At Risk - Declining with concerning trends
  if (trend.trend === 'down' && trend.rSquared > 0.4 && clicksChange < -PERFORMANCE_THRESHOLDS.strongChange) {
    return {
      tier: 'At Risk',
      score,
      priority: 'Critical',
      reasoning: `Declining trend with ${Math.abs(clicksChange * 100).toFixed(0)}% clicks drop`,
      marketingAction: 'Immediate content audit and competitor analysis',
      technicalAction: 'Check for technical issues, indexing problems, and ranking losses',
      expectedImpact: `Risk of losing ${Math.abs(clicksChange * 100).toFixed(0)}% more traffic`,
      timeframe: 'Immediate action required',
      confidence: trend.rSquared,
      kpis
    };
  }

  // Quick Wins - High impressions, low CTR
  if (recent.totalImpressions > 1000 && recent.averageCtr < INDUSTRY_BENCHMARKS.averageCtr) {
    const potentialClicks = recent.totalImpressions * (INDUSTRY_BENCHMARKS.averageCtr - recent.averageCtr);
    return {
      tier: 'Quick Wins',
      score,
      priority: 'High',
      reasoning: `High visibility (${recent.totalImpressions} impressions) but low CTR (${(recent.averageCtr * 100).toFixed(2)}%)`,
      marketingAction: 'A/B test new titles and meta descriptions',
      technicalAction: 'Optimize title tags, meta descriptions, and structured data',
      expectedImpact: `Potential for ${Math.round(potentialClicks)} additional monthly clicks`,
      timeframe: '1-2 weeks',
      confidence: 0.8,
      kpis
    };
  }

  // Hidden Gems - Good position, underperforming CTR
  if (recent.averagePosition <= 10 && recent.averageCtr < INDUSTRY_BENCHMARKS.averageCtr && recent.totalImpressions > 500) {
    return {
      tier: 'Hidden Gems',
      score,
      priority: 'High',
      reasoning: `Good rankings (position ${recent.averagePosition.toFixed(1)}) but underperforming CTR`,
      marketingAction: 'Enhance content value proposition and calls-to-action',
      technicalAction: 'Optimize snippets, add schema markup, improve page speed',
      expectedImpact: `20-40% CTR improvement potential`,
      timeframe: '2-3 weeks',
      confidence: 0.7,
      kpis
    };
  }

  // Cash Cows - Stable, high-performing pages
  if (recent.totalClicks > 300 && Math.abs(clicksChange) < PERFORMANCE_THRESHOLDS.significantChange && recent.averageCtr >= INDUSTRY_BENCHMARKS.averageCtr) {
    return {
      tier: 'Cash Cows',
      score,
      priority: 'Low',
      reasoning: `Stable performance with consistent ${recent.totalClicks} monthly clicks`,
      marketingAction: 'Use as template for similar content creation',
      technicalAction: 'Maintain technical health and monitor for any degradation',
      expectedImpact: 'Sustained reliable traffic',
      timeframe: 'Quarterly review',
      confidence: 0.8,
      kpis
    };
  }

  // Problem Pages - Multiple issues
  if (score < 30 || (recent.averagePosition > 50 && recent.totalClicks < 50)) {
    return {
      tier: 'Problem Pages',
      score,
      priority: 'Critical',
      reasoning: `Multiple issues: poor rankings (${recent.averagePosition.toFixed(1)}) and low traffic`,
      marketingAction: 'Complete content overhaul or consider consolidation',
      technicalAction: 'Technical SEO audit, check for penalties or technical issues',
      expectedImpact: 'Recovery potential varies by root cause',
      timeframe: '4-8 weeks',
      confidence: 0.6,
      kpis
    };
  }

  // Declining - Moderate decline
  if (clicksChange < -PERFORMANCE_THRESHOLDS.significantChange) {
    return {
      tier: 'Declining',
      score,
      priority: 'High',
      reasoning: `Traffic declining by ${Math.abs(clicksChange * 100).toFixed(0)}%`,
      marketingAction: 'Content refresh and competitive analysis',
      technicalAction: 'Check rankings, indexing status, and technical performance',
      expectedImpact: `Potential to recover ${Math.abs(clicksChange * 100).toFixed(0)}% of lost traffic`,
      timeframe: '3-4 weeks',
      confidence: 0.7,
      kpis
    };
  }

  // Default to monitoring stable pages
  return {
    tier: 'Cash Cows',
    score,
    priority: 'Low',
    reasoning: 'Stable performance, no immediate action needed',
    marketingAction: 'Monitor for opportunities and maintain content freshness',
    technicalAction: 'Regular health checks and performance monitoring',
    expectedImpact: 'Maintained stable performance',
    timeframe: 'Monthly review',
    confidence: 0.6,
    kpis
  };
}

async function runAdvancedPageTiering(firestore: FirebaseFirestore.Firestore) {
  console.log('[Advanced Tiering] Starting enhanced page tiering analysis...');

  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 2); // Account for GSC data delay

  // Recent performance: last 28 days
  const recentStartDate = new Date(endDate);
  recentStartDate.setDate(endDate.getDate() - 28);

  // Baseline: 28 days before the recent period (not 90 days to make it more responsive)
  const baselineStartDate = new Date(recentStartDate);
  baselineStartDate.setDate(recentStartDate.getDate() - 28);
  const baselineEndDate = new Date(recentStartDate);
  baselineEndDate.setDate(recentStartDate.getDate() - 1);

  // Get all pages
  const pagesSnapshot = await firestore.collection('pages').get();
  if (pagesSnapshot.empty) {
    console.log('[Advanced Tiering] No pages found.');
    return { processed: 0, tiers: {} };
  }

  const batch = firestore.batch();
  let processed = 0;
  const tierCounts: Record<PerformanceTier, number> = {
    'Champions': 0,
    'Rising Stars': 0,
    'Cash Cows': 0,
    'Hidden Gems': 0,
    'Quick Wins': 0,
    'Declining': 0,
    'At Risk': 0,
    'Problem Pages': 0,
    'New/Low Data': 0
  };

  for (const pageDoc of pagesSnapshot.docs) {
    const pageData = pageDoc.data();
    const pageUrl = pageDoc.id;

    try {
      // Get analytics for both periods
      const [recentMetrics, baselineMetrics] = await Promise.all([
        getPageAnalytics(firestore, pageUrl, pageData.siteUrl, recentStartDate, endDate),
        getPageAnalytics(firestore, pageUrl, pageData.siteUrl, baselineStartDate, baselineEndDate)
      ]);

      // Perform trend analysis on recent data
      const trend = recentMetrics.dataPoints.length >= 7
        ? trendAnalysis(recentMetrics.dataPoints)
        : { trend: 'stable', rSquared: 0 };

      // Analyze the page
      const analysis = analyzePage(pageUrl, recentMetrics, baselineMetrics, trend);

      // Update the page document
      const updateData = {
        performance_tier: analysis.tier,
        performance_score: analysis.score,
        performance_priority: analysis.priority,
        performance_reasoning: analysis.reasoning,
        marketing_action: analysis.marketingAction,
        technical_action: analysis.technicalAction,
        expected_impact: analysis.expectedImpact,
        timeframe: analysis.timeframe,
        confidence: analysis.confidence,
        last_tiering_run: new Date().toISOString(),
        metrics: {
          recent: recentMetrics,
          baseline: baselineMetrics,
          kpis: analysis.kpis,
          trend: {
            direction: trend.trend,
            strength: trend.rSquared,
            confidence: analysis.confidence
          }
        }
      };

      batch.update(pageDoc.ref, updateData);
      tierCounts[analysis.tier]++;
      processed++;

      // Log high-priority findings
      if (analysis.priority === 'Critical') {
        console.log(`[Advanced Tiering] CRITICAL: ${pageUrl} - ${analysis.tier}: ${analysis.reasoning}`);
      }

    } catch (error) {
      console.error(`[Advanced Tiering] Error analyzing page ${pageUrl}:`, error);
      continue;
    }
  }

  await batch.commit();

  // Store summary statistics
  await firestore.collection('tiering_stats').doc('latest').set({
    lastRun: new Date().toISOString(),
    totalPagesProcessed: processed,
    tierDistribution: tierCounts,
    analysisConfig: {
      recentPeriod: `${recentStartDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      baselinePeriod: `${baselineStartDate.toISOString().split('T')[0]} to ${baselineEndDate.toISOString().split('T')[0]}`,
      thresholds: PERFORMANCE_THRESHOLDS,
      benchmarks: INDUSTRY_BENCHMARKS
    }
  });

  console.log('[Advanced Tiering] Completed. Processed:', processed);
  console.log('[Advanced Tiering] Tier distribution:', tierCounts);

  return { processed, tiers: tierCounts };
}

// Export the function for use in cron jobs
export { runAdvancedPageTiering };
export type { PerformanceTier, TierAnalysis };
export type { PerformanceTier, TierAnalysis };
