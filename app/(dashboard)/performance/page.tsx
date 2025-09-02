import React from 'react';
import PagesListTable from '@/components/dashboard/PagesListTable';

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-white">
          Page Performance Tiers
        </h1>
        <p className="text-gray-400 mt-2">
          AI-powered analysis of your pages categorized by performance metrics and opportunities.
        </p>
      </div>

      {/* Performance Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Champions</div>
          <div className="text-2xl font-bold text-green-400">-</div>
          <div className="text-xs text-gray-500">High performing pages</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">At Risk</div>
          <div className="text-2xl font-bold text-red-400">-</div>
          <div className="text-xs text-gray-500">Need immediate attention</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">Opportunities</div>
          <div className="text-2xl font-bold text-yellow-400">-</div>
          <div className="text-xs text-gray-500">Quick wins available</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-400">New/Low Data</div>
          <div className="text-2xl font-bold text-blue-400">-</div>
          <div className="text-xs text-gray-500">Awaiting analysis</div>
        </div>
      </div>

      <PagesListTable />
    </div>
  );
}
