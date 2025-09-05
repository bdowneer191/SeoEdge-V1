import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import SafeFirebaseWrapper from '@/components/SafeFirebaseWrapper';

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
        <SafeFirebaseWrapper>{children}</SafeFirebaseWrapper>
      </body>
    </html>
  );
}