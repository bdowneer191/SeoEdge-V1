import { runAdvancedPageTiering } from './tiering';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { trendAnalysis } from '@/lib/analytics/trend';

// Mock dependencies
jest.mock('@/lib/firebaseAdmin', () => ({
  initializeFirebaseAdmin: jest.fn(),
}));

jest.mock('@/lib/analytics/trend', () => ({
  trendAnalysis: jest.fn(),
}));

describe('Advanced Page Tiering Logic', () => {
  let firestoreMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    firestoreMock = {
      collection: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      get: jest.fn(),
      batch: jest.fn(() => ({
        update: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      })),
      doc: jest.fn().mockReturnThis(),
      set: jest.fn().mockResolvedValue(undefined),
    };
    (initializeFirebaseAdmin as jest.Mock).mockReturnValue(firestoreMock);
  });

  it('should assign "Champions" tier to a high-performing page', async () => {
    const pageDoc = {
      id: 'https://example.com/champion',
      data: () => ({ siteUrl: 'test.com' }),
    };
    const recentAnalytics = [
      { totalClicks: 1200, totalImpressions: 15000, averageCtr: 0.08, averagePosition: 2.5 },
    ];
    const baselineAnalytics = [
      { totalClicks: 1100, totalImpressions: 14000, averageCtr: 0.078, averagePosition: 3 },
    ];

    firestoreMock.get
      .mockResolvedValueOnce({ empty: false, docs: [pageDoc] }) // pages
      .mockResolvedValueOnce({ docs: recentAnalytics.map(d => ({ data: () => d })) }) // recent analytics
      .mockResolvedValueOnce({ docs: baselineAnalytics.map(d => ({ data: () => d })) }); // baseline analytics

    (trendAnalysis as jest.Mock).mockReturnValue({ trend: 'stable', rSquared: 0.1 });

    await runAdvancedPageTiering(firestoreMock);

    const batch = firestoreMock.batch();
    expect(batch.update).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      performance_tier: 'Champions',
    }));
  });
});
