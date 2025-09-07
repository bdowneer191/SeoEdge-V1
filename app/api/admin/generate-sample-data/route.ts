import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseConfig';

export const dynamic = 'force-dynamic';

function sanitizeUrlForFirestore(url: string): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\//, '')
    .replace(/\//g, '__')
    .replace(/[#?&=]/g, '_')
    .replace(/_{3,}/g, '__')
    .replace(/^_+|_+$/g, '');
}

// Sample pages with realistic performance data
const SAMPLE_PAGES = [
  {
    url: 'https://hypefresh.com/',
    title: 'HypeFresh - Latest Fashion Trends',
    tier: 'Champions',
    clicks: 1250,
    impressions: 35000,
    ctr: 0.036,
    position: 3.2
  },
  {
    url: 'https://hypefresh.com/sneakers',
    title: 'Latest Sneaker Releases | HypeFresh',
    tier: 'Cash Cows',
    clicks: 890,
    impressions: 28000,
    ctr: 0.032,
    position: 4.1
  },
  {
    url: 'https://hypefresh.com/streetwear',
    title: 'Streetwear Collection - Premium Fashion',
    tier: 'Rising Stars',
    clicks: 450,
    impressions: 12000,
    ctr: 0.038,
    position: 5.8
  },
  {
    url: 'https://hypefresh.com/jordan-releases',
    title: 'Air Jordan Release Calendar',
    tier: 'Quick Wins',
    clicks: 180,
    impressions: 8500,
    ctr: 0.021,
    position: 7.2
  },
  {
    url: 'https://hypefresh.com/nike-dunk',
    title: 'Nike Dunk Low Collection',
    tier: 'Hidden Gems',
    clicks: 95,
    impressions: 2100,
    ctr: 0.045,
    position: 12.1
  },
  {
    url: 'https://hypefresh.com/adidas-yeezy',
    title: 'Adidas Yeezy Latest Drops',
    tier: 'At Risk',
    clicks: 65,
    impressions: 4500,
    ctr: 0.014,
    position: 15.3
  },
  {
    url: 'https://hypefresh.com/supreme-drops',
    title: 'Supreme Weekly Drops Guide',
    tier: 'Declining',
    clicks: 25,
    impressions: 1200,
    ctr: 0.021,
    position: 18.7
  },
  {
    url: 'https://hypefresh.com/vintage-tees',
    title: 'Vintage T-Shirt Collection',
    tier: 'New/Low Data',
    clicks: 12,
    impressions: 450,
    ctr: 0.027,
    position: 22.1
  },
  {
    url: 'https://hypefresh.com/style-guide',
    title: 'How to Style Streetwear - Complete Guide',
    tier: 'Quick Wins',
    clicks: 230,
    impressions: 15000,
    ctr: 0.015,
    position: 8.9
  },
  {
    url: 'https://hypefresh.com/brand-reviews',
    title: 'Fashion Brand Reviews and Ratings',
    tier: 'Cash Cows',
    clicks: 675,
    impressions: 22000,
    ctr: 0.031,
    position: 6.4
  }
];

function getTierInfo(tier: string) {
  const tierMap = {
    'Champions': {
      priority: 'Monitor',
      score: 85,
      marketing: 'Amplify success - create similar content, promote more',
      technical: 'Maintain current optimization, monitor for technical issues',
      reasoning: 'Strong performer with high clicks and excellent CTR'
    },
    'Cash Cows': {
      priority: 'Medium',
      score: 70,
      marketing: 'Maintain content freshness, add internal links',
      technical: 'Monitor for position changes, maintain technical health',
      reasoning: 'High visibility with stable performance'
    },
    'Rising Stars': {
      priority: 'High',
      score: 75,
      marketing: 'Double down on promotion, create content series',
      technical: 'Optimize for featured snippets, improve page speed',
      reasoning: 'Growing traffic with strong upward trend'
    },
    'Quick Wins': {
      priority: 'High',
      score: 60,
      marketing: 'Rewrite title tags and meta descriptions, A/B test',
      technical: 'Implement structured data, optimize for featured snippets',
      reasoning: 'High impressions but low CTR - optimization opportunity'
    },
    'Hidden Gems': {
      priority: 'Medium',
      score: 65,
      marketing: 'Build more backlinks, create supporting content',
      technical: 'Target additional long-tail keywords, improve internal linking',
      reasoning: 'High CTR but low visibility - hidden potential'
    },
    'At Risk': {
      priority: 'High',
      score: 35,
      marketing: 'Content audit, competitor analysis, refresh content strategy',
      technical: 'Check for technical issues, review recent algorithm updates',
      reasoning: 'Declining performance - needs immediate attention'
    },
    'Declining': {
      priority: 'Critical',
      score: 25,
      marketing: 'Complete content overhaul, new keyword targeting',
      technical: 'Full technical SEO audit, check for penalties',
      reasoning: 'Strong declining trend with high confidence'
    },
    'New/Low Data': {
      priority: 'Monitor',
      score: 40,
      marketing: 'Continue monitoring, consider content promotion',
      technical: 'Verify indexing, basic SEO optimization',
      reasoning: 'Limited data - monitoring for patterns'
    }
  };

  return tierMap[tier] || tierMap['New/Low Data'];
}

/**
 * Generate sample performance data when quota is exhausted
 * GET /api/admin/generate-sample-data?secret=your_secret
 */
export async function GET(request: NextRequest) {
  try {
    const secret = request.nextUrl.searchParams.get('secret');
    if (secret !== process.env.ADMIN_SHARED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🎭 Generating sample performance data for free tier demo...');
    const firestore = initializeFirebaseAdmin();

    // Step 1: Create sample pages
    const batch = firestore.batch();

    for (const page of SAMPLE_PAGES) {
      const sanitizedId = sanitizeUrlForFirestore(page.url);
      const tierInfo = getTierInfo(page.tier);
      const pageRef = firestore.collection('pages').doc(sanitizedId);

      batch.set(pageRef, {
        url: page.url,
        originalUrl: page.url,
        title: page.title,
        siteUrl: 'sc-domain:hypefresh.com',
        performance_tier: page.tier,
        performance_priority: tierInfo.priority,
        performance_score: tierInfo.score + Math.floor(Math.random() * 10),
        performance_reasoning: tierInfo.reasoning,
        marketing_action: tierInfo.marketing,
        technical_action: tierInfo.technical,
        expected_impact: `+${Math.floor(page.clicks * 0.2)} potential monthly clicks`,
        timeframe: page.tier === 'Critical' ? 'Immediate' : '2-4 weeks',
        confidence: 0.7 + Math.random() * 0.2,
        last_tiering_run: new Date().toISOString(),
        metrics: {
          recent: {
            totalClicks: page.clicks,
            totalImpressions: page.impressions,
            averageCtr: page.ctr,
            averagePosition: page.position
          },
          baseline: {
            totalClicks: Math.floor(page.clicks * 0.9),
            totalImpressions: Math.floor(page.impressions * 0.95),
            averageCtr: page.ctr * 0.95,
            averagePosition: page.position + 0.5
          },
          change: {
            clicks: (page.clicks / (page.clicks * 0.9) - 1),
            impressions: (page.impressions / (page.impressions * 0.95) - 1),
            ctr: (page.ctr / (page.ctr * 0.95) - 1),
            position: (page.position - (page.position + 0.5)) / (page.position + 0.5)
          }
        },
        created_at: new Date().toISOString()
      });
    }

    await batch.commit();

    // Step 2: Create tier distribution stats
    const tierDistribution = SAMPLE_PAGES.reduce((acc, page) => {
      acc[page.tier] = (acc[page.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    await firestore.collection('tiering_stats').doc('latest').set({
      lastRun: new Date().toISOString(),
      totalPagesProcessed: SAMPLE_PAGES.length,
      totalPagesInSystem: SAMPLE_PAGES.length,
      tierDistribution,
      processingNote: 'Sample data generated for free tier demo - showing realistic fashion/streetwear site performance',
      dataSource: 'generated_sample'
    });

    // Step 3: Create sample dashboard stats
    const totalClicks = SAMPLE_PAGES.reduce((sum, p) => sum + p.clicks, 0);
    const totalImpressions = SAMPLE_PAGES.reduce((sum, p) => sum + p.impressions, 0);
    const avgCtr = totalClicks / totalImpressions;
    const avgPosition = SAMPLE_PAGES.reduce((sum, p) => sum + p.position, 0) / SAMPLE_PAGES.length;

    await firestore.collection('dashboard_stats').doc('latest').set({
      status: 'success',
      lastUpdated: new Date().toISOString(),
      siteUrl: 'sc-domain:hypefresh.com',
      dateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      },
      dataPointsAnalyzed: 7,
      metrics: {
        totalClicks: {
          current: totalClicks,
          average: totalClicks / 7,
          trend: 'up',
          change: 0.05
        },
        totalImpressions: {
          current: totalImpressions,
          average: totalImpressions / 7,
          trend: 'stable',
          change: 0.02
        },
        averageCtr: {
          current: avgCtr,
          average: avgCtr,
          trend: 'up',
          change: 0.08
        },
        averagePosition: {
          current: avgPosition,
          average: avgPosition,
          trend: 'up',
          change: -0.03
        }
      },
      summary: {
        totalClicks,
        totalImpressions,
        averageCtr: avgCtr,
        averagePosition: avgPosition
      },
      processingNote: 'Sample data showing typical fashion/streetwear site metrics - generated for free tier demo'
    });

    // Step 4: Create sample analytics aggregation data for the last week
    const analyticsBatch = firestore.batch();
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dailyVariation = 0.8 + Math.random() * 0.4; // 80% - 120% daily variation

      const analyticsRef = firestore.collection('analytics_agg').doc(`${dateStr}_sample`);
      analyticsBatch.set(analyticsRef, {
        date: dateStr,
        siteUrl: 'sc-domain:hypefresh.com',
        totalClicks: Math.floor(totalClicks * dailyVariation / 7),
        totalImpressions: Math.floor(totalImpressions * dailyVariation / 7),
        averageCtr: avgCtr * dailyVariation,
        averagePosition: avgPosition + (Math.random() - 0.5) * 2,
        dataSource: 'generated_sample'
      });
    }

    await analyticsBatch.commit();

    return NextResponse.json({
      status: 'success',
      message: `Generated sample performance data for ${SAMPLE_PAGES.length} pages`,
      details: {
        pagesCreated: SAMPLE_PAGES.length,
        tierDistribution,
        totalClicks,
        totalImpressions,
        averageCtr: (avgCtr * 100).toFixed(2) + '%',
        note: 'This is sample data for demonstration. Real data will be generated when quotas allow.'
      },
      nextSteps: [
        'Visit /performance to see the sample data',
        'Sample data includes realistic fashion/streetwear site metrics',
        'Replace with real data when Firestore quotas reset or upgrade to paid tier'
      ]
    });

  } catch (error) {
    console.error('❌ Sample data generation failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to generate sample data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
