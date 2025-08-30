// app/api/pages/tiers/route.ts - Enhanced version for better marketing insights
import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { getOriginalUrlFromPageDoc } from '@/utils/urlSanitizer';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

interface EnhancedPageData {
  url: string;
  title: string;
  performance_tier: string;
  performance_score: number;
  performance_priority: string;
  performance_reasoning: string;
  marketing_action: string;
  technical_action: string;
  expected_impact: string;
  timeframe: string;
  confidence: number;
  metrics?: {
    recent: {
      totalClicks: number;
      totalImpressions: number;
      averageCtr: number;
      averagePosition: number;
    };
    baseline: {
      totalClicks: number;
      totalImpressions: number;
      averageCtr: number;
      averagePosition: number;
    };
    kpis: {
      clicksChange: number;
      impressionsChange: number;
      ctrChange: number;
      positionChange: number;
      trendStrength: number;
    };
  };
  last_tiering_run: string;
}

interface TieringSummary {
  lastRun: string;
  totalPages: number;
  distribution: Record<string, number>;
  priorityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    monitor: number;
  };
  keyInsights: Array<{
    type: 'opportunity' | 'risk' | 'success';
    message: string;
    count: number;
    impact: string;
  }>;
  recommendations: Array<{
    priority: string;
    action: string;
    pagesAffected: number;
    estimatedImpact: string;
    timeframe: string;
  }>;
}

/**
 * Enhanced API route handler to get pages with performance tiers and marketing insights.
 * URL: /api/pages/tiers?tier=<tier>&priority=<priority>&summary=<bool>&limit=<number>
 */
export async function GET(request: NextRequest) {
  try {
    const firestore = initializeFirebaseAdmin();
    const { searchParams } = new URL(request.url);

    const tier = searchParams.get('tier');
    const priority = searchParams.get('priority');
    const includeSummary = searchParams.get('summary') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const sortBy = searchParams.get('sortBy') || 'performance_score'; // score, clicks, priority
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // If summary is requested, return tier statistics and insights
    if (includeSummary) {
      const summary = await getTieringSummary(firestore);
      return NextResponse.json({ summary }, { status: 200 });
    }

    // Build query for pages
    let query: FirebaseFirestore.Query = firestore.collection('pages');

    // Add filters
    if (tier) {
      query = query.where('performance_tier', '==', tier);
    }

    if (priority) {
      query = query.where('performance_priority', '==', priority);
    }

    // Only include pages that have been processed recently (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    query = query.where('last_tiering_run', '>=', weekAgo.toISOString());

    const snapshot = await query.limit(limit).get();

    if (snapshot.empty) {
      return NextResponse.json([], { status: 200 });
    }

    let pages: EnhancedPageData[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        url: getOriginalUrlFromPageDoc(doc),
        title: data.title || 'Untitled Page',
        performance_tier: data.performance_tier || 'Unknown',
        performance_score: data.performance_score || 0,
        performance_priority: data.performance_priority || 'Monitor',
        performance_reasoning: data.performance_reasoning || 'No analysis available',
        marketing_action: data.marketing_action || 'Monitor performance',
        technical_action: data.technical_action || 'Check basic SEO health',
        expected_impact: data.expected_impact || 'Unknown impact',
        timeframe: data.timeframe || 'TBD',
        confidence: data.confidence || 0,
        metrics: data.metrics,
        last_tiering_run: data.last_tiering_run || ''
      };
    });

    // Sort results
    pages.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'clicks':
          aValue = a.metrics?.recent?.totalClicks || 0;
          bValue = b.metrics?.recent?.totalClicks || 0;
          break;
        case 'priority':
          const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1, 'Monitor': 0 };
          aValue = priorityOrder[a.performance_priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.performance_priority as keyof typeof priorityOrder] || 0;
          break;
        case 'performance_score':
        default:
          aValue = a.performance_score;
          bValue = b.performance_score;
          break;
      }

      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    // Add enriched data for better decision making
    const enrichedPages = pages.map(page => ({
      ...page,
      // Add calculated fields for easier consumption
      monthlyClicksPotential: page.metrics?.recent ?
        Math.round(page.metrics.recent.totalClicks * (30 / 28)) : null,
      improvementPotential: calculateImprovementPotential(page),
      urgencyScore: calculateUrgencyScore(page),
      competitiveThreat: assessCompetitiveThreat(page)
    }));

    return NextResponse.json(enrichedPages, { status: 200 });

  } catch (error) {
    console.error('Error fetching enhanced page tiers:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({
      error: 'Failed to fetch page performance tiers.',
      details: errorMessage
    }, { status: 500 });
  }
}

