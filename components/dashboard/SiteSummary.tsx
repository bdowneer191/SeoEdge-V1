'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

const StatCard = ({ title, value }: { title: string; value: string | number }) => (
  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
    <p className="mt-2 text-3xl font-bold text-white">{value}</p>
  </div>
);

const StatCardSkeleton = () => (
  <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 animate-pulse">
    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
    <div className="h-8 bg-gray-700 rounded w-1/2 mt-3"></div>
  </div>
);

const SiteSummary: React.FC = () => {
  const [data, setData] = useState<SiteMetric[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryStats | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 28);
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        const response = await fetch(`/api/metrics/site?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`);
        if (!response.ok) {
          throw new Error(`API Error: ${response.statusText}`);
        }
        const result: SiteMetric[] = await response.json();
        setData(result);

        if (result.length > 0) {
          const totalClicks = result.reduce((acc, item) => acc + item.clicks, 0);
          const totalImpressions = result.reduce((acc, item) => acc + item.impressions, 0);
          const weightedPositionSum = result.reduce((sum, item) => sum + (item.position * item.impressions), 0);

          setSummary({
            totalClicks,
            totalImpressions,
            averageCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) : 0,
            averagePosition: totalImpressions > 0 ? (weightedPositionSum / totalImpressions) : 0,
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="bg-gray-800 rounded-lg p-6 mt-8 h-96 border border-gray-700 animate-pulse"></div>
      </>
    );
  }

  if (error) {
    return <div className="bg-red-900/50 text-red-300 p-4 rounded-lg">Error: {error}</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Clicks" value={summary?.totalClicks.toLocaleString() ?? 'N/A'} />
        <StatCard title="Total Impressions" value={summary?.totalImpressions.toLocaleString() ?? 'N/A'} />
        <StatCard title="Average CTR" value={summary ? `${(summary.averageCtr * 100).toFixed(2)}%` : 'N/A'} />
        <StatCard title="Average Position" value={summary ? summary.averagePosition.toFixed(1) : 'N/A'} />
      </div>

      <div className="bg-gray-800 rounded-lg p-6 mt-8 h-96 border border-gray-700">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
            <YAxis tick={{ fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', border: '1px solid #4b5563', color: '#e5e7eb' }} />
            <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
            <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Clicks" />
            <Line type="monotone" dataKey="impressions" stroke="#22c55e" strokeWidth={2} dot={false} name="Impressions" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default SiteSummary;