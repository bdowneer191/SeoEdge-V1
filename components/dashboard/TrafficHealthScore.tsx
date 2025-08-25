'use client';

import React, { useEffect, useState } from 'react';
import { ICONS } from '@/components/icons';
import { Hourglass } from 'lucide-react';

// --- Interfaces to match the adaptive backend ---
interface HealthSubScore {
    score: number;
    details: string;
}
interface HealthScore {
    overall: number;
    technical: HealthSubScore;
    content: HealthSubScore;
    authority: HealthSubScore;
}
interface SmartMetric {
    isAnomaly: boolean | null;
    message: string | null;
    trend: 'up' | 'down' | 'stable' | null;
    // ... other fields
}
interface DashboardStats {
  status: 'success' | 'pending_data';
  metrics?: { [key: string]: SmartMetric };
  healthScore?: HealthScore | null;
  message?: string;
  daysFound?: number;
  lastUpdated: string;
}

// --- Helper Functions ---
const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-500';
};

// --- Sub-components ---
const CircularProgressBar = ({ score, loading }: { score: number | null, loading: boolean }) => {
    const size = 160;
    const strokeWidth = 12;
    const center = size / 2;
    const radius = center - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;

    if (loading || score === null) {
        return (
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg className="absolute" width={size} height={size}><circle className="stroke-gray-700" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} fill="none" /></svg>
                <Hourglass className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
        );
    }

    const offset = circumference - (score / 100) * circumference;
    const colorClass = getScoreColor(score).replace('text-', 'stroke-');

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="absolute" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle className="stroke-gray-700" cx={center} cy={center} r={radius} strokeWidth={strokeWidth} fill="none" />
                <circle
                    className={`${colorClass} transition-all duration-1000 ease-in-out`}
                    cx={center} cy={center} r={radius} strokeWidth={strokeWidth} fill="none"
                    strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    transform={`rotate(-90 ${center} ${center})`}
                />
            </svg>
            <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score}</span>
        </div>
    );
};

const SubScoreItem = ({ icon, title, score, details }: { icon: React.ReactNode; title: string; score: number; details: string }) => (
    <div className="flex items-start space-x-4">
        <div className={`p-2 rounded-full ${getScoreColor(score).replace('text-','bg-')}/20`}>
            {React.cloneElement(icon as React.ReactElement, { className: `w-6 h-6 ${getScoreColor(score)}`})}
        </div>
        <div>
            <p className="font-semibold text-white">{title}</p>
            <p className={`text-2xl font-bold ${getScoreColor(score)}`}>{score}<span className="text-base font-normal text-gray-500">/100</span></p>
            <p className="text-xs text-gray-400 mt-1">{details}</p>
        </div>
    </div>
);

const HealthScoreSkeleton = () => (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 animate-pulse">
        <div className="flex flex-col md:flex-row items-center md:items-start md:space-x-8">
            <div className="flex-shrink-0 flex flex-col items-center"><div className="w-40 h-40 bg-gray-700 rounded-full"></div><div className="h-4 bg-gray-700 rounded w-24 mt-2"></div></div>
            <div className="w-full mt-6 md:mt-0 space-y-6">
                <div className="flex space-x-4"><div className="w-12 h-12 bg-gray-700 rounded-full"></div><div className="flex-1 space-y-2"><div className="h-4 bg-gray-700 rounded w-1/4"></div><div className="h-6 bg-gray-700 rounded w-1/2"></div><div className="h-3 bg-gray-700 rounded w-full"></div></div></div>
                <div className="flex space-x-4"><div className="w-12 h-12 bg-gray-700 rounded-full"></div><div className="flex-1 space-y-2"><div className="h-4 bg-gray-700 rounded w-1/4"></div><div className="h-6 bg-gray-700 rounded w-1/2"></div><div className="h-3 bg-gray-700 rounded w-full"></div></div></div>
                <div className="flex space-x-4"><div className="w-12 h-12 bg-gray-700 rounded-full"></div><div className="flex-1 space-y-2"><div className="h-4 bg-gray-700 rounded w-1/4"></div><div className="h-6 bg-gray-700 rounded w-1/2"></div><div className="h-3 bg-gray-700 rounded w-full"></div></div></div>
            </div>
        </div>
    </div>
);

// --- Main Component ---
const TrafficHealthScore: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/dashboard-stats');
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to fetch dashboard stats');
                }
                const result: DashboardStats = await response.json();
                setStats(result);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'An unknown error occurred');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const renderContent = () => {
        if (loading) return <HealthScoreSkeleton />;
        if (error) return <div className="bg-red-900/50 text-red-300 p-4 rounded-lg">Error: {error}</div>;
        if (!stats) return <div className="text-center py-8 text-gray-400">Could not load dashboard stats.</div>;

        const { healthScore } = stats;

        return (
             <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <div className="flex flex-col md:flex-row items-center md:items-start md:space-x-8">
                    <div className="flex-shrink-0 flex flex-col items-center mb-6 md:mb-0">
                        <CircularProgressBar score={healthScore?.overall ?? null} loading={loading} />
                        <p className="mt-2 text-sm text-gray-400">
                            {healthScore ? 'Overall Health' : 'Calculating...'}
                        </p>
                    </div>
                    <div className="w-full space-y-6">
                        {healthScore ? (
                            <>
                                <SubScoreItem icon={ICONS.HEALTH_TECHNICAL} title="Technical Health" score={healthScore.technical.score} details={healthScore.technical.details} />
                                <SubScoreItem icon={ICONS.HEALTH_CONTENT} title="Content Health" score={healthScore.content.score} details={healthScore.content.details} />
                                <SubScoreItem icon={ICONS.HEALTH_AUTHORITY} title="Authority" score={healthScore.authority.score} details={healthScore.authority.details} />
                            </>
                        ) : (
                            <div className="text-center py-10 text-gray-400">
                                <p>More daily data is needed to calculate the full health score.</p>
                                <p className="text-sm text-gray-500 mt-1">Check back tomorrow for an update.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <section>
            <h2 className='text-xl font-semibold text-white mb-4'>Traffic Health Score</h2>
            {renderContent()}
        </section>
    );
};

export default TrafficHealthScore;