async function getTieringSummary(firestore: FirebaseFirestore.Firestore): Promise<TieringSummary> {
  try {
    // Get summary stats from the tiering_stats collection
    const statsDoc = await firestore.collection('tiering_stats').doc('latest').get();

    if (!statsDoc.exists) {
      throw new Error('No tiering statistics found. Run the tiering job first.');
    }

    const statsData = statsDoc.data();
    const distribution = (statsData?.tierDistribution || {}) as Record<string, number>;
    const totalPages = Object.values(distribution).reduce((sum: number, count: number) => sum + count, 0);

    // Calculate priority breakdown by querying pages
    const prioritySnapshot = await firestore.collection('pages')
      .where('last_tiering_run', '>=', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .get();

    const priorityBreakdown = { critical: 0, high: 0, medium: 0, low: 0, monitor: 0 };

    prioritySnapshot.docs.forEach(doc => {
      const priority = doc.data().performance_priority?.toLowerCase() || 'monitor';
      if (priority in priorityBreakdown) {
        priorityBreakdown[priority as keyof typeof priorityBreakdown]++;
      }
    });

    // Generate insights
    const keyInsights = [];

    if (distribution['At Risk'] > 0) {
      keyInsights.push({
        type: 'risk' as const,
        message: 'Pages experiencing significant traffic decline',
        count: distribution['At Risk'],
        impact: 'High revenue impact if not addressed'
      });
    }

    if (distribution['Quick Wins'] > 0) {
      keyInsights.push({
        type: 'opportunity' as const,
        message: 'Easy optimization opportunities available',
        count: distribution['Quick Wins'],
        impact: 'Fast ROI with title/meta improvements'
      });
    }

    if (distribution['Champions'] > 0) {
      keyInsights.push({
        type: 'success' as const,
        message: 'High-performing pages to replicate',
        count: distribution['Champions'],
        impact: 'Template for scaling success'
      });
    }

    if (distribution['Rising Stars'] > 0) {
      keyInsights.push({
        type: 'opportunity' as const,
        message: 'Growing pages to amplify',
        count: distribution['Rising Stars'],
        impact: 'Momentum building opportunities'
      });
    }

    // Generate recommendations
    const recommendations = [];

    if (priorityBreakdown.critical > 0) {
      recommendations.push({
        priority: 'Critical',
        action: 'Immediate traffic loss prevention',
        pagesAffected: priorityBreakdown.critical,
        estimatedImpact: 'Prevent 15-40% traffic loss',
        timeframe: 'This week'
      });
    }

    if (distribution['Quick Wins'] > 3) {
      recommendations.push({
        priority: 'High',
        action: 'Batch optimize titles and meta descriptions',
        pagesAffected: distribution['Quick Wins'],
        estimatedImpact: '20-30% CTR improvement',
        timeframe: '2 weeks'
      });
    }

    if (distribution['Rising Stars'] > 0) {
      recommendations.push({
        priority: 'Medium',
        action: 'Scale successful content strategies',
        pagesAffected: distribution['Rising Stars'],
        estimatedImpact: '25-50% additional growth',
        timeframe: '1 month'
      });
    }

    return {
      lastRun: statsData?.lastRun || new Date().toISOString(),
      totalPages,
      distribution,
      priorityBreakdown,
      keyInsights,
      recommendations
    };

  } catch (error) {
    console.error('Error getting tiering summary:', error);
    throw error;
  }
}

function calculateImprovementPotential(page: EnhancedPageData): string {
  if (!page.metrics) return 'Unknown';

  const { recent } = page.metrics;
  const tier = page.performance_tier;

  if (tier === 'Quick Wins' && recent.totalImpressions > 1000) {
    const potentialClicks = recent.totalImpressions * (0.045 - recent.averageCtr);
    return `+${Math.round(potentialClicks)} clicks/month`;
  }

  if (tier === 'Hidden Gems' && recent.averagePosition <= 10) {
    return `+${Math.round(recent.totalImpressions * 0.02)} clicks/month`;
  }

  if (tier === 'Rising Stars') {
    const currentGrowth = page.metrics.kpis?.clicksChange || 0;
    return `+${Math.round(currentGrowth * 100 * 1.5)}% potential`;
  }

  return 'Monitor trends';
}

function calculateUrgencyScore(page: EnhancedPageData): number {
  let urgency = 0;

  // Priority contributes to urgency
  switch (page.performance_priority) {
    case 'Critical': urgency += 40; break;
    case 'High': urgency += 30; break;
    case 'Medium': urgency += 20; break;
    case 'Low': urgency += 10; break;
  }

  // Performance score affects urgency (lower score = more urgent)
  urgency += (100 - page.performance_score) * 0.3;

  // Confidence affects urgency (higher confidence = more urgent if it's bad news)
  if (page.performance_tier === 'At Risk' || page.performance_tier === 'Declining') {
    urgency += page.confidence * 20;
  }

  return Math.min(100, Math.round(urgency));
}

function assessCompetitiveThreat(page: EnhancedPageData): 'Low' | 'Medium' | 'High' {
  if (!page.metrics) return 'Low';

  const { recent, kpis } = page.metrics;

  // High threat if losing position and clicks
  if (kpis.positionChange > 0.1 && kpis.clicksChange < -0.15) {
    return 'High';
  }

  // Medium threat if position is declining but clicks stable
  if (kpis.positionChange > 0.05 || recent.averagePosition > 15) {
    return 'Medium';
  }

  return 'Low';
}
