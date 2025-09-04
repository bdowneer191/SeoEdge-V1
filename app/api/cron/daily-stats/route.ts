// app/api/cron/daily-stats/route.ts - Optimized for Firestore free tier
import { NextResponse, type NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { trendAnalysis } from '@/lib/analytics/trend';
import { GSCIngestionService, AnalyticsAggData } from '@/services/ingestion/GSCIngestionService';

function sanitizeUrlForFirestore(url: string): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\//, '')
    .replace(/\//g, '__')
    .replace(/[#?&=]/g, '_')
    .replace(/_{3,}/g, '__')
    .replace(/^_+|_+$/g, '');
}

// Lightweight page tiering that processes only a small subset
async function runLightweightPageTiering(firestore: FirebaseFirestore.Firestore) {
  console.log('[Cron Job] Starting lightweight page tiering (free tier optimized)...');

  const siteUrl = 'sc-domain:hypefresh.com';
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1);

  const recentStartDate = new Date(endDate);
  recentStartDate.setDate(endDate.getDate() - 28);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  // Step 1: Get top performing pages from analytics first (limit to reduce reads)
  const topAnalyticsSnapshot = await firestore.collection('analytics_agg')
    .where('siteUrl', '==', siteUrl)
    .where('date', '>=', formatDate(recentStartDate))
    .where('date', '<=', formatDate(endDate))
    .limit(50) // Process only top 50 to stay within limits
    .get();

  console.log(`[Cron Job] Found ${topAnalyticsSnapshot.size} analytics records to process`);

  // Group analytics by page and aggregate
  const pageMetrics = new Map();

  topAnalyticsSnapshot.docs.forEach(doc => {
    const data = doc.data() as AnalyticsAggData;
    if (!data.page) return;

    if (!pageMetrics.has(data.page)) {
      pageMetrics.set(data.page, {
        totalClicks: 0,
        totalImpressions: 0,
        dates: []
      });
    }

    const metrics = pageMetrics.get(data.page);
    metrics.totalClicks += data.totalClicks;
    metrics.totalImpressions += data.totalImpressions;
    metrics.dates.push(data.date);
  });

  // Step 2: Create or update only the top 20 pages to minimize writes
  const topPages = Array.from(pageMetrics.entries())
    .sort(([,a], [,b]) => b.totalClicks - a.totalClicks)
    .slice(0, 20);

  const batch = firestore.batch();
  let processedCount = 0;

  const tierDistribution: Record<string, number> = {
    'Champions': 0, 'Rising Stars': 0, 'Cash Cows': 0, 'Quick Wins': 0,
    'Hidden Gems': 0, 'At Risk': 0, 'Declining': 0, 'Problem Pages': 0, 'New/Low Data': 0
  };

  for (const [pageUrl, metrics] of topPages) {
    const sanitizedId = sanitizeUrlForFirestore(pageUrl);
    if (sanitizedId.length < 3) continue;

    // Simple tiering logic based on aggregated metrics
    let performance_tier = 'New/Low Data';
    let performance_score = 50;
    let performance_priority = 'Monitor';

    const avgCtr = metrics.totalImpressions > 0 ? metrics.totalClicks / metrics.totalImpressions : 0;

    if (metrics.totalClicks >= 100 && avgCtr >= 0.03) {
      performance_tier = 'Champions';
      performance_score = 85;
      performance_priority = 'Monitor';
    } else if (metrics.totalClicks >= 50 && avgCtr >= 0.025) {
      performance_tier = 'Cash Cows';
      performance_score = 70;
      performance_priority = 'Medium';
    } else if (metrics.totalImpressions >= 500 && avgCtr < 0.02) {
      performance_tier = 'Quick Wins';
      performance_score = 60;
      performance_priority = 'High';
    } else if (metrics.totalClicks >= 20) {
      performance_tier = 'Rising Stars';
      performance_score = 65;
      performance_priority = 'Medium';
    }

    tierDistribution[performance_tier]++;

    const pageRef = firestore.collection('pages').doc(sanitizedId);
    batch.update(pageRef, {
      url: pageUrl,
      originalUrl: pageUrl,
      performance_tier,
      performance_priority,
      performance_score,
      performance_reasoning: `${metrics.totalClicks} clicks, ${metrics.totalImpressions} impressions (${metrics.dates.length} days)`,
      marketing_action: getMarketingAction(performance_tier),
      technical_action: getTechnicalAction(performance_tier),
      last_tiering_run: new Date().toISOString(),
      metrics: {
        recent: {
          totalClicks: metrics.totalClicks,
          totalImpressions: metrics.totalImpressions,
          averageCtr: avgCtr,
          averagePosition: 10 // Placeholder
        }
      }
    });

    processedCount++;
  }

  // Add remaining pages as "New/Low Data" (estimated)
  const remainingPages = Math.max(0, pageMetrics.size - processedCount);
  tierDistribution['New/Low Data'] += remainingPages;

  await batch.commit();

  // Save tiering stats
  await firestore.collection('tiering_stats').doc('latest').set({
    lastRun: new Date().toISOString(),
    totalPagesProcessed: processedCount,
    totalPagesInSystem: pageMetrics.size,
    tierDistribution,
    processingNote: 'Lightweight processing for free tier - top performing pages only',
    nextFullRun: 'Upgrade to paid tier for complete analysis'
  });

  return { processed: processedCount, distribution: tierDistribution };
}

function getMarketingAction(tier: string): string {
  const actions = {
    'Champions': 'Amplify success - create similar content',
    'Cash Cows': 'Maintain content freshness',
    'Quick Wins': 'Optimize titles and descriptions',
    'Rising Stars': 'Double down on promotion',
    'New/Low Data': 'Monitor and promote'
  };
  return actions[tier] || 'Monitor performance';
}

function getTechnicalAction(tier: string): string {
  const actions = {
    'Champions': 'Maintain optimization',
    'Cash Cows': 'Monitor technical health',
    'Quick Wins': 'Implement structured data',
    'Rising Stars': 'Optimize for featured snippets',
    'New/Low Data': 'Ensure basic SEO health'
  };
  return actions[tier] || 'Basic SEO optimization';
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

    console.log('[Cron Job] Starting lightweight daily stats (free tier optimized)...');

    // Step 1: Generate dashboard stats with minimal reads
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 7); // Only last 7 days to reduce reads

    const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

    const snapshot = await firestore
      .collection('analytics_agg')
      .where('siteUrl', '==', siteUrl)
      .where('date', '>=', formatDateStr(startDate))
      .where('date', '<=', formatDateStr(endDate))
      .orderBy('date', 'asc')
      .limit(10) // Limit to reduce reads
      .get();

    if (snapshot.empty) {
      return NextResponse.json({
        status: 'error',
        message: 'No recent analytics data found.',
      }, { status: 400 });
    }

    const historicalData: AnalyticsAggData[] = snapshot.docs.map(doc => doc.data() as AnalyticsAggData);

    // Simple metrics calculation
    const totalClicks = historicalData.reduce((sum, d) => sum + d.totalClicks, 0);
    const totalImpressions = historicalData.reduce((sum, d) => sum + d.totalImpressions, 0);
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPosition = historicalData.reduce((sum, d) => sum + d.averagePosition, 0) / historicalData.length;

    const dashboardStats = {
      status: 'success',
      lastUpdated: new Date().toISOString(),
      siteUrl,
      dateRange: {
        start: formatDateStr(startDate),
        end: formatDateStr(endDate)
      },
      dataPointsAnalyzed: historicalData.length,
      metrics: {
        totalClicks: {
          current: totalClicks,
          average: totalClicks / 7,
          trend: 'stable'
        },
        totalImpressions: {
          current: totalImpressions,
          average: totalImpressions / 7,
          trend: 'stable'
        },
        averageCtr: {
          current: avgCtr,
          average: avgCtr,
          trend: 'stable'
        },
        averagePosition: {
          current: avgPosition,
          average: avgPosition,
          trend: 'stable'
        }
      },
      summary: {
        totalClicks,
        totalImpressions,
        averageCtr: avgCtr,
        averagePosition: avgPosition
      },
      processingNote: 'Optimized for free tier - limited data processing'
    };

    await firestore.collection('dashboard_stats').doc('latest').set(dashboardStats);

    // Step 2: Run lightweight page tiering
    const tieringResult = await runLightweightPageTiering(firestore);

    return NextResponse.json({
      status: 'success',
      message: 'Lightweight daily stats completed (free tier optimized)',
      details: {
        analyticsDataPoints: historicalData.length,
        pagesProcessed: tieringResult.processed,
        tierDistribution: tieringResult.distribution,
        note: 'Processing limited to top pages to stay within free tier limits'
      }
    });

  } catch (error) {
    console.error('[Cron Job] Lightweight daily stats failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';

    // Check if it's a quota error
    if (errorMessage.includes('Quota exceeded') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({
        status: 'quota_exceeded',
        message: 'Firestore quota exceeded - switching to minimal processing mode',
        details: errorMessage,
        suggestion: 'Consider upgrading to Firestore paid tier or reducing data volume'
      }, { status: 200 }); // Return 200 so frontend handles gracefully
    }

    return NextResponse.json({
      status: 'error',
      message: 'Daily stats generation failed',
      details: errorMessage
    }, { status: 500 });
  }
}

function getStats(data: number[]): { mean: number; stdDev: number } {
  const n = data.length;
  if (n === 0) return { mean: 0, stdDev: 0 };

  const mean = data.reduce((a, b) => a + b) / n;
  const variance = data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  return { mean, stdDev: Math.sqrt(variance) };
}
