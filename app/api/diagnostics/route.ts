import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * System diagnostics API to help troubleshoot data pipeline issues
 * GET /api/diagnostics
 */
export async function GET() {
  try {
    const firestore = initializeFirebaseAdmin();
    const siteUrl = 'sc-domain:hypefresh.com';

    console.log('[Diagnostics] Running system health check...');

    // Check 1: Firebase connection
    let firebaseStatus = 'unknown';
    try {
      await firestore.collection('_health').limit(1).get();
      firebaseStatus = 'connected';
    } catch (error) {
      firebaseStatus = `error: ${error.message}`;
    }

    // Check 2: Analytics data availability
    const analyticsSnapshot = await firestore.collection('analytics_agg')
      .where('siteUrl', '==', siteUrl)
      .orderBy('date', 'desc')
      .limit(5)
      .get();

    const analyticsStatus = {
      available: !analyticsSnapshot.empty,
      recordCount: analyticsSnapshot.size,
      latestDate: analyticsSnapshot.empty ? null : analyticsSnapshot.docs[0].data().date,
      sampleData: analyticsSnapshot.empty ? null : analyticsSnapshot.docs[0].data()
    };

    // Check 3: Raw GSC data
    const gscRawSnapshot = await firestore.collection('analytics')
      .where('siteUrl', '==', siteUrl)
      .orderBy('date', 'desc')
      .limit(5)
      .get();

    const gscRawStatus = {
      available: !gscRawSnapshot.empty,
      recordCount: gscRawSnapshot.size,
      latestDate: gscRawSnapshot.empty ? null : gscRawSnapshot.docs[0].data().date
    };

    // Check 4: Pages collection
    const pagesSnapshot = await firestore.collection('pages').limit(10).get();
    const pagesStatus = {
      available: !pagesSnapshot.empty,
      totalPages: pagesSnapshot.size,
      samplePages: pagesSnapshot.docs.slice(0, 3).map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          url: data.originalUrl || data.url,
          tier: data.performance_tier,
          lastRun: data.last_tiering_run
        };
      })
    };

    // Check 5: Dashboard stats
    const dashboardStatsDoc = await firestore.collection('dashboard_stats').doc('latest').get();
    const dashboardStatus = {
      available: dashboardStatsDoc.exists,
      status: dashboardStatsDoc.exists ? dashboardStatsDoc.data()?.status : null,
      lastUpdated: dashboardStatsDoc.exists ? dashboardStatsDoc.data()?.lastUpdated : null
    };

    // Check 6: Tiering stats
    const tieringStatsDoc = await firestore.collection('tiering_stats').doc('latest').get();
    const tieringStatus = {
      available: tieringStatsDoc.exists,
      lastRun: tieringStatsDoc.exists ? tieringStatsDoc.data()?.lastRun : null,
      totalPages: tieringStatsDoc.exists ? tieringStatsDoc.data()?.totalPagesProcessed : 0,
      distribution: tieringStatsDoc.exists ? tieringStatsDoc.data()?.tierDistribution : null
    };

    // Overall health assessment
    const issues = [];
    const recommendations = [];

    if (firebaseStatus !== 'connected') {
      issues.push('Firebase connection failed');
      recommendations.push('Check Firebase credentials and network connectivity');
    }

    if (!analyticsStatus.available) {
      issues.push('No analytics aggregation data found');
      recommendations.push('Run GSC ingestion cron job: /api/cron/ingest');
    }

    if (!gscRawStatus.available) {
      issues.push('No raw GSC data found');
      recommendations.push('Verify GSC API credentials and site URL configuration');
    }

    if (!pagesStatus.available) {
      issues.push('No pages found in database');
      recommendations.push('Run URL migration script: /api/admin/migrate-urls');
    }

    if (!dashboardStatus.available) {
      issues.push('Dashboard stats not generated');
      recommendations.push('Run daily stats cron job: /api/cron/daily-stats');
    }

    if (!tieringStatus.available) {
      issues.push('Page tiering analysis not run');
      recommendations.push('Daily stats cron job includes tiering - run that first');
    }

    // Data freshness check
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000));

    if (analyticsStatus.latestDate) {
      const latestAnalyticsDate = new Date(analyticsStatus.latestDate);
      if (latestAnalyticsDate < twoDaysAgo) {
        issues.push('Analytics data is stale (older than 2 days)');
        recommendations.push('Run GSC ingestion to get recent data');
      }
    }

    const healthScore = Math.max(0, 100 - (issues.length * 20));
    const overallHealth = healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'needs-attention' : 'critical';

    const diagnostics = {
      timestamp: new Date().toISOString(),
      overallHealth,
      healthScore,
      issues,
      recommendations,
      components: {
        firebase: firebaseStatus,
        analyticsData: analyticsStatus,
        rawGSCData: gscRawStatus,
        pages: pagesStatus,
        dashboardStats: dashboardStatus,
        tieringStats: tieringStatus
      },
      environment: {
        siteUrl,
        nodeEnv: process.env.NODE_ENV,
        hasFirebaseCredentials: !!process.env.FIREBASE_ADMIN_SDK_JSON_BASE64,
        hasAdminSecret: !!process.env.ADMIN_SHARED_SECRET
      },
      quickActions: [
        {
          name: 'Run Full Data Pipeline',
          steps: [
            'POST /api/cron/ingest (GSC data ingestion)',
            'Wait 30 seconds',
            'POST /api/cron/daily-stats (analytics + tiering)',
            'Check /api/dashboard-stats for results'
          ]
        },
        {
          name: 'Fix Missing Pages',
          steps: [
            'GET /api/admin/migrate-urls?secret=YOUR_SECRET',
            'Wait for completion',
            'POST /api/cron/daily-stats to analyze pages'
          ]
        }
      ]
    };

    return NextResponse.json(diagnostics);

  } catch (error) {
    console.error('[Diagnostics] System check failed:', error);

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      overallHealth: 'critical',
      healthScore: 0,
      issues: ['System diagnostics failed'],
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendations: [
        'Check Firebase credentials',
        'Verify environment variables',
        'Check server logs for detailed errors'
      ]
    }, { status: 500 });
  }
}
