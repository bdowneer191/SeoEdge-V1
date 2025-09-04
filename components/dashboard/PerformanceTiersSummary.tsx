'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, AlertCircle, Target, Eye, ArrowRight, RefreshCw } from 'lucide-react';

interface TierData {
  lastRun: string;
  totalPagesProcessed: number;
  totalPagesInSystem?: number;
  tierDistribution: Record<string, number>;
  processingNote?: string;
}

const TIER_CONFIG = {
  'Champions': {
    color: 'text-green-400 bg-green-900/20 border-green-500/30',
    icon: '🏆',
    description: 'High performing pages',
    priority: 1
  },
  'Rising Stars': {
    color: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
    icon: '⭐',
    description: 'Growing traffic',
    priority: 2
  },
  'Cash Cows': {
    color: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
    icon: '💰',
    description: 'Stable high visibility',
    priority: 3
  },
  'Quick Wins': {
    color: 'text-orange-400 bg-orange-900/20 border-orange-500/30',
    icon: '⚡',
    description: 'Optimization opportunities',
    priority: 2
  },
  'Hidden Gems': {
    color: 'text-purple-400 bg-purple-900/20 border-purple-500/30',
    icon: '💎',
    description: 'Untapped potential',
    priority: 3
  },
  'At Risk': {
    color: 'text-red-400 bg-red-900/20 border-red-500/30',
    icon: '⚠️',
    description: 'Needs attention',
    priority: 1
  },
  'Declining': {
    color: 'text-red-500 bg-red-900/30 border-red-500/40',
    icon: '📉',
    description: 'Urgent action required',
    priority: 1
  },
  'Problem Pages': {
    color: 'text-red-600 bg-red-900/40 border-red-500/50',
    icon: '🚨',
    description: 'Critical issues',
    priority: 1
  },
  'New/Low Data': {
    color: 'text-gray-400 bg-gray-800/50 border-gray-500/30',
    icon: '📊',
    description: 'Awaiting analysis',
    priority: 4
  }
};

export default function PerformanceTiersSummary() {
  const [tierData, setTierData] = useState<TierData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTierData();
  }, []);

  const fetchTierData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/pages/tiers?summary=true');
      if (response.ok) {
        const data = await response.json();
        setTierData(data.summary);
      } else {
        throw new Error('Failed to fetch tier data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !tierData) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <h2 className="text-xl font-semibold text-white">Performance Overview</h2>
        </div>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-4">
            {error || 'Unable to load performance data'}
          </div>
          <div className="space-y-2 text-sm text-gray-500">
            <p>This could mean:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>No data has been processed yet</li>
              <li>The daily stats cron job hasn't run</li>
              <li>Firestore quota may be exhausted</li>
            </ul>
          </div>
          <div className="flex gap-2 justify-center mt-6">
            <button
              onClick={fetchTierData}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            <Link
              href="/api/admin/generate-sample-data?secret=1Kk8_ArD8PL5"
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
              target="_blank"
            >
              Generate Sample Data
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const distribution = tierData.tierDistribution || {};
  const totalPages = tierData.totalPagesInSystem || tierData.totalPagesProcessed || 0;

  // Sort tiers by priority (critical issues first)
  const sortedTiers = Object.entries(distribution)
    .filter(([tier, count]) => count > 0)
    .sort(([tierA], [tierB]) => {
      const priorityA = TIER_CONFIG[tierA]?.priority || 5;
      const priorityB = TIER_CONFIG[tierB]?.priority || 5;
      return priorityA - priorityB;
    });

  // Calculate key metrics
  const needsAttention = (distribution['At Risk'] || 0) +
                        (distribution['Declining'] || 0) +
                        (distribution['Problem Pages'] || 0);

  const opportunities = (distribution['Quick Wins'] || 0) +
                       (distribution['Hidden Gems'] || 0);

  const performers = (distribution['Champions'] || 0) +
                    (distribution['Rising Stars'] || 0) +
                    (distribution['Cash Cows'] || 0);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-blue-400" />
          <h2 className="text-xl font-semibold text-white">Performance Overview</h2>
        </div>
        <Link
          href="/performance"
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium"
        >
          View Details <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-gray-400">Total Pages</span>
          </div>
          <div className="text-2xl font-bold text-white">{totalPages}</div>
          <div className="text-xs text-gray-500">Analyzed pages</div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-sm text-gray-400">Top Performers</span>
          </div>
          <div className="text-2xl font-bold text-green-400">{performers}</div>
          <div className="text-xs text-gray-500">Champions, Stars, Cows</div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-gray-400">Opportunities</span>
          </div>
          <div className="text-2xl font-bold text-orange-400">{opportunities}</div>
          <div className="text-xs text-gray-500">Quick wins available</div>
        </div>

        <div className="bg-gray-900 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-gray-400">Needs Attention</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{needsAttention}</div>
          <div className="text-xs text-gray-500">At risk or declining</div>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="space-y-3">
        <h3 className="text-lg font-medium text-white mb-4">Page Distribution by Performance Tier</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedTiers.map(([tier, count]) => {
            const config = TIER_CONFIG[tier];
            if (!config) return null;

            const percentage = totalPages > 0 ? Math.round((count / totalPages) * 100) : 0;

            return (
              <Link
                key={tier}
                href={`/performance?tier=${encodeURIComponent(tier)}`}
                className={`block p-4 rounded-lg border transition-all hover:scale-105 hover:shadow-lg ${config.color}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className="font-medium">{tier}</span>
                  </div>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
                <div className="text-sm opacity-80 mb-2">{config.description}</div>
                <div className="flex items-center justify-between text-xs">
                  <span>{percentage}% of pages</span>
                  {config.priority <= 2 && (
                    <span className="bg-current bg-opacity-20 px-2 py-1 rounded">
                      {config.priority === 1 ? 'High Priority' : 'Medium Priority'}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Status Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div>
            Last updated: {new Date(tierData.lastRun).toLocaleString()}
          </div>
          {tierData.processingNote && (
            <div className="text-blue-400" title={tierData.processingNote}>
              ℹ️ {tierData.processingNote.split(' - ')[0]}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
