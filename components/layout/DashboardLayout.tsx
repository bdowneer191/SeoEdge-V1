import React from 'react';

// Define the props interface for type safety, as per requirement R1.
interface DashboardLayoutProps {
  children: React.ReactNode;
}

/**
 * A modern, dark-themed, responsive sidebar layout for the SeoEdge application.
 * This component acts as the main shell for the entire dashboard.
 */
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    // Root element styling from the styling_guide.
    <div className="min-h-screen bg-gray-900 text-gray-200">
      {/* Sidebar styling and structure from the styling_guide. */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-gray-800 p-4">
        <div className="flex-shrink-0">
          {/* Main project title, as per requirement R3 and styling_guide. */}
          <h1 className="text-2xl font-bold text-white">SeoEdge</h1>
        </div>
        <nav className="mt-10 flex-grow">
          {/* Navigation links, as per requirement R4 and styling_guide. */}
          <a href="#" className="flex items-center p-2 text-gray-400 hover:text-white">
            <span className="mr-3">[D]</span>
            Dashboard
          </a>
          <a href="#" className="flex items-center p-2 mt-4 text-gray-400 hover:text-white">
            <span className="mr-3">[R]</span>
            Reports
          </a>
          <a href="#" className="flex items-center p-2 mt-4 text-gray-400 hover:text-white">
            <span className="mr-3">[A]</span>
            AI Companion
          </a>
          <a href="#" className="flex items-center p-2 mt-4 text-gray-400 hover:text-white">
            <span className="mr-3">[S]</span>
            Settings
          </a>
        </nav>
      </aside>

      {/* Main content area styling from the styling_guide. */}
      {/* Renders children as per requirement R1. */}
      <main className="md:ml-64 p-6 md:p-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;