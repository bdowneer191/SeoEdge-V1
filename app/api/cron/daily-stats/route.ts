import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
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

function getOriginalUrlFromPageDoc(pageDoc: any): string {
  const data = pageDoc.data();
  return data?.originalUrl || data?.url || pageDoc.id.replace(/__/g, '/');
}

// Refactored page tiering for improved performance and quota management
async function runAdvancedPageTiering(firestore: FirebaseFirestore.Firestore) {
  console.log('[Cron Job] Starting advanced page tiering with a single query...');

  const siteUrl = 'sc-domain:hypefresh.com';

  // Use more recent time windows for better responsiveness
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // Yesterday (more recent than -2)

  const recentStartDate = new Date(endDate);
  recentStartDate.setDate(endDate.getDate() - 28); // Last 28 days

  const baselineStartDate = new Date(recentStartDate);
  baselineStartDate.setDate(recentStartDate.getDate() - 28); // Previous 28 days
  const baselineEndDate = new Date(recentStartDate);
  baselineEndDate.setDate(recentStartDate.getDate() - 1);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  console.log(`[Cron Job] Analyzing periods: ${formatDate(baselineStartDate)} to ${formatDate(baselineEndDate)} vs ${formatDate(recentStartDate)} to ${formatDate(endDate)}`);

  // Step 1: Get all pages in a single batch
  const pagesSnapshot = await firestore.collection('pages').limit(200).get();

  if (pagesSnapshot.empty) {
    console.log('[Cron Job] No pages found. Cannot run tiering.');
    return { processed: 0, distribution: {} };
  }

  const pages = pagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Step 2: Get all required analytics data in one or two queries
  const allAnalyticsSnapshot = await firestore.collection('analytics_agg')
      .where('siteUrl', '==', siteUrl)
      .where('date', '>=', formatDate(baselineStartDate))
      .where('date', '<=', formatDate(endDate))
      .get();

  const allAnalyticsData = allAnalyticsSnapshot.docs.map(doc => doc.data() as AnalyticsAggData);

  const analyticsByPage: Map<string, AnalyticsAggData[]> = new Map();
  allAnalyticsData.forEach(data => {
      const page = data.page as string;
      if (!analyticsByPage.has(page)) {
          analyticsByPage.set(page, []);
      }
      analyticsByPage.get(page)?.push(data);
  });

  const batch = firestore.batch();
  let processedCount = 0;
  let tierDistribution: Record<string, number> = {
    'Champions': 0, 'Rising Stars': 0, 'Cash Cows': 0, 'Quick Wins': 0, 'Hidden Gems': 0,
    'At Risk': 0, 'Declining': 0, 'Problem Pages': 0, 'New/Low Data': 0
  };

  for (const pageDoc of pages) {
    try {
      const originalUrl = pageDoc.url;
      const allPageAnalytics = analyticsByPage.get(originalUrl) || [];

      const recentAnalytics = allPageAnalytics.filter(d => d.date >= formatDate(recentStartDate) && d.date <= formatDate(endDate));
      const baselineAnalytics = allPageAnalytics.filter(d => d.date >= formatDate(baselineStartDate) && d.date < formatDate(recentStartDate));

      // Calculate comprehensive metrics
      const calculateMetrics = (data: AnalyticsAggData[]) => {
        if (data.length === 0) return {
          totalClicks: 0,
          totalImpressions: 0,
          averageCtr: 0,
          averagePosition: 0,
          dataPoints: [] as number[]
        };

        const totalClicks = data.reduce((sum, item) => sum + item.totalClicks, 0);
        const totalImpressions = data.reduce((sum, item) => sum + item.totalImpressions, 0);
        const avgPosition = data.length > 0 ? data.reduce((sum, item) => sum + item.averagePosition, 0) / data.length : 0;
        const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

        return {
          totalClicks,
          totalImpressions,
          averageCtr,
          averagePosition: avgPosition,
          dataPoints: data.map(d => d.totalClicks)
        };
      };

      const recentMetrics = calculateMetrics(recentAnalytics);
      const baselineMetrics = calculateMetrics(baselineAnalytics);

      // Skip pages with absolutely no data
      if (recentMetrics.totalClicks === 0 && baselineMetrics.totalClicks === 0 && recentMetrics.totalImpressions === 0) {
        tierDistribution['New/Low Data']++;

        const updateData = {
          originalUrl,
          url: originalUrl,
          performance_tier: 'New/Low Data',
          performance_priority: 'Monitor',
          performance_score: 0,
          performance_reasoning: 'No traffic data available yet',
          marketing_action: 'Wait for traffic data to accumulate',
          technical_action: 'Ensure page is properly indexed',
          expected_impact: 'N/A - awaiting data',
          timeframe: 'Next analysis cycle',
          confidence: 0.1,
          last_tiering_run: new Date().toISOString(),
          metrics: {
            recent: recentMetrics,
            baseline: baselineMetrics,
            change: { clicks: 0 }
          }
        };

        batch.update(firestore.collection('pages').doc(pageDoc.id), updateData);
        processedCount++;
        continue;
      }

      // Perform trend analysis
      const { trend, rSquared } = trendAnalysis(recentMetrics.dataPoints);
      const trendConfidence = rSquared || 0;

      // Calculate changes
      const clicksChange = baselineMetrics.totalClicks > 0
        ? (recentMetrics.totalClicks - baselineMetrics.totalClicks) / baselineMetrics.totalClicks
        : (recentMetrics.totalClicks > 0 ? 1 : 0);

      const impressionsChange = baselineMetrics.totalImpressions > 0
        ? (recentMetrics.totalImpressions - baselineMetrics.totalImpressions) / baselineMetrics.totalImpressions
        : (recentMetrics.totalImpressions > 0 ? 1 : 0);

      const ctrChange = baselineMetrics.averageCtr > 0
        ? (recentMetrics.averageCtr - baselineMetrics.averageCtr) / baselineMetrics.averageCtr
        : 0;

      const positionChange = baselineMetrics.averagePosition > 0
        ? (recentMetrics.averagePosition - baselineMetrics.averagePosition) / baselineMetrics.averagePosition
        : 0;

      // Advanced tiering logic with realistic thresholds
      let performance_tier = 'New/Low Data';
      let performance_priority = 'Monitor';
      let performance_reasoning = 'Analyzing performance patterns';
      let marketing_action = 'Monitor and collect more data';
      let technical_action = 'Ensure basic SEO health';
      let expected_impact = 'Data collection phase';
      let timeframe = 'Next analysis cycle';
      let confidence = 0.5;
      let performance_score = 50;

      // Champions: High traffic, good CTR, stable/improving
      if (recentMetrics.totalClicks >= 100 && recentMetrics.averageCtr >= 0.03 && clicksChange >= -0.1) {
        performance_tier = 'Champions';
        performance_priority = 'Monitor';
        performance_score = 85 + Math.min(15, Math.floor(recentMetrics.totalClicks / 100));
        performance_reasoning = `Strong performer with ${recentMetrics.totalClicks} clicks and ${(recentMetrics.averageCtr * 100).toFixed(2)}% CTR`;
        marketing_action = 'Amplify success - create similar content, promote more';
        technical_action = 'Maintain current optimization, monitor for any technical issues';
        expected_impact = 'Sustained high performance';
        timeframe = 'Ongoing maintenance';
        confidence = 0.9;
      }
      // Rising Stars: Growing traffic, good trends
      else if (clicksChange > 0.2 && trend === 'up' && trendConfidence > 0.3) {
        performance_tier = 'Rising Stars';
        performance_priority = 'High';
        performance_score = 75 + Math.min(20, Math.floor(clicksChange * 50));
        performance_reasoning = `Growing ${(clicksChange * 100).toFixed(0)}% in clicks with strong upward trend`;
        marketing_action = 'Double down on promotion, create content series, build internal links';
        technical_action = 'Optimize for featured snippets, improve page speed';
        expected_impact = `+${Math.floor(recentMetrics.totalClicks * 0.3)} additional monthly clicks`;
        timeframe = '2-4 weeks';
        confidence = Math.min(0.9, trendConfidence + 0.2);
      }
      // Cash Cows: High impressions, decent CTR, stable
      else if (recentMetrics.totalImpressions >= 1000 && recentMetrics.averageCtr >= 0.025 && Math.abs(clicksChange) <= 0.15) {
        performance_tier = 'Cash Cows';
        performance_priority = 'Medium';
        performance_score = 70 + Math.min(20, Math.floor(recentMetrics.totalImpressions / 500));
        performance_reasoning = `High visibility with ${recentMetrics.totalImpressions} impressions and stable performance`;
        marketing_action = 'Maintain content freshness, add internal links from other pages';
        technical_action = 'Monitor for position changes, maintain technical health';
        expected_impact = 'Sustained visibility and traffic';
        timeframe = 'Ongoing monitoring';
        confidence = 0.8;
      }
      // Quick Wins: High impressions, low CTR (optimization opportunity)
      else if (recentMetrics.totalImpressions >= 500 && recentMetrics.averageCtr < 0.03) {
        performance_tier = 'Quick Wins';
        performance_priority = 'High';
        performance_score = 45 + Math.min(30, Math.floor(recentMetrics.totalImpressions / 200));
        performance_reasoning = `${recentMetrics.totalImpressions} impressions but only ${(recentMetrics.averageCtr * 100).toFixed(2)}% CTR - optimization opportunity`;
        marketing_action = 'Rewrite title tags and meta descriptions, A/B test different angles';
        technical_action = 'Implement structured data, optimize for featured snippets';
        expected_impact = `+${Math.floor(recentMetrics.totalImpressions * 0.02)} monthly clicks with 2% CTR improvement`;
        timeframe = '1-2 weeks';
        confidence = 0.85;
      }
      // Hidden Gems: Decent performance but low impressions (visibility opportunity)
      else if (recentMetrics.averageCtr >= 0.04 && recentMetrics.totalImpressions < 500 && recentMetrics.totalClicks >= 10) {
        performance_tier = 'Hidden Gems';
        performance_priority = 'Medium';
        performance_score = 65 + Math.min(25, Math.floor(recentMetrics.averageCtr * 500));
        performance_reasoning = `High CTR (${(recentMetrics.averageCtr * 100).toFixed(2)}%) but low visibility`;
        marketing_action = 'Build more backlinks, create supporting content, improve keyword targeting';
        technical_action = 'Target additional long-tail keywords, improve internal linking';
        expected_impact = `+${Math.floor(recentMetrics.totalImpressions * 2)} impressions potential`;
        timeframe = '4-8 weeks';
        confidence = 0.7;
      }
      // At Risk: Declining performance, needs attention
      else if (clicksChange < -0.15 && (trend === 'down' || recentMetrics.totalClicks < baselineMetrics.totalClicks * 0.8)) {
        performance_tier = 'At Risk';
        performance_priority = 'High';
        performance_score = 35 - Math.min(20, Math.abs(Math.floor(clicksChange * 50)));
        performance_reasoning = `Traffic declined ${Math.abs(clicksChange * 100).toFixed(0)}% - needs immediate attention`;
        marketing_action = 'Content audit, competitor analysis, refresh content strategy';
        technical_action = 'Check for technical issues, review recent algorithm updates';
        expected_impact = 'Prevent further decline, recover lost traffic';
        timeframe = 'Immediate action required';
        confidence = 0.8;
      }
      // Declining: Consistent downward trend
      else if (clicksChange < -0.25 && trend === 'down' && trendConfidence > 0.4) {
        performance_tier = 'Declining';
        performance_priority = 'Critical';
        performance_score = 25 - Math.min(15, Math.abs(Math.floor(clicksChange * 30)));
        performance_reasoning = `Strong declining trend: ${Math.abs(clicksChange * 100).toFixed(0)}% drop with high confidence`;
        marketing_action = 'Complete content overhaul, new keyword targeting, competitive analysis';
        technical_action = 'Full technical SEO audit, check for penalties or indexing issues';
        expected_impact = 'Recovery of lost traffic';
        timeframe = '2-6 weeks intensive work';
        confidence = Math.min(0.95, trendConfidence + 0.1);
      }
      // Problem Pages: Very poor performance
      else if (recentMetrics.totalClicks < 5 && recentMetrics.totalImpressions < 100 && (baselineMetrics.totalClicks > 20 || baselineMetrics.totalImpressions > 200)) {
        performance_tier = 'Problem Pages';
        performance_priority = 'Critical';
        performance_score = 15;
        performance_reasoning = 'Severe traffic loss or indexing issues';
        marketing_action = 'Consider consolidation, redirect, or complete content rewrite';
        technical_action = 'Check indexing status, review for penalties, technical audit';
        expected_impact = 'Recovery or strategic redirect';
        timeframe = 'Immediate investigation needed';
        confidence = 0.9;
      }
      // Default to New/Low Data for edge cases
      else {
        performance_tier = 'New/Low Data';
        performance_priority = 'Monitor';
        performance_score = 40 + Math.min(20, recentMetrics.totalClicks);
        performance_reasoning = recentMetrics.totalClicks > 0
          ? `Limited data: ${recentMetrics.totalClicks} clicks, monitoring for patterns`
          : 'Awaiting sufficient traffic data for analysis';
        marketing_action = recentMetrics.totalClicks > 0
          ? 'Continue monitoring, consider content promotion'
          : 'Ensure content is properly optimized and promoted';
        technical_action = 'Verify indexing, basic SEO optimization';
        expected_impact = 'Pattern identification as data grows';
        timeframe = 'Next analysis cycle';
        confidence = 0.3;
      }

      tierDistribution[performance_tier]++;

      const updateData = {
        originalUrl,
        url: originalUrl,
        performance_tier,
        performance_priority,
        performance_score: Math.max(0, Math.min(100, performance_score)),
        performance_reasoning,
        marketing_action,
        technical_action,
        expected_impact,
        timeframe,
        confidence: Math.max(0, Math.min(1, confidence)),
        last_tiering_run: new Date().toISOString(),
        metrics: {
          recent: recentMetrics,
          baseline: baselineMetrics,
          change: {
            clicks: clicksChange,
            impressions: impressionsChange,
            ctr: ctrChange,
            position: positionChange
          },
          trend: {
            direction: trend,
            confidence: trendConfidence
          }
        }
      };

      batch.update(firestore.collection('pages').doc(pageDoc.id), updateData);
      processedCount++;

    } catch (error) {
      console.error(`[Cron Job] Error processing page ${pageDoc.id}:`, error);
      tierDistribution['New/Low Data']++;
      continue;
    }
  }

  await batch.commit();

  await firestore.collection('tiering_stats').doc('latest').set({
    lastRun: new Date().toISOString(),
    totalPagesProcessed: processedCount,
    tierDistribution,
    analysisQuality: {
      dateRange: {
        recent: `${formatDate(recentStartDate)} to ${formatDate(endDate)}`,
        baseline: `${formatDate(baselineStartDate)} to ${formatDate(recentStartDate)}`
      },
      confidence: 'high',
      dataFreshness: 'recent'
    }
  });

  console.log(`[Cron Job] Advanced page tiering completed. Processed ${processedCount} pages.`);
  console.log('[Cron Job] Tier distribution:', tierDistribution);

  return { processed: processedCount, distribution: tierDistribution };
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

    console.log('[Cron Job] Starting daily GSC ingestion...');
    const ingestionService = new GSCIngestionService();
    const dateToFetch = new Date();
    dateToFetch.setDate(dateToFetch.getDate() - 2);
    const formattedDate = dateToFetch.toISOString().split('T')[0];
    await ingestionService.ingestDailySummary(siteUrl, formattedDate);
    console.log(`[Cron Job] Daily GSC summary ingestion completed for ${formattedDate}.`);

    console.log('[Cron Job] Starting enhanced daily stats generation...');

    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 1);
    const startDate = new Date(endDate);
    startDate.setDate(endDate.getDate() - 30);

    const formatDateStr = (d: Date) => d.toISOString().split('T')[0];

    const snapshot = await firestore
      .collection('analytics_agg')
      .where('siteUrl', '==', siteUrl)
      .where('date', '>=', formatDateStr(startDate))
      .where('date', '<=', formatDateStr(endDate))
      .orderBy('date', 'asc')
      .get();

    if (snapshot.empty) {
      console.log('[Cron Job] No analytics data found for dashboard stats');
      return NextResponse.json({
        status: 'error',
        message: 'No analytics data found. Run GSC ingestion first.',
      }, { status: 400 });
    }

    const historicalData: AnalyticsAggData[] = snapshot.docs.map(doc => doc.data() as AnalyticsAggData);
    console.log(`[Cron Job] Processing ${historicalData.length} days of analytics data`);

    const metricKeys: (keyof Omit<AnalyticsAggData, 'date' | 'siteUrl' | 'aggregatesByCountry' | 'aggregatesByDevice'>)[] =
      ['totalClicks', 'totalImpressions', 'averageCtr', 'averagePosition'];

    const metrics: { [key: string]: any } = {};

    for (const key of metricKeys) {
      const dataSeries = historicalData.map(d => d[key] as number);
      const latestValue = dataSeries[dataSeries.length - 1];
      const { mean: historicalAvg } = getStats(dataSeries);

      let smartMetric: any = {
        current: latestValue,
        average: historicalAvg,
        trend: null,
        trendConfidence: null,
        change: null,
        recommendations: []
      };

      if (dataSeries.length >= 7) {
        const { trend, rSquared } = trendAnalysis(dataSeries);
        smartMetric.trend = trend;
        smartMetric.trendConfidence = rSquared;

        if (dataSeries.length >= 8) {
          const weekAgo = dataSeries[dataSeries.length - 8];
          smartMetric.change = weekAgo > 0 ? (latestValue - weekAgo) / weekAgo : 0;
        }

        if (trend === 'down' && rSquared > 0.6) {
          smartMetric.recommendations.push(`${key} showing declining trend - investigate potential causes`);
        } else if (trend === 'up' && rSquared > 0.6) {
          smartMetric.recommendations.push(`${key} trending upward - identify and replicate success factors`);
        }
      }
      metrics[key] = smartMetric;
    }

    const dashboardStats = {
      status: 'success',
      lastUpdated: new Date().toISOString(),
      siteUrl,
      dateRange: {
        start: formatDateStr(startDate),
        end: formatDateStr(endDate)
      },
      dataPointsAnalyzed: historicalData.length,
      metrics,
      summary: {
        totalClicks: historicalData.reduce((sum, d) => sum + d.totalClicks, 0),
        totalImpressions: historicalData.reduce((sum, d) => sum + d.totalImpressions, 0),
        averageCtr: historicalData.reduce((sum, d) => sum + d.averageCtr, 0) / historicalData.length,
        averagePosition: historicalData.reduce((sum, d) => sum + d.averagePosition, 0) / historicalData.length
      }
    };

    await firestore.collection('dashboard_stats').doc('latest').set(dashboardStats);
    console.log('[Cron Job] Dashboard stats updated successfully');

    const tieringResult = await runAdvancedPageTiering(firestore);

    return NextResponse.json({
      status: 'success',
      message: 'Enhanced daily stats generation completed',
      details: {
        analyticsDataPoints: historicalData.length,
        pagesProcessed: tieringResult.processed,
        tierDistribution: tieringResult.distribution
      }
    });

  } catch (error) {
    console.error('[Cron Job] Enhanced daily stats failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';

    try {
      const firestore = initializeFirebaseAdmin();
      await firestore.collection('dashboard_stats').doc('latest').set({
        status: 'error',
        lastUpdated: new Date().toISOString(),
        error: errorMessage,
        message: 'Daily stats generation failed'
      });
    } catch (saveError) {
      console.error('[Cron Job] Failed to save error state:', saveError);
    }

    return NextResponse.json({
      status: 'error',
      message: 'Enhanced daily stats generation failed',
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
