// app/api/pages/losses/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * Queries the pre-aggregated analytics collection to get the total number of clicks
 * for a site within a specific date range.
 * @param firestore The Firestore database instance.
 * @param siteUrl The URL of the site to query for.
 * @param startDate The start date of the period in YYYY-MM-DD format.
 * @param endDate The end date of the period in YYYY-MM-DD format.
 * @returns A promise that resolves to the total number of clicks.
 */
async function getTotalClicksForPeriod(firestore: admin.firestore.Firestore, siteUrl: string, startDate: string, endDate: string): Promise<number> {
  const snapshot = await firestore.collection('analytics_agg')
    .where('siteUrl', '==', siteUrl)
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .select('totalClicks')
    .get();

  if (snapshot.empty) {
    return 0;
  }

  let totalClicks = 0;
  snapshot.docs.forEach(doc => {
    totalClicks += doc.data().totalClicks as number;
  });
  
  return totalClicks;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteUrl = searchParams.get('siteUrl');
    const currentStartDate = searchParams.get('currentStartDate');
    const currentEndDate = searchParams.get('currentEndDate');
    const previousStartDate = searchParams.get('previousStartDate');
    const previousEndDate = searchParams.get('previousEndDate');

    if (!siteUrl || !currentStartDate || !currentEndDate || !previousStartDate || !previousEndDate) {
      return NextResponse.json({ error: 'Missing one or more required parameters: siteUrl, currentStartDate, currentEndDate, previousStartDate, previousEndDate.' }, { status: 400 });
    }

    const firestore = initializeFirebaseAdmin();

    const [currentClicks, previousClicks] = await Promise.all([
      getTotalClicksForPeriod(firestore, siteUrl, currentStartDate, currentEndDate),
      getTotalClicksForPeriod(firestore, siteUrl, previousStartDate, previousEndDate),
    ]);

    const changePercentage = previousClicks === 0
      ? (currentClicks > 0 ? 100.0 : 0.0)
      : ((currentClicks - previousClicks) / previousClicks) * 100;

    const response = {
      previousClicks,
      currentClicks,
      changePercentage,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Error fetching site-wide click losses:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to fetch site-wide click losses.', details: errorMessage }, { status: 500 });
  }
}
