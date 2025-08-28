import React from 'react';
import Header from '@/components/dashboard/Header';
import SiteSummary from '@/components/dashboard/SiteSummary';
import LosingPagesTable from '@/components/dashboard/LosingPagesTable';
import TrafficHealthScore from '@/components/dashboard/TrafficHealthScore';

export default function HomePage() {
  return (
    <>
      <Header />
      <div className="space-y-8">
        <SiteSummary />
        <TrafficHealthScore />
        <LosingPagesTable />
      </div>
    </>
  );
}
