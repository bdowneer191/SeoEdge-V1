'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/dashboard/Header';
import SiteSummary from '@/components/dashboard/SiteSummary';
import SimplePagesTable from '@/components/dashboard/SimplePagesTable';
import TrafficHealthScore from '@/components/dashboard/TrafficHealthScore';
import PerformanceTiersSummary from '@/components/dashboard/PerformanceTiersSummary';

interface DashboardData {
  siteSummary?: {
    dashboardStats?: any;
  };
  losingPages?: any[];
  winningPages?: any[];
  error?: string;
  hint?: string;
}

export default function HomePage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard-stats');
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch dashboard data');
        }

        setDashboardData(data);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        setError(errorMessage);
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <>
        <Header />
        <div className="space-y-8 animate-pulse">
          <div className="h-96 bg-gray-800 rounded-lg flex items-center justify-center">
            <div className="text-gray-400 text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p>Loading dashboard...</p>
            </div>
          </div>
          <div className="h-64 bg-gray-800 rounded-lg"></div>
          <div className="h-96 bg-gray-800 rounded-lg"></div>
          <div className="h-96 bg-gray-800 rounded-lg"></div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="text-center py-10 space-y-4">
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Dashboard Error</h2>
            <p className="text-red-300 mb-4">Error: {error}</p>

            {dashboardData?.hint && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded p-4 mb-4">
                <p className="text-blue-300 text-sm">{dashboardData.hint}</p>
              </div>
            )}

            <div className="space-y-2 text-sm text-gray-400">
              <p><strong>Possible solutions:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-left">
                <li>Run the GSC ingestion cron job first</li>
                <li>Run the daily stats cron job to generate analytics</li>
                <li>Check if your Firebase credentials are configured correctly</li>
                <li>Verify that data exists in your Firestore database</li>
              </ul>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    );
  }

  // Safety checks for data structure
  const siteSummaryData = dashboardData?.siteSummary || {};
  const dashboardStats = siteSummaryData.dashboardStats || {};
  const losingPages = dashboardData?.losingPages || [];
  const winningPages = dashboardData?.winningPages || [];

  // Check if we have minimal required data
  const hasBasicData = dashboardStats && Object.keys(dashboardStats).length > 0;

  if (!hasBasicData) {
    return (
      <>
        <Header />
        <div className="text-center py-10 space-y-4">
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-6 max-w-2xl mx-auto">
            <h2 className="text-xl font-semibold text-yellow-400 mb-2">No Data Available</h2>
            <p className="text-yellow-300 mb-4">Dashboard data is empty or incomplete.</p>

            <div className="space-y-2 text-sm text-gray-400">
              <p><strong>To get started:</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-left">
                <li>First run GSC data ingestion</li>
                <li>Then run the daily stats generation</li>
                <li>Wait a few minutes for data processing</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          </div>
        </div>
      </>
    );
  }

  const losingPagesColumns = [
    { header: 'Impression Change', accessor: 'impressionChange', format: (v: number) => `${(v * 100).toFixed(1)}%` },
    { header: 'Recent Impressions', accessor: 'impressions1' },
    { header: 'Past Impressions', accessor: 'impressions2' },
  ];

  const winningPagesColumns = [
    { header: 'Clicks', accessor: 'clicks' },
    { header: 'Impressions', accessor: 'impressions' },
  ];

  return (
    <>
      <Header />
      <div className="space-y-8">
        <SiteSummary data={siteSummaryData} />
        <PerformanceTiersSummary />
        <TrafficHealthScore data={dashboardStats} />
        <SimplePagesTable
          title="Top 50 Losing Pages"
          pages={losingPages}
          columns={losingPagesColumns}
        />
        <SimplePagesTable
          title="Top 50 Winning Pages"
          pages={winningPages}
          columns={winningPagesColumns}
        />
      </div>
    </>
  );
}
