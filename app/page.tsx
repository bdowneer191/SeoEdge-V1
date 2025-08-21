import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SiteSummary from '@/components/dashboard/SiteSummary';
import LosingPagesTable from '@/components/dashboard/LosingPagesTable';

export default function HomePage() {
  return (
    <DashboardLayout>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-600 mt-1">An overview of your site's SEO performance.</p>
      </header>
      <div className="space-y-8">
        <SiteSummary />
        <LosingPagesTable />
      </div>
    </DashboardLayout>
  );
}