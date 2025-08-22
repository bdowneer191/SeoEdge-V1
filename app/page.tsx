import React from 'react';
import SiteSummary from '@/components/dashboard/SiteSummary';
import LosingPagesTable from '@/components/dashboard/LosingPagesTable';

export default function HomePage() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">An overview of your site's SEO performance.</p>
      </header>
      <div className="space-y-8">
        <SiteSummary />
        <LosingPagesTable />
      </div>
    </>
  );
}