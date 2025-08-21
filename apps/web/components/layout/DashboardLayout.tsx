import React from 'react';
import Link from 'next/link';
import { LayoutDashboard, FileText, Database, Settings } from 'lucide-react';

// Define the navigation links in a configuration array for easier management
const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { href: '/reports', label: 'Reports', icon: <FileText size={20} /> },
  { href: '/data-sources', label: 'Data Sources', icon: <Database size={20} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

/**
 * Main application layout for the SeoEdge dashboard.
 *
 * This component establishes the primary UI structure, featuring a fixed-left sidebar
 * for navigation and a main content area. It is designed to be a static, responsive,
 * and server-rendered component using a dark-mode-first theme with Tailwind CSS.
 * It uses Next.js <Link> for client-side navigation and lucide-react for icons.
 *
 * @param {object} props - The properties for the component.
 * @param {React.ReactNode} props.children - The child elements to be rendered in the main content area.
 * @returns {JSX.Element} The rendered dashboard layout.
 */
const DashboardLayout = ({ children }: { children: React.ReactNode }): JSX.Element => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar - visible on medium screens and up */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-gray-800 p-4 border-r border-gray-700">
        <div className="flex items-center mb-8 h-10">
          <Link href="/dashboard" className="flex items-center space-x-2">
            {/* You can replace this with a logo SVG in the future */}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>
            <h1 className="text-2xl font-bold text-white">SeoEdge</h1>
          </Link>
        </div>
        <nav className="flex-1 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex items-center space-x-3 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors duration-200 p-2 rounded-lg"
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* The title can be passed as a prop for dynamic page headers */}
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;