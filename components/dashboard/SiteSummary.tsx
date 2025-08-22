'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ICONS } from '@/components/icons';

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

// Updated StatCard to accept an icon
const StatCard = ({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 flex items-center space-x-4">
    <div className="bg-gray-700 p-3 rounded-full">
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
    </div>
  </div>
);

const StatCardSkeleton = () => (
  <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse flex items-center space-x-4">
    <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
    <div className="flex-1">
      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      <div className="h-8 bg-gray-700 rounded w-1/2 mt-2"></div>
    </div>
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

  // R3: Skeleton loader state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-900/50 text-red-300 p-4 rounded-lg">Error: {error}</div>;
  }

  return (
    <>
      {/* R4: Render four StatCard components with icons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Clicks" value={summary?.totalClicks.toLocaleString() ?? 'N/A'} icon={ICONS.CLICKS} />
        <StatCard title="Total Impressions" value={summary?.totalImpressions.toLocaleString() ?? 'N/A'} icon={ICONS.IMPRESSIONS} />
        <StatCard title="Average CTR" value={summary ? `${(summary.averageCtr * 100).toFixed(2)}%` : 'N/A'} icon={ICONS.CTR} />
        <StatCard title="Average Position" value={summary ? summary.averagePosition.toFixed(1) : 'N/A'} icon={ICONS.POSITION} />
      </div>

      {/* R5 & Styling Guide: Render LineChart */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-8 h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
            <YAxis tick={{ fill: '#9ca3af' }} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', border: '1px solid #4b5563', color: '#e5e7eb' }} />
            <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
            <Line type="monotone" dataKey="clicks" stroke="#6a5acd" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Clicks" />
            <Line type="monotone" dataKey="impressions" stroke="#8a7aff" strokeWidth={2} dot={false} name="Impressions" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default SiteSummary;