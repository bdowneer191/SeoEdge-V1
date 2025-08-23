import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GSCIngestionService } from '@/services/ingestion/GSCIngestionService';

export const dynamic = 'force-dynamic';

/**
 * API route for Vercel Cron Jobs to trigger GSC data ingestion.
 * This endpoint is protected by a secret token.
 */
export async function GET(request: NextRequest) {
  // 1. Authenticate the request
  const userAgent = request.headers.get('user-agent');
  if (userAgent !== 'vercel-cron/1.0') {
    // This check ensures the request is coming from Vercel's cron service.
    return NextResponse.json({ error: 'Unauthorized: Invalid user-agent.' }, { status: 401 });
  }

  const secret = request.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.ADMIN_SHARED_SECRET;

  if (!cronSecret) {
    // This is a server configuration error. The cron secret is not set.
    console.error('[Cron Job] ADMIN_SHARED_SECRET environment variable is not set.');
    return NextResponse.json({ error: 'Internal Server Error: Cron secret not configured.' }, { status: 500 });
  }

  if (secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized: Invalid secret.' }, { status: 401 });
  }

  try {
    const testStartDate = '2025-08-22';
    const testEndDate = '2025-08-22';
    const searchTypes = ['web', 'image', 'video', 'news'];
    const siteUrl = 'sc-domain:hypefresh.com';

    console.log(`[Cron Job] Starting specific test for date: ${testStartDate}`);

    const ingestionService = new GSCIngestionService();

    for (const searchType of searchTypes) {
      console.log(`[Cron Job] --- Fetching '${searchType}' data... ---`);
      await ingestionService.ingestData(siteUrl, testStartDate, testEndDate, searchType);
    }

    console.log(`[Cron Job] GSC ingestion test completed successfully for all search types.`);

    return NextResponse.json({
      status: 'success',
      message: `Ingestion test completed for all search types for date ${testStartDate}.`,
    });

  } catch (error) {
    console.error('[Cron Job] GSC ingestion test failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({
      status: 'error',
      message: 'Ingestion test failed.',
      details: errorMessage
    }, { status: 500 });
  }
}
