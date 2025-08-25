import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GSCIngestionService } from '@/services/ingestion/GSCIngestionService';

export const dynamic = 'force-dynamic';

/**
 * API route for Vercel Cron Jobs to trigger daily GSC data ingestion.
 * This job fetches both the raw data and the daily summary.
 * This endpoint is protected by a secret token.
 */
export async function GET(request: NextRequest) {
  // 1. Authenticate the request
  const userAgent = request.headers.get('user-agent');
  if (userAgent !== 'vercel-cron/1.0') {
    return NextResponse.json({ error: 'Unauthorized: Invalid user-agent.' }, { status: 401 });
  }

  const secret = request.nextUrl.searchParams.get('secret');
  const cronSecret = process.env.ADMIN_SHARED_SECRET;

  if (!cronSecret) {
    console.error('[Cron Job] ADMIN_SHARED_SECRET environment variable is not set.');
    return NextResponse.json({ error: 'Internal Server Error: Cron secret not configured.' }, { status: 500 });
  }

  if (secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized: Invalid secret.' }, { status: 401 });
  }

  try {
    const siteUrl = 'sc-domain:hypefresh.com'; // In a multi-tenant app, this would be dynamic

    // GSC data is usually available after a 2-day delay. We'll fetch for 2 days ago.
    const dateToFetch = new Date();
    dateToFetch.setDate(dateToFetch.getDate() - 2);
    const formattedDate = dateToFetch.toISOString().split('T')[0];

    console.log(`[Cron Job] Starting daily GSC ingestion for ${siteUrl} for date: ${formattedDate}`);

    const ingestionService = new GSCIngestionService();

    // 1. Ingest the efficient daily summary for our dashboards
    console.log('[Cron Job] Ingesting daily summary...');
    await ingestionService.ingestDailySummary(siteUrl, formattedDate);

    // 2. Ingest the raw data for deep analysis (optional, could be removed if not needed)
    console.log('[Cron Job] Ingesting raw data for search type: web...');
    await ingestionService.ingestData(siteUrl, formattedDate, formattedDate, 'web');

    console.log(`[Cron Job] Daily GSC ingestion completed successfully for ${formattedDate}.`);

    return NextResponse.json({
      status: 'success',
      message: `Daily GSC ingestion completed for ${formattedDate}.`,
    });

  } catch (error) {
    console.error('[Cron Job] Daily GSC ingestion failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({
      status: 'error',
      message: 'Daily GSC ingestion failed.',
      details: errorMessage
    }, { status: 500 });
  }
}
