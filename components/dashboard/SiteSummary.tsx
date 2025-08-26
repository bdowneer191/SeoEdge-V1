'use client';

import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from 'recharts';
import { ICONS } from '@/components/icons';
import { AlertCircle, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

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
  status: string;
  lastUpdated: string;
  metrics: {
    totalClicks: SmartMetric;
    totalImpressions: SmartMetric;
    averageCtr: SmartMetric;
    averagePosition: SmartMetric;
  };
}

interface ChartData {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  forecastClicks?: number;
  forecastClicksUpper?: number;
  forecastClicksLower?: number;
  isForecast?: boolean;
}

// --- Helper Functions ---
const getTrendIcon = (trend: string | null, confidence: number | null) => {
  if (!trend || !confidence || confidence < 0.3) return <Minus className="w-4 h-4 text-gray-400" />;

  switch (trend) {
    case 'up':
      return <TrendingUp className={`w-4 h-4 ${confidence > 0.7 ? 'text-green-500' : 'text-green-400'}`} />;
    case 'down':
      return <TrendingDown className={`w-4 h-4 ${confidence > 0.7 ? 'text-red-500' : 'text-red-400'}`} />;
    default:
      return <Minus className="w-4 h-4 text-gray-400" />;
  }
};

const getTrendLabel = (trend: string | null, confidence: number | null) => {
  if (!trend || !confidence || confidence < 0.3) return 'Stable';

  const confidenceLevel = confidence > 0.7 ? 'High' : 'Medium';
  const trendLabel = trend === 'up' ? 'Rising' : trend === 'down' ? 'Declining' : 'Stable';

  return `${trendLabel} (${confidenceLevel} confidence)`;
};

const formatMetricValue = (key: string, value: number) => {
  switch (key) {
    case 'averageCtr':
      return `${(value * 100).toFixed(2)}%`;
    case 'averagePosition':
      return value.toFixed(1);
    default:
      return value.toLocaleString();
  }
};

const formatForecastValue = (key: string, value: number | null) => {
  if (value === null) return 'N/A';
  return formatMetricValue(key, value);
};

