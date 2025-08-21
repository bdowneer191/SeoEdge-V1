import type { Metadata } from 'next';
import React from 'react';

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
      <body>{children}</body>
    </html>
  );
}