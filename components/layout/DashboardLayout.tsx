import React, { PropsWithChildren } from 'react';

/**
 * A placeholder for the main dashboard layout.
 * This will later include navigation, sidebars, headers, etc.
 */
export default function DashboardLayout({
  children,
}: PropsWithChildren) {
  return (
    <main style={{ padding: '2rem' }}>
      {children}
    </main>
  );
}