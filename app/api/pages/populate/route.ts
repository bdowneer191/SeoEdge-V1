import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { sanitizeUrlForFirestore } from '@/utils/urlSanitizer';

export const dynamic = 'force-dynamic';

/**
 * API route handler to populate the 'pages' collection from existing 'gsc_raw' data.
 * This should be run once to initialize the pages list for the tiering job.
 * URL: /api/pages/populate
 */
export async function GET() {
  try {
    const firestore = initializeFirebaseAdmin();
    console.log('[Pages Population] Starting to populate pages from raw GSC data...');

    // Fetch all unique page URLs from the gsc_raw collection
    // Note: This requires a composite index on `page`.
    // Firestore might auto-generate this on-demand.
    const uniquePages = new Set<string>();
    const rawDataSnapshot = await firestore.collection('gsc_raw').get();

    if (rawDataSnapshot.empty) {
      return NextResponse.json({ message: 'No data found in gsc_raw to populate pages.' }, { status: 200 });
    }

    rawDataSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.page) {
        uniquePages.add(data.page);
      }
    });

    if (uniquePages.size === 0) {
      return NextResponse.json({ message: 'No pages found in gsc_raw to populate.' }, { status: 200 });
    }

    const batch = firestore.batch();
    const pagesCollectionRef = firestore.collection('pages');
    const now = new Date().toISOString();

    uniquePages.forEach(pageUrl => {
      const sanitizedUrl = sanitizeUrlForFirestore(pageUrl);
      const pageDocRef = pagesCollectionRef.doc(sanitizedUrl);
      batch.set(pageDocRef, {
        url: pageUrl,
        originalUrl: pageUrl,
        title: pageUrl.split('/').pop() || pageUrl, // Placeholder title
        siteUrl: 'sc-domain:hypefresh.com', // Replace with your actual site URL
        last_tiering_run: now
      }, { merge: true });
    });

    await batch.commit();

    console.log(`[Pages Population] Successfully created ${uniquePages.size} page documents.`);
    return NextResponse.json({
      status: 'success',
      message: `Successfully populated 'pages' collection with ${uniquePages.size} unique URLs.`
    }, { status: 200 });

  } catch (error) {
    console.error('Error populating pages collection:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({
      error: 'Failed to populate pages collection.',
      details: errorMessage
    }, { status: 500 });
  }
}
