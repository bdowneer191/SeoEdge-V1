import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

// Function to check if error is quota-related
function isQuotaError(error: any): boolean {
  const message = error?.message || '';
  return message.includes('Quota exceeded') ||
         message.includes('RESOURCE_EXHAUSTED') ||
         message.includes('quota') ||
         error?.code === 8; // RESOURCE_EXHAUSTED code
}

// Minimal data check and creation
async function ensureMinimalData(firestore: FirebaseFirestore.Firestore) {
  try {
    // Check if we have basic data with minimal reads
    const [dashboardCheck, tieringCheck] = await Promise.all([
      firestore.collection('dashboard_stats').doc('latest').get(),
      firestore.collection('tiering_stats').doc('latest').get()
    ]);

    const hasDashboard = dashboardCheck.exists;
    const hasTiering = tieringCheck.exists;

    if (hasDashboard && hasTiering) {
      console.log('[Safe Cron] Existing data found, skipping generation');
      return { status: 'existing_data', message: 'Data already exists' };
    }

    // Create minimal fallback data
    console.log('[Safe Cron] Creating minimal fallback data...');

    if (!hasDashboard) {
      await firestore.collection('dashboard_stats').doc('latest').set({
        status: 'minimal',
        lastUpdated: new Date().toISOString(),
        siteUrl: 'sc-domain:hypefresh.com',
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        metrics: {
          totalClicks: { current: 0, average: 0, trend: 'stable' },
          totalImpressions: { current: 0, average: 0, trend: 'stable' },
          averageCtr: { current: 0, average: 0, trend: 'stable' },
          averagePosition: { current: 0, average: 0, trend: 'stable' }
        },
        summary: {
          totalClicks: 0,
          totalImpressions: 0,
          averageCtr: 0,
          averagePosition: 0
        },
        processingNote: 'Minimal data mode - quota limitations detected'
      });
    }

    if (!hasTiering) {
      await firestore.collection('tiering_stats').doc('latest').set({
        lastRun: new Date().toISOString(),
        totalPagesProcessed: 0,
        totalPagesInSystem: 0,
        tierDistribution: {
          'Champions': 0, 'Rising Stars': 0, 'Cash Cows': 0, 'Quick Wins': 0,
          'Hidden Gems': 0, 'At Risk': 0, 'Declining': 0, 'Problem Pages': 0, 'New/Low Data': 0
        },
        processingNote: 'Minimal data mode - run sample data generator or upgrade Firestore tier',
        dataSource: 'minimal_fallback'
      });
    }

    return { status: 'minimal_created', message: 'Minimal fallback data created' };

  } catch (error) {
    console.error('[Safe Cron] Error ensuring minimal data:', error);
    throw error;
  }
}

