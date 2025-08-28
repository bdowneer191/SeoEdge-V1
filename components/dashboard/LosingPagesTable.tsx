'use client';

import React, { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';

// Interface for the new API response
interface SiteWideChange {
  previousClicks: number;
  currentClicks: number;
  changePercentage: number;
}

// Sub-components
const StatCardSkeleton = () => (
  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 animate-pulse">
    <div className="h-8 bg-gray-700 rounded w-1/4 mb-2"></div>
    <div className="h-16 bg-gray-700 rounded w-1/2 mb-4"></div>
    <div className="h-6 bg-gray-700 rounded w-3/4"></div>
  </div>
);

// Main Component
const SiteWideStatCard: React.FC = () => {
  const [data, setData] = useState<SiteWideChange | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        const now = new Date();
        const currentEnd = new Date(now);
        const currentStart = new Date(now);
        currentStart.setDate(now.getDate() - 28);
        const previousEnd = new Date(currentStart);
        previousEnd.setDate(previousEnd.getDate() - 1);
        const previousStart = new Date(previousEnd);
        previousStart.setDate(previousEnd.getDate() - 28);

        const siteUrl = 'sc-domain:hypefresh.com';

        const params = new URLSearchParams({
          siteUrl,
          currentStartDate: formatDate(currentStart),
          currentEndDate: formatDate(currentEnd),
          previousStartDate: formatDate(previousStart),
          previousEndDate: formatDate(previousEnd),
        });

        const response = await fetch(`/api/pages/losses?${params}`);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const result: SiteWideChange = await response.json();
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const renderContent = () => {
    if (loading) {
      return <StatCardSkeleton />;
    }

    if (error) {
        return <div className="bg-red-900/50 text-red-300 p-4 rounded-lg">Error: {error}</div>;
    }

    if (!data) {
      return <div className="text-center py-8 text-gray-400">No data available.</div>;
    }

    let changeElement;
    const isPositive = data.changePercentage >= 0;
    const isNewActivity = data.previousClicks === 0 && data.currentClicks > 0;
    const isNoActivity = data.previousClicks === 0 && data.currentClicks === 0;

    if (isNoActivity) {
        changeElement = (
            <p className="text-5xl font-bold text-gray-500 mb-4">0%</p>
        );
    } else if (isNewActivity) {
        changeElement = (
            <div className="mb-4">
                <p className="text-5xl font-bold text-green-500">{data.currentClicks.toLocaleString()}</p>
                <p className="text-sm font-semibold text-green-500 -mt-2">New Clicks</p>
            </div>
        );
    } else {
        changeElement = (
            <p className={`text-5xl font-bold ${isPositive ? 'text-green-500' : 'text-red-500'} mb-4`}>
                {data.changePercentage.toFixed(1)}%
            </p>
        );
    }

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-gray-300">Click Change vs. Previous 28 Days</h3>
                {isPositive && !isNoActivity ? (
                    <ArrowUp className="w-5 h-5 text-green-500" />
                ) : (
                    !isNoActivity && <ArrowDown className="w-5 h-5 text-red-500" />
                )}
            </div>
            {changeElement}
            <div className="flex justify-between text-base text-gray-400">
                <span>Previous: {data.previousClicks.toLocaleString()}</span>
                <span>Current: {data.currentClicks.toLocaleString()}</span>
            </div>
        </div>
    );
  };

  return (
    <section>
      <h2 className='text-xl font-semibold text-white mb-4'>Site-Wide Click Change (Last 28 Days)</h2>
      {renderContent()}
    </section>
  );
};

export default SiteWideStatCard;