'use client';

import React, { useEffect, useState, useMemo } from 'react';

interface PageLoss {
  page: string;
  previousClicks: number;
  currentClicks: number;
  changePercentage: number;
}

type SortKey = keyof PageLoss;
type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

const SortableHeader = ({ title, columnKey, sortConfig, requestSort }: { title: string, columnKey: SortKey, sortConfig: SortConfig | null, requestSort: (key: SortKey) => void }) => {
  const isSorted = sortConfig?.key === columnKey;
  const arrow = isSorted ? (sortConfig?.direction === 'ascending' ? '▲' : '▼') : '';
  return (
    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => requestSort(columnKey)}>
      {title} <span className="ml-1">{arrow}</span>
    </th>
  );
};

const LosingPagesTable: React.FC = () => {
  const [data, setData] = useState<PageLoss[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'changePercentage', direction: 'ascending' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const formatDate = (d: Date) => d.toISOString().split('T')[0];
        const now = new Date();
        const currentEnd = new Date(now);
        const currentStart = new Date(now);
        currentStart.setDate(now.getDate() - 28);
        const previousEnd = new Date(currentStart);
        previousEnd.setDate(previousEnd.getDate() - 1);
        const previousStart = new Date(previousEnd);
        previousStart.setDate(previousEnd.getDate() - 28);

        const params = new URLSearchParams({
          currentStartDate: formatDate(currentStart),
          currentEndDate: formatDate(currentEnd),
          previousStartDate: formatDate(previousStart),
          previousEndDate: formatDate(previousEnd),
          threshold: '0.3',
        });

        const response = await fetch(`/api/pages/losses?${params}`);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const result: PageLoss[] = await response.json();
        setData(result);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [data, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const TableSkeleton = () => (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 animate-pulse">
      <div className="h-8 bg-gray-700 rounded mb-4"></div>
      <div className="space-y-2">
        <div className="h-6 bg-gray-700 rounded"></div>
        <div className="h-6 bg-gray-700 rounded"></div>
        <div className="h-6 bg-gray-700 rounded"></div>
      </div>
    </div>
  );

  if (loading) return <TableSkeleton />;
  if (error) return <div className="bg-red-900/50 text-red-300 p-4 rounded-lg">Error: {error}</div>;

  return (
    <section>
      <h2 className='text-xl font-semibold text-white mb-4'>Top Losing Pages</h2>
      <div className="bg-gray-800 rounded-lg overflow-x-auto border border-gray-700">
        <table className="min-w-full">
          <thead className="bg-gray-700/50">
            <tr>
              <SortableHeader title="Page URL" columnKey="page" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader title="Previous Clicks" columnKey="previousClicks" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader title="Current Clicks" columnKey="currentClicks" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader title="Change %" columnKey="changePercentage" sortConfig={sortConfig} requestSort={requestSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedData.length === 0 ? (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">No pages with significant traffic loss found.</td></tr>
            ) : (
              sortedData.map((item) => (
                <tr key={item.page} className="hover:bg-gray-700/50 transition-colors duration-200">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.page}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.previousClicks.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.currentClicks.toLocaleString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-400">{item.changePercentage.toFixed(1)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default LosingPagesTable;