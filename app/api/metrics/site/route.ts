import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseConfig';

export const dynamic = 'force-dynamic'; // Force dynamic rendering

interface SiteMetric {
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

/**
 * API route handler to get aggregated site metrics for a given date range.
 * URL: /api/metrics/site?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Missing required parameters: startDate, endDate.' }, { status: 400 });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return NextResponse.json({ error: 'Dates must be in YYYY-MM-DD format.' }, { status: 400 });
    }

    const firestore = initializeFirebaseAdmin();
    const snapshot = await firestore.collection('analytics_agg')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .orderBy('date', 'asc')
      .get();

    if (snapshot.empty) {
      return NextResponse.json([], { status: 200 });
    }

    const results: SiteMetric[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            date: data.date,
            clicks: data.totalClicks,
            impressions: data.totalImpressions,
            ctr: data.averageCtr,
            position: data.averagePosition,
        };
    });

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('Error fetching site metrics:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to fetch site metrics.', details: errorMessage }, { status: 500 });
  }
}
