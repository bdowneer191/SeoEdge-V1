import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AggregationService } from '@/services/aggregation/AggregationService';

export const dynamic = 'force-dynamic';

/**
 * API route for Vercel Cron Jobs to trigger daily data aggregation.
 * This endpoint is protected by a secret token.
 */
export async function GET(request: NextRequest) {
  // 1. Authenticate the request
  const userAgent = request.headers.get('user-agent');
  if (userAgent !== 'vercel-cron/1.0') {
    return NextResponse.json({ error: 'Unauthorized: Invalid user-agent.' }, { status: 401 });
  }

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.split(' ')[1];
  const cronSecret = process.env.ADMIN_SHARED_SECRET;

  if (!cronSecret) {
    console.error('[Cron Job] ADMIN_SHARED_SECRET environment variable is not set.');
    return NextResponse.json({ error: 'Internal Server Error: Cron secret not configured.' }, { status: 500 });
  }

  if (token !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized: Invalid token.' }, { status: 401 });
  }

  try {
    const aggregationDate = '2025-08-22';
    console.log(`[Cron Job] Starting aggregation for date: ${aggregationDate}.`);

    const aggregationService = new AggregationService();
    await aggregationService.aggregateData(aggregationDate);

    console.log(`[Cron Job] Aggregation job completed successfully for ${aggregationDate}.`);

    return NextResponse.json({
      status: 'success',
      message: `Aggregation job completed for ${aggregationDate}.`,
    });

  } catch (error) {
    console.error(`[Cron Job] Aggregation failed for date 2025-08-22:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({
      status: 'error',
      message: 'Aggregation job failed.',
      details: errorMessage
    }, { status: 500 });
  }
}
