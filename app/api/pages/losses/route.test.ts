import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GET } from './route';
import { NextRequest } from 'next/server';
import * as admin from 'firebase-admin';

// --- Mock Firestore ---
const selectMock = jest.fn(() => ({ get: getMock }));
const getMock = jest.fn();
const whereMock = jest.fn(() => ({ where: jest.fn(() => ({ select: selectMock })) }));
const collectionMock = jest.fn(() => ({ where: whereMock }));

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
// --- End Mock Firestore ---

describe('GET /api/pages/losses', () => {

  beforeEach(() => {
    process.env.FIREBASE_ADMIN_SDK_JSON_BASE64 = Buffer.from(
      JSON.stringify({ client_email: 'test@test.com', private_key: 'key' })
    ).toString('base64');
    Object.defineProperty(admin, 'apps', { value: [{}], configurable: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
    Object.defineProperty(admin, 'apps', { value: [], configurable: true });
  });

  function createMockRequest(searchParams: Record<string, string>): NextRequest {
    const url = `http://localhost/api/pages/losses?${new URLSearchParams(searchParams)}`;
    return new NextRequest(url);
  }
  
  const defaultParams = {
    currentStartDate: '2023-02-01',
    currentEndDate: '2023-02-28',
    previousStartDate: '2023-01-01',
    previousEndDate: '2023-01-31',
    threshold: '0.5', // 50% drop
  };

  it('should return 400 if a parameter is missing', async () => {
    const { threshold, ...missingParams } = defaultParams;
    const req = createMockRequest(missingParams);
    const response = await GET(req);
    expect(response.status).toBe(400);
  });

  it('should return 400 for an invalid threshold', async () => {
    const req = createMockRequest({ ...defaultParams, threshold: 'abc' });
    const response = await GET(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Threshold must be a number');
  });

  it('should return an empty array if there are no significant losses', async () => {
    const previousData = [{ page: '/page1', clicks: 100 }];
    const currentData = [{ page: '/page1', clicks: 80 }]; // 20% drop, below threshold
    getMock
      .mockResolvedValueOnce({ empty: false, docs: currentData.map(d => ({ data: () => d })) })
      .mockResolvedValueOnce({ empty: false, docs: previousData.map(d => ({ data: () => d })) });
    
    const req = createMockRequest(defaultParams);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
  });

  it('should correctly identify and calculate pages with losses', async () => {
    const previousData = [
        { page: '/page-big-drop', clicks: 1000 },
        { page: '/page-small-drop', clicks: 100 },
        { page: '/page-gained', clicks: 50 },
        { page: '/page-disappeared', clicks: 200 },
        { page: '/page-stable', clicks: 500 },
    ];
    const currentData = [
        { page: '/page-big-drop', clicks: 400 }, // 60% drop
        { page: '/page-small-drop', clicks: 80 }, // 20% drop
        { page: '/page-gained', clicks: 100 }, // 100% gain
        { page: '/page-new', clicks: 50 },
        { page: '/page-stable', clicks: 500 }, // no change
    ];

    getMock
      .mockResolvedValueOnce({ empty: false, docs: currentData.map(d => ({ data: () => d })) })
      .mockResolvedValueOnce({ empty: false, docs: previousData.map(d => ({ data: () => d })) });
      
    const req = createMockRequest(defaultParams);
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveLength(2);

    // Results should be sorted by largest drop
    expect(body[0]).toEqual({
      page: '/page-disappeared',
      previousClicks: 200,
      currentClicks: 0,
      changePercentage: -100,
    });
    expect(body[1]).toEqual({
      page: '/page-big-drop',
      previousClicks: 1000,
      currentClicks: 400,
      changePercentage: -60,
    });
  });
});
