'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/dashboard/Header';
import SiteSummary from '@/components/dashboard/SiteSummary';
import SimplePagesTable from '@/components/dashboard/SimplePagesTable';
import TrafficHealthScore from '@/components/dashboard/TrafficHealthScore';
import PerformanceTiersSummary from '@/components/dashboard/PerformanceTiersSummary';

export default function HomePage() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/dashboard-stats');
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to fetch dashboard data');
        }
        const data = await res.json();
        setDashboardData(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    // A more sophisticated skeleton loader would be better for UX
    return (
        <>
            <Header />
            <div className="space-y-8 animate-pulse">
                <div className="h-96 bg-gray-800 rounded-lg"></div>
                <div className="h-64 bg-gray-800 rounded-lg"></div>
                <div className="h-96 bg-gray-800 rounded-lg"></div>
                <div className="h-96 bg-gray-800 rounded-lg"></div>
            </div>
        </>
    );
  }

  if (error) {
    return (
        <div className="text-center py-10">
            <p className="text-red-500">Error: {error}</p>
        </div>
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
        <SiteSummary data={dashboardData.siteSummary} />
        <PerformanceTiersSummary />
        <TrafficHealthScore data={dashboardData.siteSummary.dashboardStats} />
        <SimplePagesTable title="Top 50 Losing Pages" pages={dashboardData.losingPages} columns={losingPagesColumns} />
        <SimplePagesTable title="Top 50 Winning Pages" pages={dashboardData.winningPages} columns={winningPagesColumns} />
      </div>
    </>
  );
}
