'use client';

import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SiteMetric {
    date: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
}

interface SummaryStats {
    totalClicks: number;
    totalImpressions: number;
    averageCtr: number;
    averagePosition: number;
}

const StatCard = ({ title, value }: { title: string; value: string | number }) => (
    <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
    </div>
);

export default function SiteSummary() {
    const [metrics, setMetrics] = useState<SiteMetric[]>([]);
    const [summary, setSummary] = useState<SummaryStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const endDate = new Date();
                const startDate = new Date();
                startDate.setDate(endDate.getDate() - 28);

                const format = (d: Date) => d.toISOString().split('T')[0];
                const params = new URLSearchParams({
                    startDate: format(startDate),
                    endDate: format(endDate),
                });
                
                const response = await fetch(`/api/metrics/site?${params}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch site metrics');
                }
                const data: SiteMetric[] = await response.json();
                setMetrics(data);

                if (data.length > 0) {
                    const totalClicks = data.reduce((sum, item) => sum + item.clicks, 0);
                    const totalImpressions = data.reduce((sum, item) => sum + item.impressions, 0);
                    const weightedPositionSum = data.reduce((sum, item) => sum + (item.position * item.impressions), 0);
                    
                    setSummary({
                        totalClicks,
                        totalImpressions,
                        averageCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) : 0,
                        averagePosition: totalImpressions > 0 ? (weightedPositionSum / totalImpressions) : 0,
                    });
                }

            } catch (err) {
                setError(err instanceof Error ? err.message : 'An unknown error occurred');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return <div className="text-center p-8">Loading summary...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-red-500">Error: {error}</div>;
    }

    return (
        <section>
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Site Performance (Last 28 Days)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Clicks" value={summary?.totalClicks.toLocaleString() ?? 'N/A'} />
                <StatCard title="Total Impressions" value={summary?.totalImpressions.toLocaleString() ?? 'N/A'} />
                <StatCard title="Average CTR" value={summary ? `${(summary.averageCtr * 100).toFixed(2)}%` : 'N/A'} />
                <StatCard title="Average Position" value={summary ? summary.averagePosition.toFixed(1) : 'N/A'} />
            </div>

            <div className="mt-8 bg-white p-6 rounded-lg shadow h-96">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="clicks" stroke="#8884d8" activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="impressions" stroke="#82ca9d" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}