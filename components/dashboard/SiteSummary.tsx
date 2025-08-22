'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// R1: Define TypeScript interfaces
interface SiteMetric {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SummaryStats {
  totalClicks: number;
  totalImpressions: number;
  averageCtr: number;
  averagePosition: number;
}

// R5: Create a reusable StatCard sub-component
const StatCard = ({ title, value }: { title: string; value: string | number }) => (
  <div className="bg-gray-800 rounded-lg p-6">
    <h3 className="text-sm font-medium text-gray-400">{title}</h3>
    <p className="mt-2 text-3xl font-bold text-white">{value}</p>
  </div>
);

const SiteSummary: React.FC = () => {
  // R3: Use useState for loading, error, and success states
  const [data, setData] = useState<SiteMetric[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [summary, setSummary] = useState<SummaryStats | null>(null);

  // R2: useEffect to fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 28);

        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        const response = await fetch(`/api/metrics/site?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const result: SiteMetric[] = await response.json();
        setData(result);

        // R4: Calculate summary statistics
        if (result.length > 0) {
          const totalClicks = result.reduce((acc, item) => acc + item.clicks, 0);
          const totalImpressions = result.reduce((acc, item) => acc + item.impressions, 0);
          const totalCtr = result.reduce((acc, item) => acc + item.ctr, 0);
          const totalPosition = result.reduce((acc, item) => acc + item.position, 0);

          setSummary({
            totalClicks,
            totalImpressions,
            averageCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
            averagePosition: result.length > 0 ? totalPosition / result.length : 0,
          });
        }

      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // R3: Loading state
  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  // R3: Error state
  if (error) {
    return <div className="text-red-500">Error: {error.message}</div>;
  }

  // R3: Success state
  return (
    <div>
      {/* Styling guide: Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Clicks" value={summary?.totalClicks.toLocaleString() ?? 'N/A'} />
        <StatCard title="Total Impressions" value={summary?.totalImpressions.toLocaleString() ?? 'N/A'} />
        <StatCard title="Average CTR" value={`${summary?.averageCtr.toFixed(2) ?? '0.00'}%`} />
        <StatCard title="Average Position" value={summary?.averagePosition.toFixed(1) ?? 'N/A'} />
      </div>

      {/* Styling guide: Line Chart */}
      <div className="bg-gray-800 rounded-lg p-6 mt-8 h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="date" tick={{ fill: '#d1d5db' }} />
            <YAxis yAxisId="left" tick={{ fill: '#d1d5db' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#d1d5db' }} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none' }} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#3b82f6" name="Clicks" />
            <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="#22c55e" name="Impressions" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SiteSummary;