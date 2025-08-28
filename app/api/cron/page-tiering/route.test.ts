import { GET } from './route';
import { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { trendAnalysis } from '@/lib/analytics/trend';

// Mock dependencies
jest.mock('@/lib/firebaseAdmin', () => ({
  initializeFirebaseAdmin: jest.fn(),
}));

jest.mock('@/lib/analytics/trend', () => ({
  trendAnalysis: jest.fn(),
}));

describe('Page Tiering Cron Job API', () => {
  let firestoreMock: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock Firestore implementation
    firestoreMock = {
      collection: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      get: jest.fn(),
      batch: jest.fn(() => ({
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      })),
    };
    (initializeFirebaseAdmin as jest.Mock).mockReturnValue(firestoreMock);
  });

  it('should correctly assign "Declining" tier', async () => {
    // Mock page and analytics data for a declining page
    const pageDoc = {
      id: 'https://example.com/declining',
      data: () => ({ siteUrl: 'test.com' }),
    };
    firestoreMock.get.mockResolvedValueOnce({
      empty: false,
      docs: [pageDoc],
    });

    // Mock analytics data to show a >30% drop
    const recentAnalytics = [{ totalClicks: 60, totalImpressions: 1000 }];
    const baselineAnalytics = [{ totalClicks: 100, totalImpressions: 1000 }];
    firestoreMock.get
      .mockResolvedValueOnce({ docs: recentAnalytics.map(d => ({ data: () => d })) })
      .mockResolvedValueOnce({ docs: baselineAnalytics.map(d => ({ data: () => d })) });

    // Mock trend analysis to show a downward trend
    (trendAnalysis as jest.Mock).mockReturnValue({ trend: 'down', rSquared: 0.7 });

    const request = new NextRequest('https://test.com/api/cron/page-tiering?secret=test_secret');
    request.headers.set('user-agent', 'vercel-cron/1.0');
    process.env.ADMIN_SHARED_SECRET = 'test_secret';

    const response = await GET(request);
    const body = await response.json();

    expect(body.status).toBe('success');
    const batch = firestoreMock.batch();
    expect(batch.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      performance_tier: 'Declining',
    }));
  });

  it('should correctly assign "Winners" tier', async () => {
    const pageDoc = {
      id: 'https://example.com/winner',
      data: () => ({ siteUrl: 'test.com' }),
    };
    firestoreMock.get.mockResolvedValueOnce({
      empty: false,
      docs: [pageDoc],
    });

    const recentAnalytics = [{ totalClicks: 130, totalImpressions: 1200 }];
    const baselineAnalytics = [{ totalClicks: 100, totalImpressions: 1000 }];
     firestoreMock.get
      .mockResolvedValueOnce({ docs: recentAnalytics.map(d => ({ data: () => d })) })
      .mockResolvedValueOnce({ docs: baselineAnalytics.map(d => ({ data: () => d })) });
    (trendAnalysis as jest.Mock).mockReturnValue({ trend: 'up', rSquared: 0.8 });

    const request = new NextRequest('https://test.com/api/cron/page-tiering?secret=test_secret');
    request.headers.set('user-agent', 'vercel-cron/1.0');
    process.env.ADMIN_SHARED_SECRET = 'test_secret';

    await GET(request);

    const batch = firestoreMock.batch();
    expect(batch.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      performance_tier: 'Winners',
    }));
  });

  it('should correctly assign "Opportunities" tier', async () => {
    const pageDoc = {
      id: 'https://example.com/opportunity',
      data: () => ({ siteUrl: 'test.com' }),
    };
    firestoreMock.get.mockResolvedValueOnce({
      empty: false,
      docs: [pageDoc],
    });
    // High impressions, low CTR
    const recentAnalytics = [{ totalClicks: 10, totalImpressions: 1500, averageCtr: 0.006 }];
    const baselineAnalytics = [{ totalClicks: 10, totalImpressions: 1000, averageCtr: 0.01 }];
     firestoreMock.get
      .mockResolvedValueOnce({ docs: recentAnalytics.map(d => ({ data: () => d })) })
      .mockResolvedValueOnce({ docs: baselineAnalytics.map(d => ({ data: () => d })) });
    (trendAnalysis as jest.Mock).mockReturnValue({ trend: 'stable', rSquared: 0.2 });

    const request = new NextRequest('https://test.com/api/cron/page-tiering?secret=test_secret');
    request.headers.set('user-agent', 'vercel-cron/1.0');
    process.env.ADMIN_SHARED_SECRET = 'test_secret';

    await GET(request);

    const batch = firestoreMock.batch();
    expect(batch.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      performance_tier: 'Opportunities',
    }));
  });

  it('should correctly assign "Stable" tier', async () => {
    const pageDoc = {
      id: 'https://example.com/stable',
      data: () => ({ siteUrl: 'test.com' }),
    };
    firestoreMock.get.mockResolvedValueOnce({
      empty: false,
      docs: [pageDoc],
    });
    // Minimal change
    const recentAnalytics = [{ totalClicks: 102, totalImpressions: 1000 }];
    const baselineAnalytics = [{ totalClicks: 100, totalImpressions: 1000 }];
     firestoreMock.get
      .mockResolvedValueOnce({ docs: recentAnalytics.map(d => ({ data: () => d })) })
      .mockResolvedValueOnce({ docs: baselineAnalytics.map(d => ({ data: () => d })) });
    (trendAnalysis as jest.Mock).mockReturnValue({ trend: 'stable', rSquared: 0.1 });

    const request = new NextRequest('https://test.com/api/cron/page-tiering?secret=test_secret');
    request.headers.set('user-agent', 'vercel-cron/1.0');
    process.env.ADMIN_SHARED_SECRET = 'test_secret';

    await GET(request);

    const batch = firestoreMock.batch();
    expect(batch.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      performance_tier: 'Stable',
    }));
  });
});
