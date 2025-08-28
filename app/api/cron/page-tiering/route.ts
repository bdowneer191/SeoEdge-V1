import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { trendAnalysis } from '@/lib/analytics/trend';
import type { AnalyticsAggData } from '@/services/ingestion/GSCIngestionService';

export const dynamic = 'force-dynamic';

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
    console.log('[Cron Job] Starting page tiering...');

    // Define Time Windows
    const endDate = new Date();
    endDate.setDate(endDate.getDate() - 2); // 2 days delay for GSC data
    const recentStartDate = new Date(endDate);
    recentStartDate.setDate(endDate.getDate() - 28);
    const baselineStartDate = new Date(recentStartDate);
    baselineStartDate.setDate(recentStartDate.getDate() - 90);

    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // Get all pages
    const pagesSnapshot = await firestore.collection('pages').get();
    if (pagesSnapshot.empty) {
      console.log('[Cron Job] No pages found to tier.');
      return NextResponse.json({ status: 'success', message: 'No pages found.' });
    }

    const batch = firestore.batch();
    let processedCount = 0;

    for (const pageDoc of pagesSnapshot.docs) {
      const pageData = pageDoc.data();
      const pageUrl = pageDoc.id;

      // Fetch analytics for the page for both recent and baseline periods
      const recentAnalyticsSnapshot = await firestore.collection('analytics')
        .where('siteUrl', '==', pageData.siteUrl)
        .where('page', '==', pageUrl)
        .where('date', '>=', formatDate(recentStartDate))
        .where('date', '<=', formatDate(endDate))
        .get();

      const baselineAnalyticsSnapshot = await firestore.collection('analytics')
        .where('siteUrl', '==', pageData.siteUrl)
        .where('page', '==', pageUrl)
        .where('date', '>=', formatDate(baselineStartDate))
        .where('date', '<', formatDate(recentStartDate))
        .get();

      const recentAnalytics = recentAnalyticsSnapshot.docs.map(doc => doc.data() as AnalyticsAggData);
      const baselineAnalytics = baselineAnalyticsSnapshot.docs.map(doc => doc.data() as AnalyticsAggData);

      // Calculate metrics
      const calculateMetrics = (data: AnalyticsAggData[]) => {
        if (data.length === 0) return { totalClicks: 0, totalImpressions: 0, averageCtr: 0, dataPoints: [] };
        const totalClicks = data.reduce((sum, item) => sum + item.totalClicks, 0);
        const totalImpressions = data.reduce((sum, item) => sum + item.totalImpressions, 0);
        const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
        return { totalClicks, totalImpressions, averageCtr, dataPoints: data.map(d => d.totalClicks) };
      };

      const recentMetrics = calculateMetrics(recentAnalytics);
      const baselineMetrics = calculateMetrics(baselineAnalytics);

      if (recentMetrics.totalClicks === 0 && baselineMetrics.totalClicks === 0) {
        continue; // Skip pages with no traffic
      }

      // Perform trend analysis on recent clicks
      const { trend, rSquared } = trendAnalysis(recentMetrics.dataPoints);

      let performance_tier = 'Stable';
      let performance_reason = 'Traffic has remained stable with no significant changes.';

      const clicksChange = baselineMetrics.totalClicks > 0 ? (recentMetrics.totalClicks / baselineMetrics.totalClicks) - 1 : Infinity;

      // Assign Performance Tiers
      if (clicksChange < -0.3 && trend === 'down' && rSquared > 0.6) {
        performance_tier = 'Declining';
        performance_reason = `Lost ${Math.abs(clicksChange * 100).toFixed(0)}% of clicks compared to the previous period with a strong downward trend.`;
      } else if (clicksChange > 0.2 && trend === 'up' && rSquared > 0.6) {
        performance_tier = 'Winners';
        performance_reason = `Gained ${Math.abs(clicksChange * 100).toFixed(0)}% more clicks compared to the previous period with a strong upward trend.`;
      } else if (recentMetrics.totalImpressions > 1000 && recentMetrics.averageCtr < 0.025) {
        performance_tier = 'Opportunities';
        performance_reason = 'High impressions but low CTR. Optimize titles and meta descriptions to capture more clicks.';
      }

      // Update Firestore
      const updateData = {
        performance_tier,
        performance_reason,
        last_tiering_run: new Date().toISOString(),
        metrics: {
          recent: recentMetrics,
          baseline: baselineMetrics,
          change: {
            clicks: clicksChange
          }
        }
      };
      batch.update(pageDoc.ref, updateData);
      processedCount++;
    }

    await batch.commit();

    console.log('[Cron Job] Page tiering completed successfully.');
    return NextResponse.json({ status: 'success', message: 'Page tiering completed.' });

  } catch (error) {
    console.error('[Cron Job] Page tiering failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({
      status: 'error',
      message: 'Page tiering failed.',
      details: errorMessage
    }, { status: 500 });
  }
}
