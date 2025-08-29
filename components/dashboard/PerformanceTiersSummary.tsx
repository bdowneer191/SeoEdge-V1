"use client";
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Target,
  Trophy,
  Eye,
  Clock,
  ArrowRight,
  BarChart3,
  Zap,
  Shield,
  AlertCircle
} from 'lucide-react';

interface TieringSummary {
  lastRun: string;
  totalPages: number;
  distribution: Record<string, number>;
  priorityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    monitor: number;
  };
  keyInsights: Array<{
    type: 'opportunity' | 'risk' | 'success';
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

const PerformanceTiersSummary = () => {
  const [summary, setSummary] = useState<TieringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/pages/tiers?summary=true');
      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
      } else {
        setError('Failed to load performance tiers data');
      }
    } catch (err) {
      setError('Error fetching performance tiers');
      console.error('Error:', err);
    }
    setLoading(false);
  };

  const getTierIcon = (tier: string, size = 18) => {
    const iconProps = { size, className: "flex-shrink-0" };
    switch (tier) {
      case 'Champions': return <Trophy {...iconProps} className="text-yellow-500 flex-shrink-0" />;
      case 'Rising Stars': return <TrendingUp {...iconProps} className="text-green-500 flex-shrink-0" />;
      case 'Cash Cows': return <BarChart3 {...iconProps} className="text-blue-500 flex-shrink-0" />;
      case 'Quick Wins': return <Target {...iconProps} className="text-purple-500 flex-shrink-0" />;
      case 'Hidden Gems': return <Eye {...iconProps} className="text-cyan-500 flex-shrink-0" />;
      case 'At Risk': return <AlertTriangle {...iconProps} className="text-red-500 flex-shrink-0" />;
      case 'Declining': return <TrendingDown {...iconProps} className="text-orange-500 flex-shrink-0" />;
      case 'Problem Pages': return <AlertCircle {...iconProps} className="text-red-700 flex-shrink-0" />;
      default: return <Clock {...iconProps} className="text-gray-500 flex-shrink-0" />;
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'Critical': return <AlertTriangle className="text-red-500" size={16} />;
      case 'High': return <Zap className="text-orange-500" size={16} />;
      case 'Medium': return <Target className="text-yellow-500" size={16} />;
      default: return <Shield className="text-green-500" size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Performance Tiers</h3>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Performance Tiers</h3>
        <div className="text-center text-gray-400 py-8">
          <AlertCircle className="mx-auto mb-2 text-red-500" size={24} />
          <p>{error}</p>
          <p className="text-sm mt-2">Run the daily stats cron job to generate tiering data</p>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const criticalActions = summary.recommendations.filter(r => r.priority === 'Critical');
  const topTiers = Object.entries(summary.distribution)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Performance Tiers Overview</h3>
          <div className="text-sm text-gray-400">
            {summary.totalPages} pages analyzed
          </div>
        </div>

        {/* Critical Alerts */}
        {criticalActions.length > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="text-red-400" size={20} />
              <h4 className="font-semibold text-red-400">Critical Issues Detected</h4>
            </div>
            <div className="space-y-2">
              {criticalActions.map((action, index) => (
                <div key={index} className="text-sm text-red-200">
                  <span className="font-medium">{action.pagesAffected} pages:</span> {action.action}
                  <div className="text-red-300 text-xs">Impact: {action.estimatedImpact}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <AlertTriangle className="text-red-500" size={16} />
              <span className="text-sm text-gray-300">Critical</span>
            </div>
            <div className="text-2xl font-bold text-white">{summary.priorityBreakdown.critical}</div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Target className="text-purple-500" size={16} />
              <span className="text-sm text-gray-300">Quick Wins</span>
            </div>
            <div className="text-2xl font-bold text-white">{summary.distribution['Quick Wins'] || 0}</div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="text-green-500" size={16} />
              <span className="text-sm text-gray-300">Rising</span>
            </div>
            <div className="text-2xl font-bold text-white">{summary.distribution['Rising Stars'] || 0}</div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-1">
              <Trophy className="text-yellow-500" size={16} />
              <span className="text-sm text-gray-300">Champions</span>
            </div>
            <div className="text-2xl font-bold text-white">{summary.distribution['Champions'] || 0}</div>
          </div>
        </div>

        {/* Top Recommendations */}
        <div className="space-y-3">
          <h4 className="font-semibold text-white">Top Recommendations</h4>
          {summary.recommendations.slice(0, 3).map((rec, index) => (
            <div key={index} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {getPriorityIcon(rec.priority)}
                  <span className="font-medium text-white">{rec.action}</span>
                </div>
                <div className="text-xs text-gray-400">{rec.timeframe}</div>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-300">
                <span>{rec.pagesAffected} pages affected</span>
                <span className="text-green-400">{rec.estimatedImpact}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h4 className="font-semibold text-white mb-4">Tier Distribution</h4>
        <div className="space-y-3">
          {topTiers.map(([tier, count]) => (
            <div key={tier} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getTierIcon(tier)}
                <span className="text-white">{tier}</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-gray-400">{count} pages</span>
                <div className="w-20 h-2 bg-gray-700 rounded">
                  <div
                    className="h-full bg-blue-500 rounded"
                    style={{ width: `${(count / summary.totalPages) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-10 text-right">
                  {((count / summary.totalPages) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Key Insights */}
      {summary.keyInsights.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="font-semibold text-white mb-4">Key Insights</h4>
          <div className="space-y-3">
            {summary.keyInsights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                  insight.type === 'risk' ? 'bg-red-500' :
                  insight.type === 'opportunity' ? 'bg-green-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1">
                  <p className="text-white">
                    <span className="font-medium">{insight.count}</span> {insight.message}
                  </p>
                  <p className="text-sm text-gray-400">{insight.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* View All Button */}
      <div className="text-center">
        <a
          href="/performance"
          className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <span>View All Performance Tiers</span>
          <ArrowRight size={16} />
        </a>
      </div>
    </div>
  );
};

export default PerformanceTiersSummary;
