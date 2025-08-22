'use client';

import React, { useEffect, useState, useMemo } from 'react';

// Define TypeScript interfaces
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

// R4: Create a SortableHeader sub-component
const SortableHeader = ({
  sortKey,
  title,
  sortConfig,
  requestSort,
}: {
  sortKey: SortKey;
  title: string;
  sortConfig: SortConfig | null;
  requestSort: (key: SortKey) => void;
}) => {
  const isSorted = sortConfig?.key === sortKey;
  const directionIcon = sortConfig?.direction === 'ascending' ? '▲' : '▼';

  return (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer"
      onClick={() => requestSort(sortKey)}
    >
      {title} {isSorted ? directionIcon : ''}
    </th>
  );
};


const LosingPagesTable: React.FC = () => {
  const [data, setData] = useState<PageLoss[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'changePercentage', direction: 'ascending' });

  // R1: Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        const currentEndDate = new Date();
        const currentStartDate = new Date();
        currentStartDate.setDate(currentEndDate.getDate() - 28);

        const previousEndDate = new Date();
        previousEndDate.setDate(currentStartDate.getDate() - 1);
        const previousStartDate = new Date();
        previousStartDate.setDate(previousEndDate.getDate() - 28);

        const params = new URLSearchParams({
            currentStartDate: formatDate(currentStartDate),
            currentEndDate: formatDate(currentEndDate),
            previousStartDate: formatDate(previousStartDate),
            previousEndDate: formatDate(previousEndDate),
            threshold: '0.3',
        });

        const response = await fetch(`/api/pages/losses?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        const result: PageLoss[] = await response.json();
        setData(result);
      } catch (e) {
        setError(e as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // R3: Client-side sorting
  const sortedData = useMemo(() => {
    let sortableItems = [...data];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
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

  // R2: Loading state
  if (loading) {
    return <div className="text-white">Loading losing pages...</div>;
  }

  // R2: Error state
  if (error) {
    return <div className="text-red-500">Error: {error.message}</div>;
  }

  return (
    <section>
      <h2 className='text-xl font-semibold text-white mb-4'>Top Losing Pages</h2>
      <div className="bg-gray-800 rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-700/50">
            <tr>
              <SortableHeader sortKey="page" title="Page" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader sortKey="previousClicks" title="Previous Clicks" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader sortKey="currentClicks" title="Current Clicks" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader sortKey="changePercentage" title="Change %" sortConfig={sortConfig} requestSort={requestSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {/* R5: Empty state */}
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-400">
                  No pages with significant traffic loss found.
                </td>
              </tr>
            ) : (
              sortedData.map((item) => (
                <tr key={item.page} className="hover:bg-gray-700/50">
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