// --- Enhanced StatCard Component ---
const EnhancedStatCard = ({
  title,
  metricKey,
  currentValue,
  icon,
  smartMetric
}: {
  title: string;
  metricKey: string;
  currentValue: number;
  icon: React.ReactNode;
  smartMetric: SmartMetric;
}) => {
  const isAnomaly = smartMetric.isAnomaly === true;
  const hasReliableTrend = smartMetric.trendConfidence && smartMetric.trendConfidence > 0.3;

  return (
    <div className={`bg-gray-800 border rounded-xl p-4 transition-all duration-200 ${
      isAnomaly ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-gray-700'
    }`}>
      {/* Header with Icon and Anomaly Indicator */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <div className="bg-gray-700 p-2 rounded-lg">{icon}</div>
          <h3 className="text-sm font-medium text-gray-300 uppercase tracking-wider">{title}</h3>
        </div>
        {isAnomaly && <AlertCircle className="w-5 h-5 text-red-500" />}
      </div>

      {/* Main Value */}
      <div className="mb-3">
        <p className="text-2xl font-bold text-white">
          {formatMetricValue(metricKey, currentValue)}
        </p>
      </div>

      {/* Trend Information */}
      <div className="flex items-center space-x-2 mb-3">
        {getTrendIcon(smartMetric.trend, smartMetric.trendConfidence)}
        <span className="text-xs text-gray-400">
          {getTrendLabel(smartMetric.trend, smartMetric.trendConfidence)}
        </span>
        {smartMetric.trendConfidence && smartMetric.trendConfidence > 0.3 && (
          <span className="text-xs text-gray-500">
            ({Math.round(smartMetric.trendConfidence * 100)}%)
          </span>
        )}
      </div>

      {/* Forecast and Benchmark Info */}
      <div className="space-y-1 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>30-Day Forecast:</span>
          <span className="font-semibold text-gray-200">
            {formatForecastValue(metricKey, smartMetric.thirtyDayForecast)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>vs. Historical:</span>
          <span className="font-semibold text-gray-200">
            {formatMetricValue(metricKey, smartMetric.benchmarks.historicalAvg)}
          </span>
        </div>
      </div>

      {/* Anomaly Message */}
      {isAnomaly && smartMetric.message && (
        <div className="mt-3 p-2 bg-red-900/30 border border-red-800 rounded text-xs text-red-200">
          <div className="flex items-center space-x-1">
            <Activity className="w-3 h-3" />
            <span className="font-semibold">Anomaly Detected</span>
          </div>
          <p className="mt-1">{smartMetric.message}</p>
        </div>
      )}

      {/* Top Recommendation */}
      {smartMetric.recommendations.length > 0 && (
        <div className="mt-3 p-2 bg-blue-900/20 border border-blue-800 rounded text-xs text-blue-200">
          <p>{smartMetric.recommendations[0]}</p>
        </div>
      )}
    </div>
  );
};

// --- Enhanced StatCard Skeleton ---
const EnhancedStatCardSkeleton = () => (
  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 animate-pulse">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gray-700 rounded-lg"></div>
        <div className="h-3 bg-gray-700 rounded w-24"></div>
      </div>
    </div>
    <div className="h-7 bg-gray-700 rounded w-20 mb-3"></div>
    <div className="flex items-center space-x-2 mb-3">
      <div className="w-4 h-4 bg-gray-700 rounded"></div>
      <div className="h-3 bg-gray-700 rounded w-32"></div>
    </div>
    <div className="space-y-2">
      <div className="flex justify-between">
        <div className="h-3 bg-gray-700 rounded w-20"></div>
        <div className="h-3 bg-gray-700 rounded w-16"></div>
      </div>
      <div className="flex justify-between">
        <div className="h-3 bg-gray-700 rounded w-24"></div>
        <div className="h-3 bg-gray-700 rounded w-16"></div>
      </div>
    </div>
  </div>
);

// --- Main Component ---
const SiteSummary: React.FC = () => {
  const [combinedChartData, setCombinedChartData] = useState<ChartData[] | null>(null);
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

        // Combine historical data with forecast data
        const chartData: ChartData[] = historicalResult.map(item => ({
          ...item,
          isForecast: false
        }));

        // Add forecast data if available
        if (statsResult.metrics?.totalClicks?.thirtyDayForecast) {
          const lastHistoricalDate = new Date(historicalResult[historicalResult.length - 1]?.date || endDate);
          const forecastDate = new Date(lastHistoricalDate);
          forecastDate.setDate(forecastDate.getDate() + 30);

          const forecastValue = statsResult.metrics.totalClicks.thirtyDayForecast;
          const uncertaintyRange = forecastValue * 0.1; // ±10% uncertainty

          chartData.push({
            date: formatDate(forecastDate),
            clicks: 0, // Historical clicks set to 0 for forecast point
            impressions: 0,
            ctr: 0,
            position: 0,
            forecastClicks: forecastValue,
            forecastClicksUpper: forecastValue + uncertaintyRange,
            forecastClicksLower: Math.max(0, forecastValue - uncertaintyRange),
            isForecast: true
          });
        }

        setCombinedChartData(chartData);
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
          <EnhancedStatCardSkeleton />
          <EnhancedStatCardSkeleton />
          <EnhancedStatCardSkeleton />
          <EnhancedStatCardSkeleton />
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-8 h-96 animate-pulse"></div>
      </>
    );
  }

  if (error) {
    return <div className="bg-red-900/50 text-red-300 p-4 rounded-lg">Error: {error}</div>;
  }

  if (!combinedChartData || !dashboardStats) {
    return <div className="text-center py-8 text-gray-400">No data available.</div>;
  }

  // Calculate current values from historical data
  const currentValues = {
    totalClicks: combinedChartData.filter(d => !d.isForecast).reduce((sum, item) => sum + item.clicks, 0),
    totalImpressions: combinedChartData.filter(d => !d.isForecast).reduce((sum, item) => sum + item.impressions, 0),
    averageCtr: combinedChartData.filter(d => !d.isForecast).reduce((sum, item) => sum + item.ctr, 0) / combinedChartData.filter(d => !d.isForecast).length,
    averagePosition: combinedChartData.filter(d => !d.isForecast).reduce((sum, item) => sum + item.position, 0) / combinedChartData.filter(d => !d.isForecast).length
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedStatCard
          title="Total Clicks"
          metricKey="totalClicks"
          currentValue={currentValues.totalClicks}
          icon={ICONS.CLICKS}
          smartMetric={dashboardStats.metrics.totalClicks}
        />
        <EnhancedStatCard
          title="Total Impressions"
          metricKey="totalImpressions"
          currentValue={currentValues.totalImpressions}
          icon={ICONS.IMPRESSIONS}
          smartMetric={dashboardStats.metrics.totalImpressions}
        />
        <EnhancedStatCard
          title="Average CTR"
          metricKey="averageCtr"
          currentValue={currentValues.averageCtr}
          icon={ICONS.CTR}
          smartMetric={dashboardStats.metrics.averageCtr}
        />
        <EnhancedStatCard
          title="Average Position"
          metricKey="averagePosition"
          currentValue={currentValues.averagePosition}
          icon={ICONS.POSITION}
          smartMetric={dashboardStats.metrics.averagePosition}
        />
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 mt-8 h-96">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Traffic Overview with 30-Day Forecast</h3>
          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-indigo-500 rounded"></div>
              <span>Historical Clicks</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 border-2 border-dashed border-green-500 rounded"></div>
              <span>Forecast</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-green-500/30 rounded"></div>
              <span>Uncertainty Range</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combinedChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af' }}
              tickFormatter={(dateStr) => {
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis yAxisId="left" tick={{ fill: '#6a5acd' }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fill: '#8a7aff' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(31, 41, 55, 0.9)',
                border: '1px solid #4b5563',
                color: '#e5e7eb'
              }}
              formatter={(value, name) => {
                if (name === 'forecastClicks') return [`${Number(value).toLocaleString()} (forecast)`, 'Clicks'];
                if (name === 'clicks') return [Number(value).toLocaleString(), 'Clicks'];
                if (name === 'impressions') return [Number(value).toLocaleString(), 'Impressions'];
                return [value, name];
              }}
            />
            <Legend wrapperStyle={{ color: '#e5e7eb' }} />

            {/* Uncertainty Range Area */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="forecastClicksUpper"
              fill="rgba(34, 197, 94, 0.2)"
              stroke="none"
              connectNulls={false}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="forecastClicksLower"
              fill="rgba(31, 41, 55, 1)"
              stroke="none"
              connectNulls={false}
            />

            {/* Historical Data Lines */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="clicks"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
              name="Historical Clicks"
              connectNulls={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="impressions"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              name="Impressions"
              connectNulls={false}
            />

            {/* Forecast Line */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="forecastClicks"
              stroke="#22c55e"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#22c55e', r: 4 }}
              activeDot={{ r: 6 }}
              name="Forecast Clicks"
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
};

export default SiteSummary;