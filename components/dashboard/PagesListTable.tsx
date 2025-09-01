"use client";

import React, { useState, useEffect } from 'react';
import PagesListTableSkeleton from './PagesListTableSkeleton';
import { cn } from '@/lib/utils';
import Link from 'next/link';

import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Minus,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Shield,
  Wrench,
  AlertTriangle,
  FileQuestion,
  ChevronDown
} from 'lucide-react';

// Define the type for a page object from the new tiering logic
type PerformanceTier =
  | 'Champions'
  | 'Rising Stars'
  | 'Cash Cows'
  | 'Hidden Gems'
  | 'Quick Wins'
  | 'Declining'
  | 'At Risk'
  | 'Problem Pages'
  | 'New/Low Data';

type Page = {
  url: string;
  title: string;
  performance_tier: PerformanceTier;
  performance_score: number;
  performance_priority: 'Critical' | 'High' | 'Medium' | 'Low' | 'Monitor';
  performance_reasoning: string;
  marketing_action: string;
  technical_action: string;
  metrics: {
    kpis: {
      clicksChange: number;
    }
  }
};

const TABS: (PerformanceTier | "All Pages")[] = ["All Pages", "Champions", "Rising Stars", "Cash Cows", "Hidden Gems", "Quick Wins", "Declining", "At Risk", "Problem Pages", "New/Low Data"];
const DATE_RANGES = [
  { label: "Last 7 Days", value: 7 },
  { label: "Last 30 Days", value: 30 },
  { label: "Last 90 Days", value: 90 },
  { label: "Last 365 Days", value: 365 },
];

// Helper component for rendering the tier pill
const tierStyles: Record<PerformanceTier, { icon: React.ElementType; bgColor: string; textColor: string }> = {
  Champions: { icon: Sparkles, bgColor: 'bg-green-100 dark:bg-green-900/50', textColor: 'text-green-700 dark:text-green-300' },
  'Rising Stars': { icon: TrendingUp, bgColor: 'bg-blue-100 dark:bg-blue-900/50', textColor: 'text-blue-700 dark:text-blue-300' },
  'Cash Cows': { icon: Shield, bgColor: 'bg-gray-100 dark:bg-gray-700', textColor: 'text-gray-600 dark:text-gray-300' },
  'Hidden Gems': { icon: Lightbulb, bgColor: 'bg-yellow-100 dark:bg-yellow-900/50', textColor: 'text-yellow-700 dark:text-yellow-300' },
  'Quick Wins': { icon: Wrench, bgColor: 'bg-indigo-100 dark:bg-indigo-900/50', textColor: 'text-indigo-700 dark:text-indigo-300' },
  Declining: { icon: TrendingDown, bgColor: 'bg-orange-100 dark:bg-orange-900/50', textColor: 'text-orange-700 dark:text-orange-300' },
  'At Risk': { icon: AlertTriangle, bgColor: 'bg-red-100 dark:bg-red-900/50', textColor: 'text-red-700 dark:text-red-300' },
  'Problem Pages': { icon: Wrench, bgColor: 'bg-red-200 dark:bg-red-800/50', textColor: 'text-red-800 dark:text-red-200' },
  'New/Low Data': { icon: FileQuestion, bgColor: 'bg-gray-200 dark:bg-gray-600', textColor: 'text-gray-500 dark:text-gray-400' },
};

const TierPill = ({ tier }: { tier: Page['performance_tier'] }) => {
  // Fallback for unexpected tier values
  const styles = tierStyles[tier] || tierStyles['New/Low Data'];
  const Icon = styles.icon;

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', styles.bgColor, styles.textColor)}>
      <Icon className="w-4 h-4 mr-1.5" />
      {tier}
    </span>
  );
};

const PriorityPill = ({ priority }: { priority: Page['performance_priority'] }) => {
  const priorityStyles = {
    Critical: 'bg-red-500/80 text-white',
    High: 'bg-yellow-500/80 text-white',
    Medium: 'bg-blue-500/80 text-white',
    Low: 'bg-green-500/80 text-white',
    Monitor: 'bg-gray-500/80 text-white',
  };
  return (
    <span className={cn('px-2 py-1 rounded-md text-xs font-semibold', priorityStyles[priority])}>
      {priority}
    </span>
  );
};

const ExpandableRow = ({ page }: { page: Page }) => {
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Marketing Action</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{page.marketing_action}</p>
        </div>
        <div>
          <h4 className="font-semibold text-sm text-gray-800 dark:text-gray-200">Technical Action</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">{page.technical_action}</p>
        </div>
      </div>
    </div>
  );
};


const PagesListTable = () => {
  const [activeTab, setActiveTab] = useState<(PerformanceTier | "All Pages")>(TABS[0]);
  const [dateRange, setDateRange] = useState(DATE_RANGES[1].value); // Default to 30 days
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const tier = activeTab === "All Pages" ? "" : activeTab;
        const response = await fetch(`/api/pages/tiers?tier=${tier}&days=${dateRange}`);
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        setPages(data);
      } catch (error) {
        console.error("Error fetching pages:", error);
        setPages([]); // Clear pages on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [activeTab, dateRange]);

  const handleTabClick = (tab: PerformanceTier | "All Pages") => {
    setActiveTab(tab);
  };

  const handleRowToggle = (url: string) => {
    setExpandedRow(expandedRow === url ? null : url);
  };

  if (isLoading) {
    return <PagesListTableSkeleton />;
  }

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* Tabs & Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-4">
        <div className="flex items-center space-x-2 overflow-x-auto pb-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap",
                activeTab === tab
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                  : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Date Range:</span>
          {DATE_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setDateRange(range.value)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-full transition-colors",
                dateRange === range.value
                  ? "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-700"
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Page</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Performance Tier</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Clicks Change</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Reasoning</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {!isLoading && pages.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No pages found for this tier.
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <React.Fragment key={page.url}>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={page.title}>{page.title}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <Link href={page.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {page.url}
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TierPill tier={page.performance_tier} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800 dark:text-gray-200">
                      {page.performance_score.toFixed(0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <PriorityPill priority={page.performance_priority} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {/* ADD THIS CONDITIONAL CHECK */}
                      {page.metrics?.kpis?.clicksChange !== undefined ? (
                        <div className={cn(
                          "flex items-center",
                          page.metrics.kpis.clicksChange >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {page.metrics.kpis.clicksChange >= 0 ? (
                            <ArrowUp className="w-4 h-4 mr-1 flex-shrink-0" />
                          ) : (
                            <ArrowDown className="w-4 h-4 mr-1 flex-shrink-0" />
                          )}
                          <span>{Math.abs(page.metrics.kpis.clicksChange * 100).toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                      {page.performance_reasoning}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={() => handleRowToggle(page.url)} className="text-blue-600 hover:text-blue-800">
                        <ChevronDown className={cn("w-5 h-5 transition-transform", expandedRow === page.url && "rotate-180")} />
                      </button>
                    </td>
                  </tr>
                  {expandedRow === page.url && (
                    <tr>
                      <td colSpan={7}>
                        <ExpandableRow page={page} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PagesListTable;
