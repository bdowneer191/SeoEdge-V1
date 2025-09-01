import { GET } from './route';
import { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { trendAnalysis } from '@/lib/analytics/trend';
import { runAdvancedPageTiering } from '@/lib/analytics/tiering';

// Mock dependencies
jest.mock('@/lib/firebaseAdmin', () => ({
  initializeFirebaseAdmin: jest.fn(),
}));

jest.mock('@/lib/analytics/trend', () => ({
  trendAnalysis: jest.fn(),
}));

jest.mock('@/lib/analytics/tiering', () => ({
  runAdvancedPageTiering: jest.fn(),
}));

describe('Daily Stats Cron Job API', () => {
  let firestoreMock: any;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock Firestore implementation
    firestoreMock = {
      collection: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      batch: jest.fn(() => ({
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      })),
    };
    (initializeFirebaseAdmin as jest.Mock).mockReturnValue(firestoreMock);
  });

  it('should calculate daily stats and trigger advanced page tiering', async () => {
    // Mock data for daily stats
    const dailyStatsDocs = [
      { data: () => ({ totalClicks: 100, totalImpressions: 1000, averageCtr: 0.1, averagePosition: 10 }) },
      { data: () => ({ totalClicks: 110, totalImpressions: 1100, averageCtr: 0.1, averagePosition: 9 }) },
    ];
    firestoreMock.get
      .mockResolvedValueOnce({ empty: false, docs: dailyStatsDocs }) // For analytics_agg
      .mockResolvedValueOnce({ empty: true, docs: [] }); // For pages collection in runPageTiering
    (trendAnalysis as jest.Mock).mockReturnValue({ trend: 'stable', rSquared: 0.1 });

    const request = new NextRequest('https://test.com/api/cron/daily-stats?secret=test_secret');
    request.headers.set('user-agent', 'vercel-cron/1.0');
    process.env.ADMIN_SHARED_SECRET = 'test_secret';

    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('success');

    // Verify daily stats was called
    expect(firestoreMock.collection).toHaveBeenCalledWith('dashboard_stats');
    expect(firestoreMock.doc).toHaveBeenCalledWith('latest');
    expect(firestoreMock.set).toHaveBeenCalled();

    // Verify advanced page tiering was called
    expect(runAdvancedPageTiering).toHaveBeenCalledWith(firestoreMock);
  });
});