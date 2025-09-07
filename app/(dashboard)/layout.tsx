'use client';

import React from 'react';
import { ICONS } from '@/components/icons';
import FirebaseDebug from '@/components/FirebaseDebug';
import EnvDebug from '@/components/EnvDebug';
import { useAuth } from '@/contexts/auth-context';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { name: 'Dashboard', icon: ICONS.DASHBOARD, href: '#' },
  { name: 'Reports', icon: ICONS.REPORTS, href: '#' },
  { name: 'Performance Tiers', icon: ICONS.REPORTS, href: '/performance' },
  { name: 'AI Companion', icon: ICONS.AI_COMPANION, href: '#' },
  { name: 'Settings', icon: ICONS.SETTINGS, href: '#' },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-300 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-300 flex items-center justify-center">
        <div className="text-center">
          <p>Please log in to access the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300">
      <FirebaseDebug />
      <EnvDebug />
      <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 bg-gray-800 border-r border-gray-700">
        <div className="flex items-center h-16 px-6 flex-shrink-0">
          <h1 className="text-2xl font-bold text-white">SeoEdge</h1>
        </div>
        <nav className="flex-grow px-4 py-4">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.name}>
                <a
                  href={item.href}
                  className={`flex items-center space-x-3 p-3 rounded-md transition-colors duration-200 ${
                    item.name === 'Dashboard'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <main className="md:ml-64 p-6 md:p-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
