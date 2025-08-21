#!/usr/bin/env ts-node

import { Command } from 'commander';
import { AggregationService } from './AggregationService';

const program = new Command();

program
  .name('aggregation-cli')
  .description('Computes daily aggregates from gsc_raw data and saves them to analytics_agg collection.')
  .requiredOption('--date <date>', 'The date to process in YYYY-MM-DD format')
  .action(async (options) => {
    const { date } = options;
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new Error('Date must be in YYYY-MM-DD format.');
      }
      
      const aggregationService = new AggregationService();
      await aggregationService.aggregateData(date);
      process.exit(0);
    } catch (error) {
      console.error('❌ An error occurred during aggregation:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);