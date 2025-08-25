'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ICONS } from '@/components/icons';
import { AlertCircle } from 'lucide-react';

// --- Interfaces ---
interface SiteMetric {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface DashboardStats {
  lastUpdated: string;
  forecast: {
    totalClicks: { value: number }[];
    totalImpressions: { value: number }[];
    averageCtr: { value: number }[];
    averagePosition: { value: number }[];
  };
  anomalies: {
    totalClicks: { isAnomaly: boolean };
    totalImpressions: { isAnomaly: boolean };
    averageCtr: { isAnomaly: boolean };
    averagePosition: { isAnomaly: boolean };
  };
}

// --- Sub-components ---
const StatCard = ({ title, value, icon, forecastValue, isAnomaly, benchmarkValue }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  forecastValue: string | number;
  isAnomaly: boolean;
  benchmarkValue: string;
}) => (
  <div className={`bg-gray-800 border border-gray-700 rounded-xl p-4 ${isAnomaly ? 'border-red-500' : ''}`}>
    <div className="flex items-center space-x-4">
      <div className="bg-gray-700 p-3 rounded-full">{icon}</div>
      <div>
        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
        <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      </div>
      {isAnomaly && <AlertCircle className="w-5 h-5 text-red-500 ml-auto" />}
    </div>
    <div className="mt-4 text-xs text-gray-400">
      <p>30-Day Forecast: <span className="font-semibold text-gray-200">{forecastValue}</span></p>
      <p>{benchmarkValue}</p>
    </div>
  </div>
);

const StatCardSkeleton = () => (
  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 animate-pulse">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>
    <div className="mt-4 h-4 bg-gray-700 rounded w-full"></div>
    <div className="mt-2 h-4 bg-gray-700 rounded w-3/4"></div>
  </div>
);

// --- Main Component ---
const SiteSummary: React.FC = () => {
  const [historicalData, setHistoricalData] = useState<SiteMetric[] | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - 28);

        // Fetch both historical data and dashboard stats in parallel
        const [historicalRes, statsRes] = await Promise.all([
          fetch(`/api/metrics/site?startDate=${formatDate(startDate)}&endDate=${formatDate(endDate)}`),
          fetch(`/api/dashboard-stats`)
        ]);

        if (!historicalRes.ok) throw new Error(`API Error (metrics): ${historicalRes.statusText}`);
        if (!statsRes.ok) {
            const errorData = await statsRes.json();
            throw new Error(errorData.error || `API Error (stats): ${statsRes.statusText}`);
        }

        const historicalResult: SiteMetric[] = await historicalRes.json();
        const statsResult: DashboardStats = await statsRes.json();

        setHistoricalData(historicalResult);
        setDashboardStats(statsResult);

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
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-8 h-96 animate-pulse"></div>
      </>
    );
  }

  if (error) {
    return <div className="bg-red-900/50 text-red-300 p-4 rounded-lg">Error: {error}</div>;
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clicks"
          value={historicalData?.reduce((sum, item) => sum + item.clicks, 0).toLocaleString() ?? 'N/A'}
          icon={ICONS.CLICKS}
          isAnomaly={dashboardStats?.anomalies.totalClicks.isAnomaly ?? false}
          forecastValue={dashboardStats?.forecast.totalClicks[0]?.value.toLocaleString(undefined, {maximumFractionDigits: 0}) ?? 'N/A'}
          benchmarkValue="vs. Industry Avg."
        />
        <StatCard
          title="Total Impressions"
          value={historicalData?.reduce((sum, item) => sum + item.impressions, 0).toLocaleString() ?? 'N/A'}
          icon={ICONS.IMPRESSIONS}
          isAnomaly={dashboardStats?.anomalies.totalImpressions.isAnomaly ?? false}
          forecastValue={dashboardStats?.forecast.totalImpressions[0]?.value.toLocaleString(undefined, {maximumFractionDigits: 0}) ?? 'N/A'}
          benchmarkValue="vs. Industry Avg."
        />
        <StatCard
          title="Average CTR"
          value={historicalData ? `${(historicalData.reduce((sum, item) => sum + item.ctr, 0) / historicalData.length * 100).toFixed(2)}%` : 'N/A'}
          icon={ICONS.CTR}
          isAnomaly={dashboardStats?.anomalies.averageCtr.isAnomaly ?? false}
          forecastValue={dashboardStats?.forecast.averageCtr[0] ? `${(dashboardStats.forecast.averageCtr[0].value * 100).toFixed(2)}%` : 'N/A'}
          benchmarkValue="vs. Industry Avg."
        />
        <StatCard
          title="Average Position"
          value={historicalData ? `${(historicalData.reduce((sum, item) => sum + item.position, 0) / historicalData.length).toFixed(1)}` : 'N/A'}
          icon={ICONS.POSITION}
          isAnomaly={dashboardStats?.anomalies.averagePosition.isAnomaly ?? false}
          forecastValue={dashboardStats?.forecast.averagePosition[0]?.value.toFixed(1) ?? 'N/A'}
          benchmarkValue="vs. Industry Avg."
        />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-8 h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
            <YAxis yAxisId="left" tick={{ fill: '#6a5acd' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8a7aff' }} />
            <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', border: '1px solid #4b5563', color: '#e5e7eb' }} />
            <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
            <Line yAxisId="left" type="monotone" dataKey="clicks" stroke="#6a5acd" strokeWidth={2} dot={false} activeDot={{ r: 6 }} name="Clicks" />
            <Line yAxisId="right" type="monotone" dataKey="impressions" stroke="#8a7aff" strokeWidth={2} dot={false} name="Impressions" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default SiteSummary;