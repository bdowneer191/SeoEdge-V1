import { NextApiRequest, NextApiResponse } from 'next';
import { GSCIngestionService } from '../../../services/ingestion/GSCIngestionService';

/**
 * API route to trigger the GSC data ingestion process.
 * This endpoint should be protected by an authentication mechanism (e.g., API key, session).
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // TODO: Add authentication/authorization checks here.
  
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { siteUrl, startDate, endDate } = req.body;

  if (!siteUrl || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing required parameters: siteUrl, startDate, endDate.' });
  }
  
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ error: 'Dates must be in YYYY-MM-DD format.' });
  }

  try {
    const ingestionService = new GSCIngestionService();
    // Running this async, but not awaiting it, to avoid long-running serverless function timeouts.
    // For production, this should be moved to a background job queue (e.g., Google Cloud Tasks).
    ingestionService.ingestData(siteUrl, startDate, endDate)
      .then(() => {
        console.log(`GSC ingestion job completed successfully for ${siteUrl}.`);
      })
      .catch((error) => {
        console.error(`GSC ingestion job failed for ${siteUrl}:`, error);
      });

    return res.status(202).json({ message: 'GSC ingestion process started successfully.' });
  } catch (error) {
    console.error('Failed to start GSC ingestion process:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return res.status(500).json({ error: 'Failed to start ingestion process.', details: errorMessage });
  }
}
