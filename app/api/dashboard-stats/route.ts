import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API route handler to get the pre-calculated dashboard stats.
 * This is a highly efficient endpoint that reads a single document.
 * URL: /api/dashboard-stats
 */
export async function GET(request: NextRequest) {
  try {
    const firestore = initializeFirebaseAdmin();

    // Get the dashboard stats
    const dashboardStatsRef = firestore.collection('dashboard_stats').doc('latest');
    const dashboardDoc = await dashboardStatsRef.get();

    if (!dashboardDoc.exists) {
      return NextResponse.json({ error: 'Dashboard stats not found. Please run the daily cron job first.', hint: 'Visit /api/cron/daily-stats?secret=your_secret to generate initial data' }, { status: 404 });
    }

    const dashboardData: any = dashboardDoc.data();

    // Get losing and winning pages from the pages collection
    const pagesSnapshot = await firestore.collection('pages')
      .where('performance_tier', 'in', ['Declining', 'Rising Stars', 'Quick Wins'])
      .limit(100)
      .get();

    const losingPages: any[] = [];
    const winningPages: any[] = [];

    if (!pagesSnapshot.empty) {
      pagesSnapshot.docs.forEach(doc => {
        const pageData = doc.data();
        const originalUrl = pageData.originalUrl || pageData.url || doc.id.replace(/__/g, '/');

        const pageInfo = {
          page: originalUrl,
          title: pageData.title || `Page: ${originalUrl.split('/').pop() || 'Untitled'}`,
          performance_tier: pageData.performance_tier || 'Unknown',
          clicks: pageData.metrics?.recent?.totalClicks || 0,
          impressions: pageData.metrics?.recent?.totalImpressions || 0,
          impressions1: pageData.metrics?.recent?.totalImpressions || 0,
          impressions2: pageData.metrics?.baseline?.totalImpressions || 0,
          impressionChange: pageData.metrics?.kpis?.impressionsChange || 0,
        };

        if (pageData.performance_tier === 'Declining') {
          losingPages.push(pageInfo);
        } else if (pageData.performance_tier === 'Rising Stars' || pageData.performance_tier === 'Quick Wins') {
          winningPages.push(pageInfo);
        }
      });
    }

    // Sort losing pages by impression change (most negative first)
    losingPages.sort((a, b) => a.impressionChange - b.impressionChange);

    // Sort winning pages by clicks (highest first)
    winningPages.sort((a, b) => b.clicks - a.clicks);

    // Transform the data into the expected format
    const responseData = {
      siteSummary: {
        historicalData: dashboardData.historicalData,
        dashboardStats: dashboardData,
      },
      losingPages: losingPages.slice(0, 50), // Top 50 losing pages
      winningPages: winningPages.slice(0, 50), // Top 50 winning pages
    };

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';

    return NextResponse.json({
      error: 'Failed to fetch dashboard stats.',
      details: errorMessage,
      hint: 'Check if the cron job has run and data exists in Firestore'
    }, { status: 500 });
  }
}
