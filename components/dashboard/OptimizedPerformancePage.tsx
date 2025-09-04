'use client';

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  MousePointer,
  BarChart3,
  Clock,
  Target,
  Search,
  Filter,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface TierStats {
  lastRun: string;
  totalPagesProcessed: number;
  totalPagesInSystem?: number;
  tierDistribution: Record<string, number>;
  processingNote?: string;
}

interface PageData {
  url: string;
  title: string;
  performance_tier: string;
  performance_score: number;
  performance_priority: string;
  performance_reasoning: string;
  marketing_action: string;
  technical_action: string;
  expected_impact?: string;
  timeframe?: string;
  confidence?: number;
  metrics?: {
    recent?: {
      totalClicks: number;
      totalImpressions: number;
      averageCtr: number;
      averagePosition: number;
    };
    change?: {
      clicks?: number;
      impressions?: number;
      ctr?: number;
      position?: number;
    };
  };
}

interface DashboardStats {
  status: string;
  metrics?: {
    totalClicks?: { current: number };
    totalImpressions?: { current: number };
    averageCtr?: { current: number };
    averagePosition?: { current: number };
  };
  summary?: {
    totalClicks: number;
    totalImpressions: number;
    averageCtr: number;
    averagePosition: number;
  };
  processingNote?: string;
}

const TIER_COLORS = {
  'Champions': 'text-green-400 bg-green-900/20 border-green-500/30',
  'Rising Stars': 'text-blue-400 bg-blue-900/20 border-blue-500/30',
  'Cash Cows': 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
  'Quick Wins': 'text-orange-400 bg-orange-900/20 border-orange-500/30',
  'Hidden Gems': 'text-purple-400 bg-purple-900/20 border-purple-500/30',
  'At Risk': 'text-red-400 bg-red-900/20 border-red-500/30',
  'Declining': 'text-red-500 bg-red-900/30 border-red-500/40',
  'Problem Pages': 'text-red-600 bg-red-900/40 border-red-500/50',
  'New/Low Data': 'text-gray-400 bg-gray-800/50 border-gray-500/30'
};

const TIER_DESCRIPTIONS = {
  'Champions': 'High performing pages - maintain success',
  'Rising Stars': 'Growing traffic - double down on promotion',
  'Cash Cows': 'Stable high-visibility pages - maintain freshness',
  'Quick Wins': 'High impressions, low CTR - optimize titles/descriptions',
  'Hidden Gems': 'High CTR, low impressions - build more backlinks',
  'At Risk': 'Declining performance - needs immediate attention',
  'Declining': 'Consistent downward trend - content audit needed',
  'Problem Pages': 'Severe traffic loss - investigate indexing issues',
  'New/Low Data': 'Awaiting sufficient data for analysis'
};

