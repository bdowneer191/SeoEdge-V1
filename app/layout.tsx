import type { Metadata } from 'next';
import React from 'react';

// Metadata is not actively used in this single-page app setup, but kept for file structure consistency.
export const metadata: Metadata = {
  title: 'SeoEdge',
  description: 'AI-powered SEO analytics tool to diagnose and recover organic traffic.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This component now acts as a simple wrapper. The <html> and <body> tags are in index.html.
  // The background color is applied to a div to ensure it covers the viewport.
  return (
    <div className="bg-gray-50 min-h-screen">
      {children}
    </div>
  );
}