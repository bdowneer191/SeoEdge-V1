import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * API route handler to get pages with performance tiers.
 * URL: /api/pages/tiers?tier=<tier_name>
 * @param {NextRequest} request The incoming request object.
 * @returns {NextResponse} A response containing the list of pages or an error.
 */
export async function GET(request: NextRequest) {
  try {
    const firestore = initializeFirebaseAdmin();
    const { searchParams } = new URL(request.url);
    const tier = searchParams.get('tier');
    const days = searchParams.get('days');

    let query: FirebaseFirestore.Query = firestore.collection('pages');

    if (tier) {
      query = query.where('performance_tier', '==', tier);
    }

    if (days) {
      const numDays = parseInt(days, 10);
      if (!isNaN(numDays)) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - numDays);
        query = query.where('last_tiering_run', '>=', startDate.toISOString());
      }
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return NextResponse.json([], { status: 200 });
    }

    const pages = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        url: data.url,
        title: data.title,
        performance_tier: data.performance_tier,
        performance_reason: data.performance_reason,
      };
    });

    return NextResponse.json(pages, { status: 200 });

  } catch (error) {
    console.error('Error fetching pages by tier:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to fetch pages.', details: errorMessage }, { status: 500 });
  }
}
