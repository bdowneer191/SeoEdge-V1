import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ingestGscData } from '../../../../../../services/ingestion/gsc-ingestor';

/**
 * API route handler to trigger the GSC data ingestion process.
 * This endpoint should be protected by an authentication mechanism.
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { siteUrl, startDate, endDate } = body;

        if (!siteUrl || !startDate || !endDate) {
            return NextResponse.json({ error: 'Missing required parameters: siteUrl, startDate, endDate.' }, { status: 400 });
        }
    
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
            return NextResponse.json({ error: 'Dates must be in YYYY-MM-DD format.' }, { status: 400 });
        }

        // Using a try-catch block for the service invocation
        try {
            // Running this async, but not awaiting it, to avoid long-running serverless function timeouts.
            // For production, this should be moved to a background job queue (e.g., Google Cloud Tasks).
            ingestGscData(siteUrl, startDate, endDate)
              .then(() => {
                console.log(`GSC ingestion job completed successfully for ${siteUrl}.`);
              })
              .catch((error) => {
                console.error(`GSC ingestion job failed for ${siteUrl}:`, error);
              });
        
            return NextResponse.json({ message: 'GSC ingestion process started successfully.' }, { status: 202 });

        } catch (error) {
            console.error('Failed to start GSC ingestion process:', error);
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
            return NextResponse.json({ error: 'Failed to start ingestion process.', details: errorMessage }, { status: 500 });
        }

    } catch (jsonError) {
        return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
}
