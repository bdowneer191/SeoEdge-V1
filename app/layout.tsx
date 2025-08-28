import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import DashboardLayout from '@/components/layout/DashboardLayout';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700']
});

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
      <body className={poppins.className}>
        <DashboardLayout>{children}</DashboardLayout>
      </body>
    </html>
  );
}