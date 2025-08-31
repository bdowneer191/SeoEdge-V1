import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GSCIngestionService } from '@/services/ingestion/GSCIngestionService';

export const dynamic = 'force-dynamic';

/**
 * API route for Vercel Cron Jobs to trigger smart analytics.
 * This job identifies pages with significant traffic loss.
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
    console.log(`[Cron Job] Starting smart analytics for ${siteUrl}`);

    const ingestionService = new GSCIngestionService();
    await ingestionService.runSmartAnalytics(siteUrl);

    console.log(`[Cron Job] Smart analytics completed successfully for ${siteUrl}.`);

    return NextResponse.json({
      status: 'success',
      message: `Smart analytics completed for ${siteUrl}.`,
    });

  } catch (error) {
    console.error('[Cron Job] Smart analytics failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({
      status: 'error',
      message: 'Smart analytics failed.',
      details: errorMessage
    }, { status: 500 });
  }
}
