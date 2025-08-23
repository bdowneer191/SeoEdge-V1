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
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    // This is a server configuration error. The cron secret is not set.
    console.error('[Cron Job] CRON_SECRET environment variable is not set.');
    return NextResponse.json({ error: 'Internal Server Error: Cron secret not configured.' }, { status: 500 });
  }

  if (secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized: Invalid secret.' }, { status: 401 });
  }

  try {
    // 2. Calculate yesterday's date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const year = yesterday.getFullYear();
    const month = String(yesterday.getMonth() + 1).padStart(2, '0');
    const day = String(yesterday.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    const siteUrl = 'sc-domain:hypefresh.com';

    // 3. Run the ingestion service
    console.log(`[Cron Job] Starting GSC data ingestion for ${siteUrl} for date ${formattedDate}.`);
    const ingestionService = new GSCIngestionService();

    // Await the ingestion process, as this is a background job
    await ingestionService.ingestData(siteUrl, formattedDate, formattedDate);

    console.log(`[Cron Job] GSC ingestion job completed successfully for ${siteUrl}.`);

    // 4. Return a success response
    return NextResponse.json({
      status: 'success',
      message: `Ingestion job completed for ${formattedDate}.`,
    });

  } catch (error) {
    console.error('[Cron Job] GSC ingestion job failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({
      status: 'error',
      message: 'Ingestion job failed.',
      details: errorMessage
    }, { status: 500 });
  }
}
