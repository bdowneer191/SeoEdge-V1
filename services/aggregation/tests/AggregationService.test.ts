import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { AggregationService, AnalyticsAggData } from '../AggregationService';
import * as admin from 'firebase-admin';

// Mock Firestore
const setMock = jest.fn();
const docMock = jest.fn(() => ({ set: setMock }));
const getMock = jest.fn();
const whereMock = jest.fn(() => ({ get: getMock }));
const collectionMock = jest.fn(() => ({ where: whereMock, doc: docMock }));

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  apps: [],
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(() => ({
    collection: collectionMock,
  })),
}));

describe('AggregationService', () => {
  let service: AggregationService;

  beforeEach(() => {
    process.env.FIREBASE_ADMIN_SDK_JSON_BASE64 = Buffer.from(
      JSON.stringify({ client_email: 'test@test.com', private_key: 'key' })
    ).toString('base64');
    jest.clearAllMocks();
    service = new AggregationService();
  });

  afterEach(() => {
    delete process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
  });

  const mockRawData = [
    { siteUrl: 'sc-domain:example.com', clicks: 10, impressions: 100, ctr: 0.1, position: 5, country: 'USA', device: 'DESKTOP' },
    { siteUrl: 'sc-domain:example.com', clicks: 20, impressions: 200, ctr: 0.1, position: 10, country: 'USA', device: 'MOBILE' },
    { siteUrl: 'sc-domain:example.com', clicks: 5, impressions: 100, ctr: 0.05, position: 8, country: 'CAN', device: 'DESKTOP' },
    { siteUrl: 'sc-domain:example.com', clicks: 15, impressions: 150, ctr: 0.1, position: 12, country: 'CAN', device: 'TABLET' },
  ];

  const mockSnapshot = {
    empty: false,
    size: mockRawData.length,
    docs: mockRawData.map(data => ({
      data: () => data,
    })),
  };

  it('should calculate aggregates correctly and save to Firestore', async () => {
    getMock.mockResolvedValue(mockSnapshot);

    await service.aggregateData('2023-01-15');

    // Verify Firestore query
    expect(collectionMock).toHaveBeenCalledWith('gsc_raw');
    expect(whereMock).toHaveBeenCalledWith('date', '==', '2023-01-15');

    // Verify Firestore write
    expect(collectionMock).toHaveBeenCalledWith('analytics_agg');
    expect(docMock).toHaveBeenCalledWith('daily_20230115');
    expect(setMock).toHaveBeenCalledTimes(1);

    const result = setMock.mock.calls[0][0] as AnalyticsAggData;

    // Site-wide totals
    expect(result.totalClicks).toBe(10 + 20 + 5 + 15); // 50
    expect(result.totalImpressions).toBe(100 + 200 + 100 + 150); // 550
    
    // Site-wide weighted averages
    const expectedAvgPosition = (5*100 + 10*200 + 8*100 + 12*150) / 550; // (500 + 2000 + 800 + 1800) / 550 = 5100 / 550 = 9.2727...
    expect(result.averagePosition).toBeCloseTo(expectedAvgPosition);
    expect(result.averageCtr).toBeCloseTo(50 / 550);

    // Aggregates by Country
    expect(result.aggregatesByCountry['USA'].totalClicks).toBe(30);
    expect(result.aggregatesByCountry['USA'].totalImpressions).toBe(300);
    expect(result.aggregatesByCountry['USA'].averagePosition).toBeCloseTo((5*100 + 10*200) / 300);
    expect(result.aggregatesByCountry['CAN'].totalClicks).toBe(20);
    expect(result.aggregatesByCountry['CAN'].totalImpressions).toBe(250);
    expect(result.aggregatesByCountry['CAN'].averagePosition).toBeCloseTo((8*100 + 12*150) / 250);
    
    // Aggregates by Device
    expect(result.aggregatesByDevice['DESKTOP'].totalClicks).toBe(15);
    expect(result.aggregatesByDevice['DESKTOP'].totalImpressions).toBe(200);
    expect(result.aggregatesByDevice['MOBILE'].totalClicks).toBe(20);
    expect(result.aggregatesByDevice['TABLET'].totalImpressions).toBe(150);
  });

  it('should do nothing if no data is found for the date', async () => {
    getMock.mockResolvedValue({ empty: true, docs: [], size: 0 });

    await service.aggregateData('2023-01-16');

    expect(setMock).not.toHaveBeenCalled();
  });
});
