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

// --- Adaptive Health Score Calculation ---
const calculateAdaptiveHealthScore = (stats: DashboardStats, dataPoints: number): HealthScore => {
    console.log('Calculating adaptive health score with:', { dataPoints, stats });

    const { metrics } = stats;

    // Get metric values with fallbacks
    const avgPosition = metrics?.averagePosition?.benchmarks?.historicalAvg || 25;
    const avgCtr = metrics?.averageCtr?.benchmarks?.historicalAvg || 0.025;
    const totalClicks = metrics?.totalClicks?.benchmarks?.historicalAvg || 50;
    const totalImpressions = metrics?.totalImpressions?.benchmarks?.historicalAvg || 1500;

    console.log('Using metrics:', { avgPosition, avgCtr, totalClicks, totalImpressions });

    // Technical Score (based on position) - Lower position is better
    let technicalScore = 0;
    if (avgPosition <= 3) technicalScore = 95;
    else if (avgPosition <= 5) technicalScore = 85;
    else if (avgPosition <= 10) technicalScore = 70;
    else if (avgPosition <= 15) technicalScore = 55;
    else if (avgPosition <= 25) technicalScore = 40;
    else if (avgPosition <= 50) technicalScore = 25;
    else technicalScore = 15;

    // Content Score (based on CTR) - Higher CTR is better
    let contentScore = 0;
    if (avgCtr >= 0.08) contentScore = 95;
    else if (avgCtr >= 0.06) contentScore = 85;
    else if (avgCtr >= 0.04) contentScore = 70;
    else if (avgCtr >= 0.025) contentScore = 55;
    else if (avgCtr >= 0.015) contentScore = 40;
    else contentScore = 25;

    // User Experience Score (engagement-based)
    const engagementRatio = totalImpressions > 0 ? (totalClicks / totalImpressions) : avgCtr;
    let uxScore = Math.min(95, Math.max(15, Math.round(engagementRatio * 1000 + 20)));

    // Authority Score (visibility and performance based)
    let authorityScore = 40; // Base score
    if (totalImpressions > 2000) authorityScore += 20;
    else if (totalImpressions > 1000) authorityScore += 15;
    else if (totalImpressions > 500) authorityScore += 10;

    if (totalClicks > 100) authorityScore += 15;
    else if (totalClicks > 50) authorityScore += 10;
    else if (totalClicks > 20) authorityScore += 5;

    if (avgPosition < 10) authorityScore += 15;
    else if (avgPosition < 20) authorityScore += 10;

    authorityScore = Math.min(95, Math.max(15, authorityScore));

    // Apply confidence penalty for limited data
    const confidenceMultiplier = dataPoints >= 14 ? 1.0 :
                                dataPoints >= 7 ? 0.85 :
                                dataPoints >= 3 ? 0.75 : 0.65;

    technicalScore = Math.round(technicalScore * confidenceMultiplier);
    contentScore = Math.round(contentScore * confidenceMultiplier);
    uxScore = Math.round(uxScore * confidenceMultiplier);
    authorityScore = Math.round(authorityScore * confidenceMultiplier);

    const overallScore = Math.round(
        (technicalScore * 0.3) +
        (contentScore * 0.3) +
        (uxScore * 0.25) +
        (authorityScore * 0.15)
    );

    const confidenceLevel = dataPoints >= 14 ? 'High' :
                           dataPoints >= 7 ? 'Medium' :
                           dataPoints >= 3 ? 'Limited' : 'Very Limited';

    const result = {
        overall: overallScore,
        technical: {
            score: technicalScore,
            details: `Ranking-based assessment: Avg. position ${avgPosition.toFixed(1)}. Data confidence: ${confidenceLevel}.`
        },
        content: {
            score: contentScore,
            details: `Content engagement: ${(avgCtr * 100).toFixed(2)}% CTR from ${dataPoints} days of data. Confidence: ${confidenceLevel}.`
        },
        userExperience: {
            score: uxScore,
            details: `User interaction score: ${(engagementRatio * 100).toFixed(2)}% engagement rate. Based on ${dataPoints} days of analysis.`
        },
        authority: {
            score: authorityScore,
            details: `Domain presence: ${totalImpressions.toLocaleString()} impressions, ${totalClicks.toLocaleString()} clicks. Assessment confidence: ${confidenceLevel}.`
        }
    };

    console.log('Calculated health score:', result);
    return result;
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
const TrafficHealthScore: React.FC<{ data: any }> = ({ data: stats }) => {

    const renderContent = () => {
        if (!stats) {
            return (
                <div className="text-center py-12 text-gray-400">
                    <Activity className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                    <p>Could not load dashboard stats.</p>
                </div>
            );
        }

        const dataPoints = stats.dataPointsAnalyzed || 90; // We are using 90 days of data
        console.log('Rendering with dataPoints:', dataPoints, 'stats:', stats);

        // Force adaptive calculation if we have ANY data
        const healthScore = stats.healthScore || (dataPoints >= 1 ? calculateAdaptiveHealthScore(stats, dataPoints) : null);

        // Determine confidence level and status
        const getAnalysisStatus = (points: number) => {
            if (points >= 14) return { level: 'Full Analysis', color: 'bg-green-400', confidence: 'High' };
            if (points >= 7) return { level: 'Developing Profile', color: 'bg-yellow-400', confidence: 'Medium' };
            if (points >= 3) return { level: 'Early Assessment', color: 'bg-orange-400', confidence: 'Limited' };
            if (points >= 1) return { level: 'Initial Data', color: 'bg-blue-400', confidence: 'Preliminary' };
            return { level: 'Insufficient Data', color: 'bg-red-400', confidence: 'None' };
        };

        const analysisStatus = getAnalysisStatus(dataPoints);
        console.log('Analysis status:', analysisStatus, 'Health score available:', !!healthScore);

        return (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 shadow-xl">
                {/* Header with adaptive status indicator */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-semibold text-white mb-1">Site Health Analysis</h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <div className={`w-2 h-2 rounded-full ${analysisStatus.color}`}></div>
                            <span>
                                {analysisStatus.level}
                                {dataPoints > 0 && ` • ${dataPoints} days analyzed`}
                            </span>
                        </div>
                    </div>
                    {dataPoints >= 1 && (
                        <div className="flex items-center space-x-1 text-xs">
                            {dataPoints >= 14 ? (
                                <div className="text-green-400 flex items-center space-x-1">
                                    <TrendingUp className="w-4 h-4" />
                                    <span>Complete Profile</span>
                                </div>
                            ) : (
                                <div className="text-blue-400 flex items-center space-x-1">
                                    <Activity className="w-4 h-4" />
                                    <span>Building Profile</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row items-center lg:items-start lg:space-x-8">
                    {/* Left Column - Overall Score */}
                    <div className="flex-shrink-0 flex flex-col items-center mb-8 lg:mb-0">
                        <CircularProgressBar
                            score={healthScore?.overall ?? null}
                            loading={false}
                        />
                        <p className="mt-4 text-sm text-gray-400 text-center max-w-xs">
                            {healthScore ? (
                                dataPoints >= 14
                                    ? 'Comprehensive health assessment with high confidence.'
                                    : `${analysisStatus.confidence} confidence assessment from ${dataPoints} days of data. Accuracy improves with more data.`
                            ) : (
                                'Waiting for initial data collection. Health scores will appear once data is available.'
                            )}
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
                                <SubScoreItem
                                    icon={<Activity />}
                                    title="User Experience"
                                    score={healthScore.userExperience.score}
                                    details={healthScore.userExperience.details}
                                />

                                {/* Show improvement notice for limited data */}
                                {dataPoints < 14 && (
                                    <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                                        <div className="flex items-center space-x-2 text-blue-300 text-sm">
                                            <TrendingUp className="w-4 h-4" />
                                            <span className="font-semibold">Scores will improve with more data</span>
                                        </div>
                                        <p className="text-xs text-blue-200/80 mt-1">
                                            {dataPoints < 7
                                                ? `Need ${7 - dataPoints} more days for medium confidence, ${14 - dataPoints} more for high confidence.`
                                                : `Need ${14 - dataPoints} more days for high confidence analysis.`
                                            }
                                        </p>
                                        <div className="flex items-center mt-2 space-x-4 text-xs">
                                            <div className="flex items-center space-x-1">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                                <span>Current: {analysisStatus.confidence}</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                                <span>7+ days: Medium</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                <span>14+ days: High</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-12 px-6">
                                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-6">
                                    <Hourglass className="w-12 h-12 mx-auto mb-4 text-blue-400" />
                                    <h4 className="text-lg font-semibold text-white mb-2">Starting Health Analysis</h4>
                                    <p className="text-gray-400 mb-4">
                                        We're beginning to collect data for your site health assessment.
                                        Initial insights will be available within 1-2 days.
                                    </p>
                                    <div className="grid grid-cols-4 gap-3 mt-6 text-xs">
                                        <div className="text-center">
                                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <span className="text-blue-400 font-bold">1+</span>
                                            </div>
                                            <p className="text-blue-300">First Insights</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <span className="text-orange-400 font-bold">3+</span>
                                            </div>
                                            <p className="text-orange-300">Early Assessment</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <span className="text-yellow-400 font-bold">7+</span>
                                            </div>
                                            <p className="text-yellow-300">Medium Confidence</p>
                                        </div>
                                        <div className="text-center">
                                            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                                                <span className="text-green-400 font-bold">14+</span>
                                            </div>
                                            <p className="text-green-300">High Confidence</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer with last updated info and data collection status */}
                <div className="mt-6 pt-4 border-t border-gray-700">
                    <div className="flex justify-between items-center text-xs text-gray-500">
                        {stats.lastUpdated && (
                            <span>Last updated: {new Date(stats.lastUpdated).toLocaleString()}</span>
                        )}
                        {dataPoints > 0 && (
                            <span className="flex items-center space-x-1">
                                <Activity className="w-3 h-3" />
                                <span>Data confidence: {analysisStatus.confidence}</span>
                            </span>
                        )}
                    </div>
                </div>
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
