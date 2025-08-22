import React from 'react';
import Header from '@/components/dashboard/Header';
import SiteSummary from '@/components/dashboard/SiteSummary';
import LosingPagesTable from '@/components/dashboard/LosingPagesTable';

export default function HomePage() {
  return (
    <>
      <Header />
      <div className="space-y-8 mt-8">
        <SiteSummary />
        <LosingPagesTable />
      </div>
    </>
  );
}