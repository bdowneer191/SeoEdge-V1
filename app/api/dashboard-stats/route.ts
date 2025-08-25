import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';

export const dynamic = 'force-dynamic';

/**
 * API route handler to get the pre-calculated dashboard stats.
 * This is a highly efficient endpoint that reads a single document.
 * URL: /api/dashboard-stats
 */
export async function GET() {
  try {
    const firestore = initializeFirebaseAdmin();
    const docRef = firestore.collection('dashboard_stats').doc('latest');
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Latest dashboard stats not found. Please run the daily cron job.' }, { status: 404 });
    }

    return NextResponse.json(doc.data(), { status: 200 });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to fetch dashboard stats.', details: errorMessage }, { status: 500 });
  }
}
