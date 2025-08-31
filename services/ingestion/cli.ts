#!/usr/bin/env ts-node

/**
 * CLI script for triggering GSC data ingestion.
 * Depends on the 'commander' package for argument parsing.
 */
import { Command } from 'commander';
import { GSCIngestionService } from './GSCIngestionService';

const program = new Command();

program
  .name('gsc-ingestion-cli')
  .description('Fetches Google Search Console data and saves it to Firestore.')
  .requiredOption('--siteUrl <url>', 'GSC property URL (e.g., "sc-domain:example.com")')
  .requiredOption('--startDate <date>', 'Start date in YYYY-MM-DD format')
  .requiredOption('--endDate <date>', 'End date in YYYY-MM-DD format')
  .action(async () => {
    console.log('This CLI tool for manual, raw GSC data ingestion is deprecated.');
    console.log('The ingestion process has been replaced by automated, lightweight cron jobs.');
    console.log('Please refer to the new cron job implementations in /app/api/cron.');
    process.exit(0);
  });

program.parse(process.argv);