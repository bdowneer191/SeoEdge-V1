'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { ICONS } from '@/components/icons';
import { AlertCircle, CheckCircle } from 'lucide-react';

// --- Interfaces ---
interface TrendData {
  value: number;
}

interface AnomalyData {
  isAnomaly: boolean;
  message: string;
}

interface DashboardStats {
  lastUpdated: string;
  siteUrl: string;
  forecast: {
    totalClicks: TrendData[];
    totalImpressions: TrendData[];
    averageCtr: TrendData[];
    averagePosition: TrendData[];
  };
  anomalies: {
    totalClicks: AnomalyData;
    totalImpressions: AnomalyData;
    averageCtr: AnomalyData;
    averagePosition: AnomalyData;
  };
}

// --- Sub-components ---
const StatCard = ({ title, value, icon, trendData, anomalyData }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trendData?: TrendData[];
  anomalyData?: AnomalyData;
}) => (
  <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 flex flex-col justify-between">
    <div>
      <div className="flex items-center space-x-4">
        <div className="bg-gray-700 p-3 rounded-full">{icon}</div>
        <div>
          <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
          <p className="mt-1 text-3xl font-bold text-white">{value}</p>
        </div>
      </div>
      {anomalyData && (
        <div className={`mt-3 flex items-center text-xs ${anomalyData.isAnomaly ? 'text-yellow-400' : 'text-green-400'}`}>
          {anomalyData.isAnomaly ? <AlertCircle className="w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          <span>{anomalyData.message}</span>
        </div>
      )}
    </div>
    {trendData && (
      <div className="mt-4 h-16">
        <p className="text-xs text-gray-500 mb-1">30-Day Forecast</p>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData}>
            <Tooltip
              contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.9)', border: '1px solid #4b5563' }}
              labelStyle={{ color: '#9ca3af' }}
              itemStyle={{ color: '#8884d8' }}
            />
            <Line type="monotone" dataKey="value" stroke="#8884d8" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )}
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
    <div className="mt-3 h-4 bg-gray-700 rounded w-full"></div>
    <div className="mt-4 h-16 bg-gray-700 rounded"></div>
  </div>
);

// --- Main Component ---
const SiteSummary: React.FC = () => {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/dashboard-stats`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `API Error: ${response.statusText}`);
        }
        const result: DashboardStats = await response.json();
        setData(result);
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

  if (!data) {
    return <div className="text-center py-8 text-gray-400">No dashboard data available.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Clicks Forecast"
        value={data.forecast.totalClicks[0]?.value.toLocaleString(undefined, {maximumFractionDigits: 0}) ?? 'N/A'}
        icon={ICONS.CLICKS}
        trendData={data.forecast.totalClicks}
        anomalyData={data.anomalies.totalClicks}
      />
      <StatCard
        title="Impressions Forecast"
        value={data.forecast.totalImpressions[0]?.value.toLocaleString(undefined, {maximumFractionDigits: 0}) ?? 'N/A'}
        icon={ICONS.IMPRESSIONS}
        trendData={data.forecast.totalImpressions}
        anomalyData={data.anomalies.totalImpressions}
      />
      <StatCard
        title="CTR Forecast"
        value={data.forecast.averageCtr[0] ? `${(data.forecast.averageCtr[0].value * 100).toFixed(2)}%` : 'N/A'}
        icon={ICONS.CTR}
        trendData={data.forecast.averageCtr}
        anomalyData={data.anomalies.averageCtr}
      />
      <StatCard
        title="Position Forecast"
        value={data.forecast.averagePosition[0]?.value.toFixed(1) ?? 'N/A'}
        icon={ICONS.POSITION}
        trendData={data.forecast.averagePosition}
        anomalyData={data.anomalies.averagePosition}
      />
    </div>
  );
};

export default SiteSummary;