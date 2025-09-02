'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, AlertTriangle, Star, Eye, Zap } from 'lucide-react';

interface PageData {
  url: string;
  title: string;
  performance_tier: string;
  performance_score: number;
  performance_priority: string;
  performance_reasoning: string;
  marketing_action: string;
  technical_action: string;
  expected_impact: string;
  timeframe: string;
  confidence: number;
  metrics?: {
    recent?: {
      totalClicks: number;
      totalImpressions: number;
      averageCtr: number;
    };
    baseline?: {
      totalClicks: number;
      totalImpressions: number;
      averageCtr: number;
    };
    change?: {
      clicks: number;
    };
  };
  last_tiering_run: string;
  monthlyClicksPotential?: number;
  improvementPotential: string;
  urgencyScore: number;
  competitiveThreat: string;
}

interface TierSummary {
  lastRun: string;
  totalPages: number;
  distribution: Record<string, number>;
  priorityBreakdown: Record<string, number>;
  keyInsights: Array<{
    type: string;
    message: string;
    count: number;
    impact: string;
  }>;
  recommendations: Array<{
    priority: string;
    action: string;
    pagesAffected: number;
    estimatedImpact: string;
    timeframe: string;
  }>;
}

const PERFORMANCE_TIERS = [
  'All Pages',
  'Champions',
  'Rising Stars',
  'Cash Cows',
  'Quick Wins',
  'Hidden Gems',
  'At Risk',
  'Declining',
  'Problem Pages',
  'New/Low Data'
];

const TIER_CONFIGS = {
  'Champions': { color: 'text-green-400', bg: 'bg-green-900/20', icon: Star },
  'Rising Stars': { color: 'text-blue-400', bg: 'bg-blue-900/20', icon: TrendingUp },
  'Cash Cows': { color: 'text-purple-400', bg: 'bg-purple-900/20', icon: Star },
  'Quick Wins': { color: 'text-yellow-400', bg: 'bg-yellow-900/20', icon: Zap },
  'Hidden Gems': { color: 'text-indigo-400', bg: 'bg-indigo-900/20', icon: Eye },
  'At Risk': { color: 'text-orange-400', bg: 'bg-orange-900/20', icon: AlertTriangle },
  'Declining': { color: 'text-red-400', bg: 'bg-red-900/20', icon: TrendingDown },
  'Problem Pages': { color: 'text-red-500', bg: 'bg-red-900/30', icon: AlertTriangle },
  'New/Low Data': { color: 'text-gray-400', bg: 'bg-gray-800/50', icon: Eye }
};

