import type { Metadata } from 'next';
import React from 'react';
import './globals.css'; // Make sure you have a globals.css file for base styles
import DashboardLayout from '@/components/layout/DashboardLayout';

export const metadata: Metadata = {
  title: 'SeoEdge',
  description: 'AI-powered SEO analytics tool to diagnose and recover organic traffic.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}