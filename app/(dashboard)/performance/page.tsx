import React from 'react';
import PagesListTable from '@/components/dashboard/PagesListTable';

export default function PerformancePage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        Page Performance Tiers
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        A detailed breakdown of your pages categorized by performance metrics.
      </p>
      <PagesListTable />
    </div>
  );
}