export default function OptimizedPerformancePage() {
  const [tierStats, setTierStats] = useState<TierStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [filteredPages, setFilteredPages] = useState<PageData[]>([]);
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'score' | 'clicks' | 'ctr' | 'title'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  useEffect(() => {
    filterAndSortPages();
  }, [pages, selectedTier, selectedPriority, searchTerm, sortBy, sortOrder]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [tierStatsRes, dashboardRes, pagesRes] = await Promise.all([
        fetch('/api/pages/tiers?summary=true').catch(() => null),
        fetch('/api/dashboard-stats').catch(() => null),
        fetch('/api/pages/tiers?limit=100').catch(() => null) // Increased limit for better demo
      ]);

      // Handle tier stats
      if (tierStatsRes?.ok) {
        const tierData = await tierStatsRes.json();
        setTierStats(tierData.summary);
      }

      // Handle dashboard stats
      if (dashboardRes?.ok) {
        const dashboardData = await dashboardRes.json();
        setDashboardStats(dashboardData.siteSummary?.dashboardStats);
      }

      // Handle pages
      if (pagesRes?.ok) {
        const pagesData = await pagesRes.json();
        setPages(Array.isArray(pagesData) ? pagesData : []);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortPages = () => {
    let filtered = [...pages];

    // Apply tier filter
    if (selectedTier !== 'all') {
      filtered = filtered.filter(page => page.performance_tier === selectedTier);
    }

    // Apply priority filter
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(page => page.performance_priority === selectedPriority);
    }

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(page =>
        page.title.toLowerCase().includes(term) ||
        page.url.toLowerCase().includes(term) ||
        page.performance_reasoning.toLowerCase().includes(term)
      );
    }

    // Sort pages
    filtered.sort((a, b) => {
      let aVal: number | string, bVal: number | string;

      switch (sortBy) {
        case 'score':
          aVal = a.performance_score || 0;
          bVal = b.performance_score || 0;
          break;
        case 'clicks':
          aVal = a.metrics?.recent?.totalClicks || 0;
          bVal = b.metrics?.recent?.totalClicks || 0;
          break;
        case 'ctr':
          aVal = a.metrics?.recent?.averageCtr || 0;
          bVal = b.metrics?.recent?.averageCtr || 0;
          break;
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        default:
          aVal = a.performance_score || 0;
          bVal = b.performance_score || 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'desc' ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }

      return sortOrder === 'desc' ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number);
    });

    setFilteredPages(filtered);
  };

  const clearFilters = () => {
    setSelectedTier('all');
    setSelectedPriority('all');
    setSearchTerm('');
    setSortBy('score');
    setSortOrder('desc');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-800 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-800 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Performance Data Error</h2>
        <p className="text-red-300 mb-4">{error}</p>
        <div className="space-y-2 text-sm text-gray-400 mb-6">
          <p>This usually means:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>No performance data has been generated yet</li>
            <li>Firestore quota may be exhausted</li>
            <li>Cron jobs haven't run successfully</li>
          </ul>
        </div>
        <div className="flex gap-2 justify-center">
          <button
            onClick={fetchPerformanceData}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
          <a
            href="/api/admin/generate-sample-data?secret=1Kk8_ArD8PL5"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
          >
            <Target className="w-4 h-4" />
            Generate Sample Data
          </a>
        </div>
      </div>
    );
  }

  const totalPages = tierStats?.totalPagesInSystem || tierStats?.totalPagesProcessed || pages.length;
  const distribution = tierStats?.tierDistribution || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-3xl font-bold text-white">
          Page Performance Tiers
        </h1>
        <p className="text-gray-400 mt-2">
          AI-powered analysis of your pages categorized by performance metrics and opportunities.
        </p>
        {tierStats?.processingNote && (
          <div className="mt-2 p-3 bg-blue-900/20 border border-blue-500/30 rounded text-blue-300 text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="font-medium">Processing Note:</span>
            </div>
            <p className="mt-1">{tierStats.processingNote}</p>
          </div>
        )}
      </div>

      {/* Key Metrics Overview */}
      {dashboardStats?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <MousePointer className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-gray-400">Total Clicks</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {dashboardStats.summary.totalClicks.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Recent period</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-5 h-5 text-green-400" />
              <span className="text-sm text-gray-400">Impressions</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {dashboardStats.summary.totalImpressions.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Search visibility</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-yellow-400" />
              <span className="text-sm text-gray-400">Average CTR</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {(dashboardStats.summary.averageCtr * 100).toFixed(2)}%
            </div>
            <div className="text-xs text-gray-500">Click-through rate</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 hover:bg-gray-750 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-400">Avg Position</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {dashboardStats.summary.averagePosition.toFixed(1)}
            </div>
            <div className="text-xs text-gray-500">Search ranking</div>
          </div>
        </div>
      )}

      {/* Performance Tiers Overview */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(distribution).map(([tier, count]) => (
            <button
              key={tier}
              onClick={() => setSelectedTier(selectedTier === tier ? 'all' : tier)}
              className={`p-3 rounded-lg border text-left transition-all hover:scale-105 ${
                selectedTier === tier ? 'ring-2 ring-blue-500' : ''
              } ${TIER_COLORS[tier] || 'text-gray-400 bg-gray-800 border-gray-500/30'}`}
            >
              <div className="text-xs opacity-90 mb-1">{tier}</div>
              <div className="text-xl font-bold">{count}</div>
              <div className="text-xs opacity-70 mt-1 line-clamp-2">
                {TIER_DESCRIPTIONS[tier]?.split(' - ')[0] || 'Pages'}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Priorities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Monitor">Monitor</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">Sort by:</span>
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('_');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="score_desc">Score (High to Low)</option>
              <option value="score_asc">Score (Low to High)</option>
              <option value="clicks_desc">Clicks (High to Low)</option>
              <option value="clicks_asc">Clicks (Low to High)</option>
              <option value="ctr_desc">CTR (High to Low)</option>
              <option value="ctr_asc">CTR (Low to High)</option>
              <option value="title_asc">Title (A to Z)</option>
              <option value="title_desc">Title (Z to A)</option>
            </select>
          </div>

          {(selectedTier !== 'all' || selectedPriority !== 'all' || searchTerm) && (
            <button
              onClick={clearFilters}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <span className="text-gray-400">
          Showing {filteredPages.length} of {totalPages} pages
        </span>
        {tierStats?.lastRun && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Clock className="w-4 h-4" />
            Last updated: {new Date(tierStats.lastRun).toLocaleString()}
          </div>
        )}
      </div>

      {/* Pages Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {filteredPages.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            {pages.length === 0
              ? 'No pages found. Run the daily stats cron job or generate sample data to analyze your pages.'
              : 'No pages match your current filters. Try adjusting the search or filter criteria.'
            }
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Action Required
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredPages.map((page, index) => (
                  <tr key={index} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <div className="text-white font-medium truncate max-w-xs" title={page.title}>
                          {page.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="text-gray-400 text-sm truncate max-w-xs" title={page.url}>
                            {page.url}
                          </div>
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-blue-400"
                            title="Open page"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        TIER_COLORS[page.performance_tier]?.replace('border-', '') || 'bg-gray-700 text-gray-300'
                      }`}>
                        {page.performance_tier}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">
                        {page.performance_priority}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center">
                        <div className="text-white font-medium mr-2">
                          {page.performance_score || 0}
                        </div>
                        <div className="w-16 bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              (page.performance_score || 0) >= 70 ? 'bg-green-500' :
                              (page.performance_score || 0) >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, page.performance_score || 0)}%` }}
                          ></div>
                        </div>
                      </div>
                      {page.confidence && (
                        <div className="text-xs text-gray-500 mt-1">
                          {Math.round(page.confidence * 100)}% confidence
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <MousePointer className="w-3 h-3 text-blue-400" />
                          <span className="text-white">{page.metrics?.recent?.totalClicks || 0}</span>
                          <span className="text-gray-500">clicks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="w-3 h-3 text-green-400" />
                          <span className="text-white">{page.metrics?.recent?.totalImpressions || 0}</span>
                          <span className="text-gray-500">impressions</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-3 h-3 text-yellow-400" />
                          <span className="text-white">
                            {page.metrics?.recent?.averageCtr
                              ? `${(page.metrics.recent.averageCtr * 100).toFixed(2)}%`
                              : 'N/A'
                            }
                          </span>
                          <span className="text-gray-500">CTR</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="space-y-2 text-sm max-w-sm">
                        <div className="p-2 bg-blue-900/20 rounded border border-blue-500/30">
                          <div className="text-blue-400 font-medium mb-1">Marketing:</div>
                          <div className="text-blue-300 text-xs">{page.marketing_action}</div>
                        </div>
                        <div className="p-2 bg-purple-900/20 rounded border border-purple-500/30">
                          <div className="text-purple-400 font-medium mb-1">Technical:</div>
                          <div className="text-purple-300 text-xs">{page.technical_action}</div>
                        </div>
                        {page.expected_impact && (
                          <div className="text-xs text-gray-400">
                            Expected: {page.expected_impact}
                          </div>
                        )}
                        {page.timeframe && (
                          <div className="text-xs text-gray-500">
                            Timeline: {page.timeframe}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Processing Note */}
      {dashboardStats?.processingNote && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-400 mb-2">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Processing Note</span>
          </div>
          <p className="text-yellow-300">{dashboardStats.processingNote}</p>
        </div>
      )}
    </div>
  );
}
