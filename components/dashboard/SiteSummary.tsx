'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ICONS } from '@/components/icons';
import { AlertCircle, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

// --- Interfaces ---
interface SiteMetric {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface SmartMetric {
  isAnomaly: boolean | null;
  message: string | null;
  trend: 'up' | 'down' | 'stable' | null;
  trendConfidence: number | null;
  thirtyDayForecast: number | null;
  benchmarks: {
    industry: number;
    historicalAvg: number;
  };
  recommendations: string[];
}

interface DashboardStats {
  status: 'success' | 'pending_data';
  lastUpdated: string;
  siteUrl: string;
  metrics: {
    totalClicks: SmartMetric;
    totalImpressions: SmartMetric;
    averageCtr: SmartMetric;
    averagePosition: SmartMetric;
  };
}

// --- Helper Functions ---
const getTrendIcon = (trend: 'up' | 'down' | 'stable' | null) => {
  switch (trend) {
    case 'up':
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    case 'down':
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    case 'stable':
      return <Minus className="w-4 h-4 text-gray-400" />;
    default:
      return null;
  }
};

const formatValue = (value: number, metricType: string) => {
  switch (metricType) {
    case 'ctr':
      return `${(value * 100).toFixed(2)}%`;
    case 'position':
      return value.toFixed(1);
    default:
      return value.toLocaleString();
  }
};

// --- Sub-components ---
const StatCard = ({
  title,
  value,
  icon,
  smartMetric,
  metricType
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  smartMetric: SmartMetric | null;
  metricType: string;
}) => {
  const [showRecommendations, setShowRecommendations] = useState(false);

  if (!smartMetric) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
        <div className="flex items-center space-x-4">
          <div className="bg-gray-700 p-3 rounded-full">{icon}</div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
            <p className="mt-1 text-3xl font-bold text-white">{value}</p>
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-400">
          <p>Collecting data...</p>
        </div>
      </div>
    );
  }

  const isAnomaly = smartMetric.isAnomaly === true;
  const trendIcon = getTrendIcon(smartMetric.trend);
  const confidencePercentage = smartMetric.trendConfidence ? Math.round(smartMetric.trendConfidence * 100) : null;

  return (
    <div
      className={`bg-gray-800 border rounded-xl p-4 relative transition-all duration-200 hover:shadow-lg ${
        isAnomaly ? 'border-red-500 shadow-red-500/20' : 'border-gray-700'
      }`}
      onMouseEnter={() => setShowRecommendations(true)}
      onMouseLeave={() => setShowRecommendations(false)}
    >
      {/* Header Section */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-full ${isAnomaly ? 'bg-red-500/20' : 'bg-gray-700'}`}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
          </div>
        </div>
        {isAnomaly && <AlertCircle className="w-5 h-5 text-red-500" />}
      </div>

      {/* Main Value */}
      <div className="mb-3">
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>

      {/* Trend Section */}
      {smartMetric.trend && (
        <div className="flex items-center space-x-2 mb-3">
          {trendIcon}
          <span className={`text-sm font-medium ${
            smartMetric.trend === 'up' ? 'text-green-500' :
            smartMetric.trend === 'down' ? 'text-red-500' : 'text-gray-400'
          }`}>
            {smartMetric.trend === 'stable' ? 'Stable' :
             smartMetric.trend === 'up' ? 'Trending Up' : 'Trending Down'}
          </span>
          {confidencePercentage && (
            <span className="text-xs text-gray-500">
              ({confidencePercentage}% confidence)
            </span>
          )}
        </div>
      )}

      {/* Forecast Section */}
      {smartMetric.thirtyDayForecast !== null && (
        <div className="mb-3">
          <p className="text-xs text-gray-400">
            30-Day Forecast: <span className="font-semibold text-gray-200">
              {formatValue(smartMetric.thirtyDayForecast, metricType)}
            </span>
          </p>
        </div>
      )}

      {/* Benchmarks Section */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Historical Avg:</span>
          <span className="text-gray-300">{formatValue(smartMetric.benchmarks.historicalAvg, metricType)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-500">Industry Avg:</span>
          <span className="text-gray-300">{formatValue(smartMetric.benchmarks.industry, metricType)}</span>
        </div>
      </div>

      {/* Status Message */}
      {smartMetric.message && (
        <div className="mt-3 p-2 bg-gray-700/50 rounded text-xs text-gray-300">
          {smartMetric.message}
        </div>
      )}

      {/* Recommendations Tooltip */}
      {showRecommendations && smartMetric.recommendations.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-gray-900 border border-gray-600 rounded-lg shadow-xl z-50">
          <div className="flex items-center space-x-2 mb-2">
            <Info className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-white">AI Recommendations</span>
          </div>
          <ul className="space-y-1">
            {smartMetric.recommendations.map((rec, index) => (
              <li key={index} className="text-xs text-gray-300 flex items-start">
                <span className="text-blue-400 mr-2">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const StatCardSkeleton = () => (
  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 animate-pulse">
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-gray-700 rounded-full"></div>
      <div className="flex-1">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-8 bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-3 bg-gray-700 rounded w-full"></div>
      <div className="h-3 bg-gray-700 rounded w-3/4"></div>
    </div>
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

  // Calculate current values from historical data
  const getCurrentValues = () => {
    if (!historicalData || historicalData.length === 0) {
      return {
        totalClicks: 'N/A',
        totalImpressions: 'N/A',
        averageCtr: 'N/A',
        averagePosition: 'N/A'
      };
    }

    const totalClicks = historicalData.reduce((sum, item) => sum + item.clicks, 0);
    const totalImpressions = historicalData.reduce((sum, item) => sum + item.impressions, 0);
    const avgCtr = historicalData.reduce((sum, item) => sum + item.ctr, 0) / historicalData.length;
    const avgPosition = historicalData.reduce((sum, item) => sum + item.position, 0) / historicalData.length;

    return {
      totalClicks: totalClicks.toLocaleString(),
      totalImpressions: totalImpressions.toLocaleString(),
      averageCtr: `${(avgCtr * 100).toFixed(2)}%`,
      averagePosition: avgPosition.toFixed(1)
    };
  };

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

  const currentValues = getCurrentValues();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Clicks"
          value={currentValues.totalClicks}
          icon={ICONS.CLICKS}
          smartMetric={dashboardStats?.metrics?.totalClicks || null}
          metricType="clicks"
        />
        <StatCard
          title="Total Impressions"
          value={currentValues.totalImpressions}
          icon={ICONS.IMPRESSIONS}
          smartMetric={dashboardStats?.metrics?.totalImpressions || null}
          metricType="impressions"
        />
        <StatCard
          title="Average CTR"
          value={currentValues.averageCtr}
          icon={ICONS.CTR}
          smartMetric={dashboardStats?.metrics?.averageCtr || null}
          metricType="ctr"
        />
        <StatCard
          title="Average Position"
          value={currentValues.averagePosition}
          icon={ICONS.POSITION}
          smartMetric={dashboardStats?.metrics?.averagePosition || null}
          metricType="position"
        />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-8 h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={historicalData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis yAxisId="left" tick={{ fill: '#6a5acd' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8a7aff' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(31, 41, 55, 0.9)',
                border: '1px solid #4b5563',
                color: '#e5e7eb'
              }}
            />
            <Legend wrapperStyle={{ color: '#e5e7eb' }}/>
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="clicks"
              stroke="#6a5acd"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              name="Clicks"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="impressions"
              stroke="#8a7aff"
              strokeWidth={2}
              dot={false}
              name="Impressions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default SiteSummary;