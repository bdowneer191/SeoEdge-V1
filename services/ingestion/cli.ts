#!/usr/bin/env ts-node

/**
 * CLI script for triggering GSC data ingestion.
 * Depends on the 'commander' package for argument parsing.
 */
import { process } from 'node:process';
import { Command } from 'commander';
import { GSCIngestionService } from './GSCIngestionService';

const program = new Command();

program
  .name('gsc-ingestion-cli')
  .description('Fetches Google Search Console data and saves it to Firestore.')
  .requiredOption('--siteUrl <url>', 'GSC property URL (e.g., "sc-domain:example.com")')
  .requiredOption('--startDate <date>', 'Start date in YYYY-MM-DD format')
  .requiredOption('--endDate <date>', 'End date in YYYY-MM-DD format')
  .action(async (options) => {
    const { siteUrl, startDate, endDate } = options;
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          throw new Error('Dates must be in YYYY-MM-DD format.');
      }
      
      const ingestionService = new GSCIngestionService();
      await ingestionService.ingestData(siteUrl, startDate, endDate);
      process.exit(0);
    } catch (error) {
      console.error('❌ An error occurred during ingestion:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);