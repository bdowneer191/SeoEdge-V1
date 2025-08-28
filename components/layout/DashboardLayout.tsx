import React from 'react';
import { ICONS } from '@/components/icons';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navItems = [
    { name: 'Dashboard', icon: ICONS.DASHBOARD, href: '#' },
    { name: 'Reports', icon: ICONS.REPORTS, href: '#' },
    { name: 'AI Companion', icon: ICONS.AI_COMPANION, href: '#' },
    { name: 'Settings', icon: ICONS.SETTINGS, href: '#' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-gray-300">
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