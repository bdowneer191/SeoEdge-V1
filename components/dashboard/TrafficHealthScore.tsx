'use client';

import React, { useEffect, useState } from 'react';
import { ICONS } from '@/components/icons';
import { Hourglass, Activity, TrendingUp } from 'lucide-react';

// --- Interfaces to match the backend structure ---
interface HealthScoreComponent {
    score: number;
    details: string;
}

interface HealthScore {
    overall: number;
    technical: HealthScoreComponent;
    content: HealthScoreComponent;
    authority: HealthScoreComponent;
    userExperience: HealthScoreComponent;
}

interface SmartMetric {
    isAnomaly: boolean | null;
    message: string | null;
    trend: 'up' | 'down' | 'stable' | null;
    trendConfidence: number | null;
    thirtyDayForecast: number | null;
    benchmarks: {
        industry: number;
        competitors: number;
        historicalAvg: number;
    };
    recommendations: string[];
}

interface DashboardStats {
    status: 'success' | 'error' | 'pending_data';
    metrics?: { [key: string]: SmartMetric };
    healthScore?: HealthScore | null;
    message?: string;
    lastUpdated: string;
    dataPointsAnalyzed?: number;
    analysisQuality?: {
        trendAnalysis: 'available' | 'limited';
        anomalyDetection: 'available' | 'limited';
        healthScore: 'available' | 'pending';
        recommendations: 'available';
    };
}

// --- Helper Functions ---
const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
};

const getScoreBgColor = (score: number): string => {
    if (score >= 80) return 'bg-green-400';
    if (score >= 60) return 'bg-yellow-400';
    if (score >= 40) return 'bg-orange-400';
    return 'bg-red-400';
};

const getScoreStrokeColor = (score: number): string => {
    if (score >= 80) return 'stroke-green-400';
    if (score >= 60) return 'stroke-yellow-400';
    if (score >= 40) return 'stroke-orange-400';
    return 'stroke-red-400';
};

// --- Enhanced Sub-components ---
const CircularProgressBar = ({ score, loading }: { score: number | null, loading: boolean }) => {
    const size = 180;
    const strokeWidth = 14;
    const center = size / 2;
    const radius = center - strokeWidth / 2;
    const circumference = 2 * Math.PI * radius;

    if (loading || score === null) {
        return (
            <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                <svg className="absolute" width={size} height={size}>
                    <circle
                        className="stroke-gray-700"
                        cx={center}
                        cy={center}
                        r={radius}
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                </svg>
                <div className="flex flex-col items-center">
                    <Hourglass className="w-12 h-12 text-blue-400 animate-spin mb-2" />
                    <span className="text-sm text-gray-400">Calculating...</span>
                </div>
            </div>
        );
    }

    const offset = circumference - (score / 100) * circumference;
    const strokeColorClass = getScoreStrokeColor(score);
    const textColorClass = getScoreColor(score);

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg className="absolute transform -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                    className="stroke-gray-700"
                    cx={center}
                    cy={center}
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <circle
                    className={`${strokeColorClass} transition-all duration-1000 ease-in-out`}
                    cx={center}
                    cy={center}
                    r={radius}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                />
            </svg>
            <div className="flex flex-col items-center">
                <span className={`text-5xl font-bold ${textColorClass}`}>{score}</span>
                <span className="text-sm text-gray-400 mt-1">Overall</span>
            </div>
        </div>
    );
};

