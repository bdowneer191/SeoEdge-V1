import React from 'react';
import { ICONS } from '@/components/icons';

const Header: React.FC = () => {
  return (
    <header className="flex justify-between items-center p-4 bg-gray-900 text-white">
      <h1 className="text-3xl font-semibold text-white">Dashboard</h1>

      <div className="flex items-center space-x-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3">
            {ICONS.SEARCH}
          </span>
          <input
            type="text"
            placeholder="Search..."
            className="bg-gray-800 border border-gray-700 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button className="p-2 rounded-full hover:bg-gray-800">
          {ICONS.BELL}
        </button>

        {/* User Avatar Placeholder */}
        <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
      </div>
    </header>
  );
};

export default Header;
