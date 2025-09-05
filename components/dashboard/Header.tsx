'use client';

import React, { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { TrendingUp, Activity, AlertTriangle, CheckCircle } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  message: string;
  lastUpdated?: string;
}

const Header: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({
    status: 'healthy',
    message: 'All systems operational'
  });

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      // The auth state listener in DashboardLayout will handle the redirect.
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  // Simple health check (you can connect this to your diagnostics API later)
  const checkSystemHealth = async () => {
    try {
      const response = await fetch('/api/diagnostics');
      if (response.ok) {
        const data = await response.json();
        setHealthStatus({
          status: data.overallHealth === 'healthy' ? 'healthy' :
                  data.overallHealth === 'needs-attention' ? 'warning' : 'critical',
          message: data.issues.length > 0 ? `${data.issues.length} issues detected` : 'All systems operational',
          lastUpdated: new Date().toLocaleTimeString()
        });
      }
    } catch (error) {
      setHealthStatus({
        status: 'warning',
        message: 'Unable to check system status',
        lastUpdated: new Date().toLocaleTimeString()
      });
    }
  };

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case 'healthy': return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'warning': return 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30';
      case 'critical': return 'text-red-400 bg-red-900/20 border-red-500/30';
    }
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">SeoEdge</h1>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-400">
            <Activity className="w-4 h-4" />
            <span>Analytics Dashboard</span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* System Health Status */}
          <button
            onClick={checkSystemHealth}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-sm ${getStatusColor()}`}
          >
            {getStatusIcon()}
            <span>{healthStatus.message}</span>
          </button>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Refresh Data
            </button>
            <button
              onClick={handleSignOut}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>

          {/* Site Info */}
          <div className="hidden lg:flex flex-col items-end text-right">
            <div className="text-sm font-medium text-white">HypeFresh</div>
            <div className="text-xs text-gray-400">hypefresh.com</div>
            {healthStatus.lastUpdated && (
              <div className="text-xs text-gray-500">Updated: {healthStatus.lastUpdated}</div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