export default function PagesListTable() {
  const [pages, setPages] = useState<PageData[]>([]);
  const [summary, setSummary] = useState<TierSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState('All Pages');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchData();
  }, [selectedTier]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const tierParam = selectedTier === 'All Pages' ? '' : `&tier=${encodeURIComponent(selectedTier)}`;

      // Fetch both pages and summary
      const [pagesRes, summaryRes] = await Promise.all([
        fetch(`/api/pages/tiers?limit=100${tierParam}`),
        fetch('/api/pages/tiers?summary=true')
      ]);

      if (!pagesRes.ok) {
        throw new Error(`Failed to fetch pages: ${pagesRes.statusText}`);
      }

      const pagesData = await pagesRes.json();
      const summaryData = summaryRes.ok ? await summaryRes.json() : null;

      setPages(Array.isArray(pagesData) ? pagesData : []);
      setSummary(summaryData?.summary || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch page data';
      setError(errorMessage);
      console.error('Error fetching pages:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMetricChange = (change?: number) => {
    if (change === undefined || change === null) return 'N/A';
    const percentage = (change * 100).toFixed(1);
    const isPositive = change > 0;
    return (
      <span className={isPositive ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'}>
        {isPositive ? '+' : ''}{percentage}%
      </span>
    );
  };

  const getTierIcon = (tier: string) => {
    const config = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS];
    if (!config) return null;
    const IconComponent = config.icon;
    return <IconComponent className="w-4 h-4" />;
  };

  const getTierStyle = (tier: string) => {
    return TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS] || { color: 'text-gray-400', bg: 'bg-gray-800' };
  };

  // Pagination
  const totalPages = Math.ceil(pages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPages = pages.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-center py-8">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-red-400 mb-2">Error Loading Performance Data</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4 max-w-lg mx-auto">
            <p className="text-yellow-300 text-sm mb-2">
              <strong>Common Solutions:</strong>
            </p>
            <ol className="text-yellow-200 text-sm space-y-1 text-left">
              <li>1. Run GSC data ingestion cron job</li>
              <li>2. Run the URL migration script</li>
              <li>3. Run the daily stats cron job</li>
              <li>4. Wait a few minutes and refresh</li>
            </ol>
          </div>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats Row */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(summary.distribution).map(([tier, count]) => {
            const style = getTierStyle(tier);
            return (
              <div key={tier} className={`${style.bg} rounded-lg p-4 border border-gray-700`}>
                <div className="flex items-center space-x-2">
                  <div className={style.color}>
                    {getTierIcon(tier)}
                  </div>
                  <div className="text-sm text-gray-400">{tier}</div>
                </div>
                <div className={`text-2xl font-bold ${style.color}`}>{count}</div>
                <div className="text-xs text-gray-500">
                  {((count / summary.totalPages) * 100).toFixed(0)}% of pages
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Key Insights */}
      {summary?.keyInsights && summary.keyInsights.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-3">Key Insights</h3>
          <div className="space-y-2">
            {summary.keyInsights.slice(0, 3).map((insight, index) => (
              <div key={index} className="flex items-start space-x-3 p-3 bg-gray-900/50 rounded">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  insight.type === 'opportunity' ? 'bg-green-400' :
                  insight.type === 'risk' ? 'bg-red-400' : 'bg-yellow-400'
                }`}></div>
                <div>
                  <div className="text-white font-medium">
                    {insight.count} {insight.message}
                  </div>
                  <div className="text-gray-400 text-sm">{insight.impact}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-700 pb-4">
        {PERFORMANCE_TIERS.map(tier => {
          const count = tier === 'All Pages'
            ? summary?.totalPages || 0
            : summary?.distribution[tier] || 0;

          return (
            <button
              key={tier}
              onClick={() => {
                setSelectedTier(tier);
                setCurrentPage(1);
              }}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTier === tier
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {tier}
              {count > 0 && (
                <span className="ml-2 px-2 py-1 text-xs bg-gray-900 rounded-full">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Pages Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        {pages.length === 0 ? (
          <div className="text-center py-12">
            <Eye className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {selectedTier === 'All Pages' ? 'No Pages Found' : `No ${selectedTier} Pages`}
            </h3>
            <p className="text-gray-500 mb-4">
              {selectedTier === 'All Pages'
                ? 'Run the data ingestion and daily stats cron jobs to populate this dashboard.'
                : `No pages are currently classified as ${selectedTier}.`
              }
            </p>
            {summary?.recommendations && summary.recommendations.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-blue-300 text-sm">
                  <strong>Next Step:</strong> {summary.recommendations[0].action}
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="text-left p-4 text-gray-300 font-medium">Page</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Tier</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Score</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Clicks</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Change</th>
                    <th className="text-left p-4 text-gray-300 font-medium">CTR</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Priority</th>
                    <th className="text-left p-4 text-gray-300 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPages.map((page, index) => {
                    const tierStyle = getTierStyle(page.performance_tier);
                    const recentClicks = page.metrics?.recent?.totalClicks || 0;
                    const recentCtr = page.metrics?.recent?.averageCtr || 0;
                    const clicksChange = page.metrics?.change?.clicks;

                    return (
                      <tr key={index} className="border-t border-gray-700 hover:bg-gray-900/50">
                        <td className="p-4">
                          <div>
                            <div className="text-white font-medium mb-1">
                              {page.title || 'Untitled Page'}
                            </div>
                            <div className="text-gray-400 text-sm truncate max-w-xs">
                              {page.url}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className={`inline-flex items-center space-x-2 px-2 py-1 rounded-full ${tierStyle.bg}`}>
                            <div className={tierStyle.color}>
                              {getTierIcon(page.performance_tier)}
                            </div>
                            <span className={`text-sm font-medium ${tierStyle.color}`}>
                              {page.performance_tier}
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-white font-mono">
                            {page.performance_score || 0}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-white font-medium">
                            {recentClicks.toLocaleString()}
                          </div>
                        </td>
                        <td className="p-4">
                          {formatMetricChange(clicksChange)}
                        </td>
                        <td className="p-4">
                          <div className="text-white">
                            {(recentCtr * 100).toFixed(2)}%
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            page.performance_priority === 'Critical' ? 'bg-red-900/30 text-red-400' :
                            page.performance_priority === 'High' ? 'bg-orange-900/30 text-orange-400' :
                            page.performance_priority === 'Medium' ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-gray-700 text-gray-300'
                          }`}>
                            {page.performance_priority || 'Monitor'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="text-sm text-gray-300 max-w-xs">
                            {page.marketing_action || page.performance_reasoning || 'Monitor performance'}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, pages.length)} of {pages.length} pages
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
