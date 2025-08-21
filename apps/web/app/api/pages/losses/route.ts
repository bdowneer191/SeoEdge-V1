import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as admin from 'firebase-admin';
import { Buffer } from 'node:buffer';

// --- Firebase Initialization ---
function initializeFirebase() {
  if (admin.apps.length > 0) {
    return admin.firestore();
  }

  const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
  if (!serviceAccountBase64) {
    throw new Error('FIREBASE_ADMIN_SDK_JSON_BASE64 env variable not set.');
  }
  const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('ascii');
  const serviceAccount = JSON.parse(serviceAccountJson);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  return admin.firestore();
}
// --- End Firebase Initialization ---

interface PageLoss {
  page: string;
  previousClicks: number;
  currentClicks: number;
  changePercentage: number;
}

/**
 * Fetches and aggregates clicks by page for a given date range.
 */
async function getAggregatedClicksByPage(firestore: admin.firestore.Firestore, startDate: string, endDate: string): Promise<Map<string, number>> {
  const snapshot = await firestore.collection('gsc_raw')
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .select('page', 'clicks')
    .get();
  
  const clicksMap = new Map<string, number>();
  if (snapshot.empty) {
    return clicksMap;
  }

  snapshot.docs.forEach(doc => {
    const data = doc.data();
    const page = data.page as string;
    const clicks = data.clicks as number;
    clicksMap.set(page, (clicksMap.get(page) || 0) + clicks);
  });
  
  return clicksMap;
}


/**
 * API route handler to find pages with significant traffic loss.
 * URL: /api/pages/losses?currentStartDate=...&currentEndDate=...&previousStartDate=...&previousEndDate=...&threshold=0.5
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const currentStartDate = searchParams.get('currentStartDate');
    const currentEndDate = searchParams.get('currentEndDate');
    const previousStartDate = searchParams.get('previousStartDate');
    const previousEndDate = searchParams.get('previousEndDate');
    const thresholdStr = searchParams.get('threshold');

    if (!currentStartDate || !currentEndDate || !previousStartDate || !previousEndDate || !thresholdStr) {
      return NextResponse.json({ error: 'Missing one or more required parameters.' }, { status: 400 });
    }

    const threshold = parseFloat(thresholdStr);
    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
        return NextResponse.json({ error: 'Threshold must be a number between 0 and 1.' }, { status: 400 });
    }

    const firestore = initializeFirebase();

    const [currentClicksMap, previousClicksMap] = await Promise.all([
      getAggregatedClicksByPage(firestore, currentStartDate, currentEndDate),
      getAggregatedClicksByPage(firestore, previousStartDate, previousEndDate),
    ]);

    const results: PageLoss[] = [];

    previousClicksMap.forEach((previousClicks, page) => {
      const currentClicks = currentClicksMap.get(page) || 0;
      
      if (previousClicks === 0) return; // Avoid division by zero, can't lose traffic if it was zero

      const change = (currentClicks - previousClicks) / previousClicks;
      
      // We are looking for a drop greater than the threshold
      if (change < 0 && Math.abs(change) > threshold) {
        results.push({
          page,
          previousClicks,
          currentClicks,
          changePercentage: change * 100,
        });
      }
    });

    // Sort by the largest drop
    results.sort((a, b) => a.changePercentage - b.changePercentage);

    return NextResponse.json(results, { status: 200 });

  } catch (error) {
    console.error('Error fetching page losses:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: 'Failed to fetch page losses.', details: errorMessage }, { status: 500 });
  }
}
