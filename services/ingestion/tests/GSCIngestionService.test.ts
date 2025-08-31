import { describe, it, expect, jest, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { GSCIngestionService } from '../GSCIngestionService';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';

jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    firestore: jest.fn(),
    apps: [],
}), { virtual: true });

jest.mock('googleapis', () => ({
    google: {
        auth: { GoogleAuth: jest.fn() },
        searchconsole: jest.fn(),
    }
}), { virtual: true });

describe('GSCIngestionService', () => {
  let service: GSCIngestionService;
  let mockSearchConsoleQuery: jest.Mock;
  let mockFirestoreSet: jest.Mock;
  let mockFirestoreDoc: jest.Mock;
  let mockFirestoreCollection: jest.Mock;
  let mockFirestoreBatchSet: jest.Mock;
  let mockFirestoreBatchCommit: jest.Mock;
  let mockServerTimestamp: jest.Mock;

  beforeEach(() => {
    process.env.FIREBASE_ADMIN_SDK_JSON_BASE64 = Buffer.from(
      JSON.stringify({ client_email: 'test@test.com', private_key: 'key' })
    ).toString('base64');

    mockSearchConsoleQuery = jest.fn();
    (google.searchconsole as jest.Mock).mockReturnValue({
      searchanalytics: {
        query: mockSearchConsoleQuery,
      },
    });

    mockFirestoreSet = jest.fn();
    mockFirestoreDoc = jest.fn(() => ({ set: mockFirestoreSet }));
    mockFirestoreCollection = jest.fn(() => ({ doc: mockFirestoreDoc }));
    mockFirestoreBatchSet = jest.fn();
    mockFirestoreBatchCommit = jest.fn().mockResolvedValue(true);
    mockServerTimestamp = jest.fn(() => 'MOCK_SERVER_TIMESTAMP');

    const firestoreMock = {
      collection: mockFirestoreCollection,
      batch: () => ({
        set: mockFirestoreBatchSet,
        commit: mockFirestoreBatchCommit,
      }),
    };

    (admin.firestore as jest.Mock).mockReturnValue(firestoreMock);
    (admin.firestore as any).FieldValue = {
      serverTimestamp: mockServerTimestamp,
    };

    service = new GSCIngestionService();
  });

  afterEach(() => {
    delete process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
    jest.clearAllMocks();
  });

  describe('ingestDailySummary', () => {
    it('should fetch a daily summary and write it to Firestore', async () => {
      const mockSummaryRow = {
        keys: ['2023-01-01'],
        clicks: 100,
        impressions: 1000,
        ctr: 0.1,
        position: 10,
      };
      mockSearchConsoleQuery.mockResolvedValue({ data: { rows: [mockSummaryRow] } });

      await service.ingestDailySummary('sc-domain:example.com', '2023-01-01');

      expect(mockSearchConsoleQuery).toHaveBeenCalledTimes(1);
      expect(mockFirestoreCollection).toHaveBeenCalledWith('analytics_agg');
      expect(mockFirestoreDoc).toHaveBeenCalledWith('daily_20230101_sc_domain_example_com');
      expect(mockFirestoreSet).toHaveBeenCalledWith(expect.objectContaining({
        totalClicks: 100,
        totalImpressions: 1000,
      }));
    });
  });

  describe('runSmartAnalytics', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-08-31'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('should calculate and store dashboard stats', async () => {
        const period1Rows = [
            { keys: ['https://example.com/page1'], clicks: 10, impressions: 100 },
            { keys: ['https://example.com/page2'], clicks: 200, impressions: 2000 },
        ];
        const period2Rows = [
            { keys: ['https://example.com/page1'], clicks: 100, impressions: 1001 },
            { keys: ['https://example.com/page2'], clicks: 190, impressions: 1900 },
        ];

        const dailyMetricsRows = Array.from({ length: 90 }, (_, i) => ({
            keys: [`2025-08-${30 - i}`],
            clicks: 10,
            impressions: 100,
            ctr: 0.1,
            position: 10,
        }));

        mockSearchConsoleQuery.mockImplementation(async (req) => {
            const reqStartDate = new Date(req.requestBody.startDate);
            const today = new Date();
            const startDate1 = new Date(today);
            startDate1.setDate(today.getDate() - 91);

            if (req.requestBody.dimensions?.includes('date')) {
                return { data: { rows: dailyMetricsRows } };
            }

            if (reqStartDate >= startDate1) {
                return { data: { rows: period1Rows } };
            }
            return { data: { rows: period2Rows } };
        });

        await service.runSmartAnalytics('https://example.com');

        // Check that losing pages are stored
        expect(mockFirestoreCollection).toHaveBeenCalledWith('pages');
        expect(mockFirestoreBatchSet).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ pageUrl: 'https://example.com/page1' })
        );

        // Check that dashboard stats are stored
        expect(mockFirestoreCollection).toHaveBeenCalledWith('dashboard_stats');
        expect(mockFirestoreDoc).toHaveBeenCalledWith('latest');

        const dashboardData = mockFirestoreSet.mock.calls[0][0];
        expect(dashboardData.losingPages.length).toBe(1);
        expect(dashboardData.winningPages.length).toBe(2);
        expect(dashboardData.winningPages[0].page).toBe('https://example.com/page2');
        expect(dashboardData.siteSummary.historicalData.length).toBe(90);
        expect(dashboardData.siteSummary.dashboardStats.metrics.totalClicks.benchmarks.historicalAvg).toBe(900);
    });
  });
});