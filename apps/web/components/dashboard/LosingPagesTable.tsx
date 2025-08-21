'use client';

import React, { useState, useEffect, useMemo } from 'react';

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

const SortableHeader = ({ children, onClick, sortConfig, columnKey }: { children: React.ReactNode, onClick: () => void, sortConfig: SortConfig | null, columnKey: SortKey }) => {
    const isSorted = sortConfig?.key === columnKey;
    const arrow = isSorted ? (sortConfig?.direction === 'ascending' ? '▲' : '▼') : '';
    return (
        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={onClick}>
            {children} <span className="ml-1">{arrow}</span>
        </th>
    )
};

export default function LosingPagesTable() {
    const [pages, setPages] = useState<PageLoss[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'changePercentage', direction: 'ascending'});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const now = new Date();
                const currentEnd = new Date(now);
                const currentStart = new Date(now);
                currentStart.setDate(now.getDate() - 28);
                
                const previousEnd = new Date(currentStart);
                previousEnd.setDate(previousEnd.getDate() - 1);
                const previousStart = new Date(previousEnd);
                previousStart.setDate(previousEnd.getDate() - 28);
                
                const format = (d: Date) => d.toISOString().split('T')[0];
                const params = new URLSearchParams({
                    currentStartDate: format(currentStart),
                    currentEndDate: format(currentEnd),
                    previousStartDate: format(previousStart),
                    previousEndDate: format(previousEnd),
                    threshold: '0.3', // 30% drop threshold
                });
                
                const response = await fetch(`/api/pages/losses?${params}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch losing pages');
                }
                const data: PageLoss[] = await response.json();
                setPages(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    const sortedPages = useMemo(() => {
        let sortableItems = [...pages];
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
    }, [pages, sortConfig]);

    const requestSort = (key: SortKey) => {
        let direction: SortDirection = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading losing pages...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">Error: {error}</div>;
    }

    return (
        <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Top Losing Pages (Last 28 Days)</h2>
            <div className="bg-white p-6 rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <SortableHeader onClick={() => requestSort('page')} sortConfig={sortConfig} columnKey="page">Page URL</SortableHeader>
                            <SortableHeader onClick={() => requestSort('previousClicks')} sortConfig={sortConfig} columnKey="previousClicks">Previous Clicks</SortableHeader>
                            <SortableHeader onClick={() => requestSort('currentClicks')} sortConfig={sortConfig} columnKey="currentClicks">Current Clicks</SortableHeader>
                            <SortableHeader onClick={() => requestSort('changePercentage')} sortConfig={sortConfig} columnKey="changePercentage">Change %</SortableHeader>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedPages.length > 0 ? sortedPages.map(page => (
                            <tr key={page.page}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{page.page}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{page.previousClicks.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{page.currentClicks.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{page.changePercentage.toFixed(1)}%</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">No pages with significant traffic loss found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}