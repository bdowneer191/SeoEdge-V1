// app/api/admin/migrate-urls/route.ts - Emergency fix for URL document IDs
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseConfig';

export const dynamic = 'force-dynamic';

// Sanitize URL for Firestore document ID
function sanitizeUrlForFirestore(url: string): string {
  if (!url) return '';

  return url
    .replace(/^https?:\/\//, '') // Remove protocol
    .replace(/\//g, '__') // Replace slashes with double underscore
    .replace(/[#?&=]/g, '_') // Replace other problematic characters
    .replace(/_{3,}/g, '__') // Clean up multiple underscores
    .replace(/^_+|_+$/g, ''); // Trim leading/trailing underscores
}

/**
 * Emergency migration route to fix document IDs with double slashes
 * Call this once to migrate your existing data
 * URL: GET /api/admin/migrate-urls?secret=your_admin_secret
 */
export async function GET(request: NextRequest) {
  try {
    // Simple authentication
    const secret = request.nextUrl.searchParams.get('secret');
    if (secret !== process.env.ADMIN_SHARED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔧 Starting emergency URL migration...');
    const firestore = initializeFirebaseAdmin();

    // Step 1: Get problematic analytics data and collect unique pages
    const analyticsSnapshot = await firestore.collection('analytics')
      .limit(1000) // Process in batches to avoid timeouts
      .get();

    const uniquePages = new Set<string>();
    const siteUrls = new Set<string>();

    analyticsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.page) {
        uniquePages.add(data.page);
      }
      if (data.siteUrl) {
        siteUrls.add(data.siteUrl);
      }
    });

    console.log(`Found ${uniquePages.size} unique pages in analytics data`);

    // Step 2: Create or update pages with sanitized IDs
    const batch = firestore.batch();
    let processed = 0;
    const samplePages = Array.from(uniquePages).slice(0, 50); // Process first 50 for safety

    for (const pageUrl of samplePages) {
      try {
        const sanitizedId = sanitizeUrlForFirestore(pageUrl);

        // Skip if sanitized ID is too short or empty
        if (sanitizedId.length < 3) {
          console.log(`Skipping invalid URL: ${pageUrl}`);
          continue;
        }

        const pageRef = firestore.collection('pages').doc(sanitizedId);

        // Check if document already exists
        const existingDoc = await pageRef.get();

        const pageData = {
          url: pageUrl, // Original URL
          originalUrl: pageUrl, // Store original for reference
          title: `Page: ${pageUrl.split('/').pop() || 'Untitled'}`,
          siteUrl: Array.from(siteUrls)[0] || 'sc-domain:hypefresh.com', // Use first site URL
          created_at: existingDoc.exists ? existingDoc.data()?.created_at : new Date().toISOString(),
          updated_at: new Date().toISOString(),
          migration_source: 'url_fix_2024'
        };

        if (existingDoc.exists) {
          // Update existing document
          batch.update(pageRef, {
            ...pageData,
            ...existingDoc.data(), // Keep existing data
            originalUrl: pageUrl, // Ensure original URL is stored
            updated_at: new Date().toISOString()
          });
        } else {
          // Create new document
          batch.set(pageRef, pageData);
        }

        processed++;

        if (processed % 10 === 0) {
          console.log(`Processed ${processed} pages...`);
        }

      } catch (error) {
        console.error(`Error processing page ${pageUrl}:`, error);
        continue;
      }
    }

    // Commit the batch
    if (processed > 0) {
      await batch.commit();
      console.log(`✅ Migration completed. Processed ${processed} pages.`);
    }

    // Step 3: Create a basic tiering stats document to prevent dashboard errors
    try {
      await firestore.collection('tiering_stats').doc('latest').set({
        lastRun: new Date().toISOString(),
        totalPagesProcessed: processed,
        tierDistribution: {
          'Champions': 0,
          'Rising Stars': 0,
          'Cash Cows': 0,
          'Quick Wins': 0,
          'Hidden Gems': 0,
          'At Risk': 0,
          'Declining': 0,
          'Problem Pages': 0,
          'New/Low Data': processed
        },
        migrationStatus: 'urls_migrated'
      });
      console.log('✅ Created initial tiering stats');
    } catch (error) {
      console.log('⚠️ Could not create tiering stats:', error.message);
    }

    return NextResponse.json({
      status: 'success',
      message: `Migration completed successfully. Processed ${processed} pages.`,
      details: {
        pagesProcessed: processed,
        totalPagesFound: uniquePages.size,
        sampleSize: samplePages.length,
        nextSteps: [
          'Run the daily stats cron job to populate performance tiers',
          'Check the performance dashboard',
          'Run full migration if needed'
        ]
      }
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      solution: 'Check the logs and try running with a smaller batch size'
    }, { status: 500 });
  }
}

/**
 * Alternative POST route for manual triggers or testing
 */
export async function POST(request: NextRequest) {
  try {
    const { secret, batchSize = 20 } = await request.json();

    if (secret !== process.env.ADMIN_SHARED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create some sample data for testing
    const firestore = initializeFirebaseAdmin();
    const samplePages = [
      {
        url: 'https://hypefresh.com/',
        title: 'Homepage',
        tier: 'Cash Cows'
      },
      {
        url: 'https://hypefresh.com/about',
        title: 'About Page',
        tier: 'Stable'
      },
      {
        url: 'https://hypefresh.com/blog/sample-post',
        title: 'Sample Blog Post',
        tier: 'Quick Wins'
      }
    ];

    const batch = firestore.batch();

    for (const page of samplePages.slice(0, batchSize)) {
      const sanitizedId = sanitizeUrlForFirestore(page.url);
      const pageRef = firestore.collection('pages').doc(sanitizedId);

      batch.set(pageRef, {
        ...page,
        originalUrl: page.url,
        siteUrl: 'sc-domain:hypefresh.com',
        created_at: new Date().toISOString(),
        performance_tier: page.tier,
        performance_priority: 'Monitor',
        performance_score: 50 + Math.floor(Math.random() * 50),
        last_tiering_run: new Date().toISOString()
      });
    }

    await batch.commit();

    return NextResponse.json({
      status: 'success',
      message: `Created ${samplePages.length} sample pages for testing`
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
