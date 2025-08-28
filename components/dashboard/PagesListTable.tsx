"use client";

import React, { useState, useEffect } from 'react';
import PagesListTableSkeleton from './PagesListTableSkeleton';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Minus,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import Link from 'next/link';

// Define the type for a page object
type Page = {
  url: string;
  title: string;
  performance_tier: 'Winners' | 'Declining' | 'Opportunities' | 'Stable';
  performance_reason: string;
  metrics: {
    change: {
      clicks: number;
    }
  }
};

const TABS = ["All Pages", "Winners", "Declining", "Opportunities", "Stable"];
const DATE_RANGES = [
  { label: "Last 7 Days", value: 7 },
  { label: "Last 30 Days", value: 30 },
  { label: "Last 90 Days", value: 90 },
  { label: "Last 365 Days", value: 365 },
];

// Helper component for rendering the tier pill
const tierStyles = {
  Winners: {
    icon: TrendingUp,
    bgColor: 'bg-green-100 dark:bg-green-900/50',
    textColor: 'text-green-700 dark:text-green-300',
  },
  Declining: {
    icon: TrendingDown,
    bgColor: 'bg-red-100 dark:bg-red-900/50',
    textColor: 'text-red-700 dark:text-red-300',
  },
  Opportunities: {
    icon: Lightbulb,
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/50',
    textColor: 'text-yellow-700 dark:text-yellow-300',
  },
  Stable: {
    icon: Minus,
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    textColor: 'text-gray-600 dark:text-gray-300',
  },
};

const TierPill = ({ tier }: { tier: Page['performance_tier'] }) => {
  // Fallback for unexpected tier values
  const styles = tierStyles[tier] || tierStyles.Stable;
  const Icon = styles.icon;

  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', styles.bgColor, styles.textColor)}>
      <Icon className="w-4 h-4 mr-1.5" />
      {tier}
    </span>
  );
};


const PagesListTable = () => {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [dateRange, setDateRange] = useState(DATE_RANGES[1].value); // Default to 30 days
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
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
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Page
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Performance Tier
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Change vs Baseline
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Reason
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {!isLoading && pages.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No pages found for this tier.
                </td>
              </tr>
            ) : (
              pages.map((page) => (
                <tr key={page.url}>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className={cn(
                      "flex items-center",
                      page.metrics.change.clicks >= 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {page.metrics.change.clicks >= 0 ? (
                        <ArrowUp className="w-4 h-4 mr-1 flex-shrink-0" />
                      ) : (
                        <ArrowDown className="w-4 h-4 mr-1 flex-shrink-0" />
                      )}
                      <span>{Math.abs(page.metrics.change.clicks * 100).toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {page.performance_reason}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PagesListTable;
