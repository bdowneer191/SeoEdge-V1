// app/api/pages/tiers/route.ts - Updated to handle sanitized URLs safely
import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseConfig';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

// Helper function to get original URL from document
function getOriginalUrlFromPageDoc(doc: any): string {
  const data = doc.data();
  // Try multiple ways to get the original URL
  return data?.originalUrl || data?.url || doc.id.replace(/__/g, '/');
}

/**
 * Enhanced API route handler with URL sanitization support
 */
export async function GET(request: NextRequest) {
  try {
    const firestore = initializeFirebaseAdmin();
    const { searchParams } = new URL(request.url);

    const tier = searchParams.get('tier');
    const priority = searchParams.get('priority');
    const includeSummary = searchParams.get('summary') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // If summary is requested
    if (includeSummary) {
      try {
        // Try to get existing tiering stats
        const statsDoc = await firestore.collection('tiering_stats').doc('latest').get();

        if (statsDoc.exists) {
          const statsData = statsDoc.data();
          const distribution = statsData?.tierDistribution || {};
          const totalPages = Object.values(distribution).reduce((sum: number, count: any) => sum + count, 0);

          const summary = {
            lastRun: statsData?.lastRun || new Date().toISOString(),
            totalPages,
            distribution,
            priorityBreakdown: {
              critical: 0,
              high: 0,
              medium: 0,
              low: 0,
              monitor: totalPages
            },
            keyInsights: [
              {
                type: 'opportunity',
                message: 'pages ready for analysis',
                count: totalPages,
                impact: 'Run the daily stats cron job to generate insights'
              }
            ],
            recommendations: [
              {
                priority: 'High',
                action: 'Run the enhanced daily stats cron job',
                pagesAffected: totalPages,
                estimatedImpact: 'Generate actionable performance insights',
                timeframe: 'Now'
              }
            ]
          };

          return NextResponse.json({ summary }, { status: 200 });
        } else {
          // No stats exist, create a placeholder
          const pagesSnapshot = await firestore.collection('pages').limit(1).get();
          const hasPages = !pagesSnapshot.empty;

          const summary = {
            lastRun: new Date().toISOString(),
            totalPages: hasPages ? 1 : 0,
            distribution: hasPages ? { 'New/Low Data': 1 } : {},
            priorityBreakdown: { critical: 0, high: 0, medium: 0, low: 0, monitor: hasPages ? 1 : 0 },
            keyInsights: hasPages ? [
              {
                type: 'opportunity',
                message: 'pages found but not yet analyzed',
                count: 1,
                impact: 'Run daily stats cron job to generate performance tiers'
              }
            ] : [
              {
                type: 'risk',
                message: 'No pages found',
                count: 0,
                impact: 'Run GSC ingestion first, then the migration'
              }
            ],
            recommendations: hasPages ? [
              {
                priority: 'High',
                action: 'Initialize performance tiering',
                pagesAffected: 1,
                estimatedImpact: 'Generate first performance insights',
                timeframe: 'Run cron job now'
              }
            ] : [
              {
                priority: 'Critical',
                action: 'Set up data pipeline',
                pagesAffected: 0,
                estimatedImpact: 'Enable performance tracking',
                timeframe: 'Run GSC ingestion first'
              }
            ]
          };

          return NextResponse.json({ summary }, { status: 200 });
        }
      } catch (error) {
        console.error('Error generating summary:', error);
        return NextResponse.json({
          summary: {
            lastRun: new Date().toISOString(),
            totalPages: 0,
            distribution: {},
            priorityBreakdown: { critical: 0, high: 0, medium: 0, low: 0, monitor: 0 },
            keyInsights: [{
              type: 'risk',
              message: 'Error loading data',
              count: 0,
              impact: 'Run the migration script to fix data issues'
            }],
            recommendations: [{
              priority: 'Critical',
              action: 'Fix data structure issues',
              pagesAffected: 0,
              estimatedImpact: 'Enable performance tracking',
              timeframe: 'Run migration API'
            }]
          }
        }, { status: 200 });
      }
    }

    // Build query for pages
    let query: FirebaseFirestore.Query = firestore.collection('pages');

    if (tier) {
      query = query.where('performance_tier', '==', tier);
    }

    if (priority) {
      query = query.where('performance_priority', '==', priority);
    }

    // Only include recent pages to avoid stale data
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 30); // 30 days to be more inclusive

    try {
      query = query.where('last_tiering_run', '>=', weekAgo.toISOString());
    } catch (error) {
      console.log('Note: last_tiering_run filter not available, showing all pages');
    }

    const snapshot = await query.limit(limit).get();

    if (snapshot.empty) {
      return NextResponse.json([], { status: 200 });
    }

    const pages = snapshot.docs.map(doc => {
      const data = doc.data();
      const originalUrl = getOriginalUrlFromPageDoc(doc);

      return {
        url: originalUrl, // Use original URL for display
        title: data.title || `Page: ${originalUrl.split('/').pop() || 'Untitled'}`,
        performance_tier: data.performance_tier || 'New/Low Data',
        performance_score: data.performance_score || 0,
        performance_priority: data.performance_priority || 'Monitor',
        performance_reasoning: data.performance_reasoning || 'Waiting for analysis',
        marketing_action: data.marketing_action || 'Monitor performance and gather data',
        technical_action: data.technical_action || 'Ensure basic SEO health',
        expected_impact: data.expected_impact || 'Data collection phase',
        timeframe: data.timeframe || 'Next analysis cycle',
        confidence: data.confidence || 0.5,
        metrics: data.metrics,
        last_tiering_run: data.last_tiering_run || '',
        // Add some calculated fields for better UX
        monthlyClicksPotential: data.metrics?.recent?.totalClicks ?
          Math.round(data.metrics.recent.totalClicks * (30 / 28)) : null,
        improvementPotential: 'Analysis needed',
        urgencyScore: data.performance_priority === 'Critical' ? 90 :
                     data.performance_priority === 'High' ? 70 : 50,
        competitiveThreat: 'Low' as const
      };
    });

    return NextResponse.json(pages, { status: 200 });

  } catch (error) {
    console.error('Error fetching enhanced page tiers:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';

    // Return a helpful error response
    return NextResponse.json({
      error: 'Failed to fetch page performance tiers.',
      details: errorMessage,
      solution: 'Try running the migration API first: /api/admin/migrate-urls?secret=your_secret'
    }, { status: 500 });
  }
}
