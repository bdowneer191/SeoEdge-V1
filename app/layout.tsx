import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Import the font
import './globals.css';
import DashboardLayout from '@/components/layout/DashboardLayout';

// Configure the font
const inter = Inter({ subsets: ['latin'] });

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
      {/* Apply the font class to the body */}
      <body className={inter.className}>
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}