const SubScoreItem = ({
    icon,
    title,
    score,
    details
}: {
    icon: React.ReactNode;
    title: string;
    score: number;
    details: string;
}) => {
    const colorClass = getScoreColor(score);
    const bgColorClass = getScoreBgColor(score);

    return (
        <div className="flex items-start space-x-4 p-4 bg-gray-750 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors duration-200">
            <div className={`p-3 rounded-full ${bgColorClass}/20 flex-shrink-0`}>
                {React.cloneElement(icon as React.ReactElement, {
                    className: `w-6 h-6 ${colorClass}`
                })}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-white text-sm">{title}</h4>
                    <div className="flex items-center space-x-1">
                        <span className={`text-2xl font-bold ${colorClass}`}>{score}</span>
                        <span className="text-sm text-gray-500">/100</span>
                    </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{details}</p>

                {/* Progress bar for sub-score */}
                <div className="mt-3">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className={`h-2 rounded-full transition-all duration-1000 ease-in-out ${bgColorClass}`}
                            style={{ width: `${score}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const HealthScoreSkeleton = () => (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 animate-pulse">
        <div className="flex flex-col lg:flex-row items-center lg:items-start lg:space-x-8">
            {/* Left side - circular progress skeleton */}
            <div className="flex-shrink-0 flex flex-col items-center mb-8 lg:mb-0">
                <div className="w-44 h-44 bg-gray-700 rounded-full flex items-center justify-center">
                    <div className="w-32 h-32 bg-gray-600 rounded-full"></div>
                </div>
                <div className="h-4 bg-gray-700 rounded w-24 mt-4"></div>
            </div>

            {/* Right side - sub-scores skeleton */}
            <div className="w-full space-y-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-start space-x-4 p-4 bg-gray-750 rounded-lg border border-gray-600">
                        <div className="w-12 h-12 bg-gray-600 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-center">
                                <div className="h-4 bg-gray-600 rounded w-32"></div>
                                <div className="h-6 bg-gray-600 rounded w-16"></div>
                            </div>
                            <div className="h-3 bg-gray-600 rounded w-full"></div>
                            <div className="h-3 bg-gray-600 rounded w-3/4"></div>
                            <div className="h-2 bg-gray-700 rounded-full w-full">
                                <div className="h-2 bg-gray-600 rounded-full w-1/2"></div>
                            </div>
                        </div>
                    </div>
                ))}
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

        if (error) {
            return (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-6 rounded-lg flex items-start space-x-3">
                    <Activity className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold mb-1">Error Loading Health Score</h4>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            );
        }

        if (!stats) {
            return (
                <div className="text-center py-12 text-gray-400">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <p>Could not load dashboard stats.</p>
                </div>
            );
        }

        const { healthScore, analysisQuality } = stats;

        return (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 shadow-xl">
                {/* Header with status indicator */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-1">Site Health Analysis</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <div className={`w-2 h-2 rounded-full ${healthScore ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
                            <span>
                                {healthScore ? 'Analysis Complete' : 'Collecting Data'}
                                {stats.dataPointsAnalyzed && ` • ${stats.dataPointsAnalyzed} days analyzed`}
                            </span>
                        </div>
                    </div>
                    {analysisQuality?.healthScore === 'available' && (
                        <div className="flex items-center space-x-1 text-xs text-green-400">
                            <TrendingUp className="w-4 h-4" />
                            <span>Full Analysis</span>
                        </div>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row items-center lg:items-start lg:space-x-8">
                    {/* Left Column - Overall Score */}
                    <div className="flex-shrink-0 flex flex-col items-center mb-8 lg:mb-0">
                        <CircularProgressBar
                            score={healthScore?.overall ?? null}
                            loading={loading}
                        />
                        <p className="mt-4 text-sm text-gray-400 text-center max-w-xs">
                            {healthScore
                                ? 'Comprehensive health assessment based on technical performance, content quality, and authority metrics.'
                                : 'Health score will be available once sufficient data is collected (typically 14+ days).'
                            }
                        </p>
                    </div>

                    {/* Right Column - Sub-scores */}
                    <div className="w-full space-y-4">
                        {healthScore ? (
                            <>
                                <SubScoreItem
                                    icon={ICONS.HEALTH_TECHNICAL}
                                    title="Technical Health"
                                    score={healthScore.technical.score}
                                    details={healthScore.technical.details}
                                />
                                <SubScoreItem
                                    icon={ICONS.HEALTH_CONTENT}
                                    title="Content Quality"
                                    score={healthScore.content.score}
                                    details={healthScore.content.details}
                                />
                                <SubScoreItem
                                    icon={ICONS.HEALTH_AUTHORITY}
                                    title="Domain Authority"
                                    score={healthScore.authority.score}
                                    details={healthScore.authority.details}
                                />
                                {healthScore.userExperience && (
                                    <SubScoreItem
                                        icon={<Activity />}
                                        title="User Experience"
                                        score={healthScore.userExperience.score}
                                        details={healthScore.userExperience.details}
                                    />
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12 px-6">
                                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6">
                                    <Hourglass className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                                    <h4 className="text-lg font-semibold text-white mb-2">Building Your Health Score</h4>
                                    <p className="text-gray-400 mb-4">
                                        We need more daily data to calculate your comprehensive health score.
                                        This typically requires 14+ days of analytics data.
                                    </p>
                                    <p className="text-sm text-blue-300">
                                        Check back tomorrow for updates, or contact support if you believe this is an error.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer with last updated info */}
                {stats.lastUpdated && (
                    <div className="mt-6 pt-4 border-t border-gray-700">
                        <p className="text-xs text-gray-500 text-center">
                            Last updated: {new Date(stats.lastUpdated).toLocaleString()}
                        </p>
                    </div>
                )}
            </div>
        );
    };

    return (
        <section>
            <h2 className='text-2xl font-semibold text-white mb-6 flex items-center space-x-2'>
                <Activity className="w-7 h-7 text-blue-400" />
                <span>Traffic Health Score</span>
            </h2>
            {renderContent()}
        </section>
    );
};

export default TrafficHealthScore;