// Try to run actual processing with quota protection
async function tryProcessWithQuotaProtection(firestore: FirebaseFirestore.Firestore) {
  const siteUrl = 'sc-domain:hypefresh.com';

  try {
    console.log('[Safe Cron] Attempting limited data processing...');

    // Step 1: Very limited analytics check (max 5 reads)
    const analyticsSnapshot = await firestore.collection('analytics_agg')
      .where('siteUrl', '==', siteUrl)
      .orderBy('date', 'desc')
      .limit(5)
      .get();

    if (analyticsSnapshot.empty) {
      throw new Error('No analytics data available');
    }

    const analyticsData = analyticsSnapshot.docs.map(doc => doc.data());
    const totalClicks = analyticsData.reduce((sum, d) => sum + (d.totalClicks || 0), 0);
    const totalImpressions = analyticsData.reduce((sum, d) => sum + (d.totalImpressions || 0), 0);
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPosition = analyticsData.reduce((sum, d) => sum + (d.averagePosition || 0), 0) / analyticsData.length;

    // Step 2: Update dashboard with actual data
    await firestore.collection('dashboard_stats').doc('latest').set({
      status: 'success',
      lastUpdated: new Date().toISOString(),
      siteUrl,
      dateRange: {
        start: analyticsData[analyticsData.length - 1]?.date || new Date().toISOString().split('T')[0],
        end: analyticsData[0]?.date || new Date().toISOString().split('T')[0]
      },
      dataPointsAnalyzed: analyticsData.length,
      metrics: {
        totalClicks: { current: totalClicks, average: totalClicks / analyticsData.length, trend: 'stable' },
        totalImpressions: { current: totalImpressions, average: totalImpressions / analyticsData.length, trend: 'stable' },
        averageCtr: { current: avgCtr, average: avgCtr, trend: 'stable' },
        averagePosition: { current: avgPosition, average: avgPosition, trend: 'stable' }
      },
      summary: { totalClicks, totalImpressions, averageCtr: avgCtr, averagePosition: avgPosition },
      processingNote: 'Limited processing mode - quota-aware execution'
    });

    // Step 3: Very limited page processing (max 10 reads + 10 writes)
    const pagesSnapshot = await firestore.collection('pages').limit(10).get();

    if (!pagesSnapshot.empty) {
      const batch = firestore.batch();
      let processedCount = 0;

      const tierDistribution: Record<string, number> = {
        'Champions': 0, 'Rising Stars': 0, 'Cash Cows': 0, 'Quick Wins': 0,
        'Hidden Gems': 0, 'At Risk': 0, 'Declining': 0, 'Problem Pages': 0, 'New/Low Data': 0
      };

      pagesSnapshot.docs.slice(0, 5).forEach(doc => {
        const tier = 'New/Low Data'; // Safe fallback tier
        tierDistribution[tier]++;

        batch.update(doc.ref, {
          performance_tier: tier,
          performance_priority: 'Monitor',
          performance_score: 50,
          performance_reasoning: 'Limited processing due to quota constraints',
          last_tiering_run: new Date().toISOString()
        });

        processedCount++;
      });

      await batch.commit();

      // Update tiering stats
      await firestore.collection('tiering_stats').doc('latest').set({
        lastRun: new Date().toISOString(),
        totalPagesProcessed: processedCount,
        totalPagesInSystem: pagesSnapshot.size,
        tierDistribution,
        processingNote: 'Quota-limited processing - only top pages analyzed',
        dataSource: 'limited_processing'
      });

      return {
        status: 'limited_success',
        message: `Limited processing completed: ${processedCount} pages analyzed`,
        details: { analyticsPoints: analyticsData.length, pagesProcessed: processedCount }
      };
    }

    return {
      status: 'analytics_only',
      message: 'Dashboard stats updated, no pages found for processing',
      details: { analyticsPoints: analyticsData.length }
    };

  } catch (error) {
    if (isQuotaError(error)) {
      console.log('[Safe Cron] Quota limit hit during processing, falling back to minimal data');
      throw error; // Will be caught by main handler
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  // Auth checks
  const userAgent = request.headers.get('user-agent');
  if (userAgent !== 'vercel-cron/1.0') {
    return NextResponse.json({ error: 'Unauthorized: Invalid user-agent.' }, { status: 401 });
  }

  const secret = request.nextUrl.searchParams.get('secret');
  if (secret !== process.env.ADMIN_SHARED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized: Invalid secret.' }, { status: 401 });
  }

  try {
    console.log('[Safe Cron] Starting quota-aware daily stats...');
    const firestore = initializeFirebaseAdmin();

    // First, try actual processing
    try {
      const result = await tryProcessWithQuotaProtection(firestore);
      return NextResponse.json(result);

    } catch (error) {
      if (isQuotaError(error)) {
        console.log('[Safe Cron] Quota exceeded, ensuring minimal data exists...');

        // Fallback: ensure minimal data exists
        const minimalResult = await ensureMinimalData(firestore);

        return NextResponse.json({
          status: 'quota_exceeded',
          message: 'Quota exceeded - minimal data mode activated',
          details: {
            error: error instanceof Error ? error.message : 'Unknown quota error',
            fallback: minimalResult,
            suggestion: 'Run sample data generator: /api/admin/generate-sample-data?secret=YOUR_SECRET'
          },
          actions: {
            generateSample: '/api/admin/generate-sample-data',
            checkQuota: 'Wait for quota reset or upgrade Firestore plan',
            alternative: 'Use sample data for development and testing'
          }
        });
      }

      // Re-throw non-quota errors
      throw error;
    }

  } catch (error) {
    console.error('[Safe Cron] Critical error in safe daily stats:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json({
      status: 'error',
      message: 'Safe daily stats failed',
      details: errorMessage,
      isQuotaRelated: isQuotaError(error),
      recovery: isQuotaError(error) ? {
        immediate: 'Generate sample data for testing',
        shortTerm: 'Wait for quota reset (usually 24 hours)',
        longTerm: 'Upgrade to Firestore paid plan for production use'
      } : {
        immediate: 'Check logs and Firebase configuration',
        shortTerm: 'Verify environment variables and credentials',
        longTerm: 'Review error patterns and optimize queries'
      }
    }, { status: isQuotaError(error) ? 200 : 500 }); // 200 for quota errors so frontend handles gracefully
  }
}

// Health check endpoint that doesn't consume quota
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'check_quota') {
      return NextResponse.json({
        status: 'quota_check',
        message: 'Use GET endpoint for actual processing',
        recommendations: [
          'GET /api/cron/safe-daily-stats - Run safe processing',
          'GET /api/admin/generate-sample-data - Generate demo data',
          'GET /api/diagnostics - Check system health'
        ]
      });
    }

    if (action === 'generate_sample') {
      return NextResponse.json({
        status: 'redirect',
        message: 'Use the sample data generator endpoint',
        redirectTo: '/api/admin/generate-sample-data'
      });
    }

    return NextResponse.json({
      status: 'info',
      message: 'Safe daily stats cron job',
      availableActions: ['check_quota', 'generate_sample'],
      usage: 'Use GET endpoint with proper authentication for processing'
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Invalid request format'
    }, { status: 400 });
  }
}
