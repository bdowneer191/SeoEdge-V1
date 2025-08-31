import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { GSCIngestionService } from '@/services/ingestion/GSCIngestionService';

/**
 * API route handler to trigger the GSC data ingestion process.
 * This endpoint should be protected by an authentication mechanism.
 */
export async function POST(request: NextRequest) {
    console.log('[GSC Ingestion] API route hit.');
    try {
        console.log('[GSC Ingestion] Parsing request body...');
        const body = await request.json();
        const { siteUrl, startDate, endDate } = body;

        if (!siteUrl || !startDate || !endDate) {
            return NextResponse.json({ error: 'Missing required parameters: siteUrl, startDate, endDate.' }, { status: 400 });
        }
    
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            return NextResponse.json({ error: 'Dates must be in YYYY-MM-DD format.' }, { status: 400 });
        }

        // The heavy, raw ingestion has been deprecated in favor of automated, lightweight cron jobs.
        // This endpoint is now a no-op to prevent breaking any existing integrations, but it does not trigger any ingestion.
        console.log(`[GSC Ingestion] Manual ingestion via POST is deprecated and will be removed. The process now runs on an automated cron schedule.`);
        return NextResponse.json({ message: 'Manual GSC ingestion is deprecated. Process is now automated.' }, { status: 200 });

    } catch (jsonError) {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
}
