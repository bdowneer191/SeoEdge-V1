import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { GET } from './route';
import { NextRequest } from 'next/server';
import * as admin from 'firebase-admin';

// --- Mock Firestore ---
const getMock = jest.fn();
const orderByMock = jest.fn(() => ({ get: getMock }));
const whereMock = jest.fn(() => ({ where: jest.fn(() => ({ orderBy: orderByMock })) }));
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

describe('GET /api/metrics/site', () => {
    
  beforeEach(() => {
    process.env.FIREBASE_ADMIN_SDK_JSON_BASE64 = Buffer.from(
      JSON.stringify({ client_email: 'test@test.com', private_key: 'key' })
    ).toString('base64');
    // Set a default mock for admin.apps to avoid re-initialization issues
    Object.defineProperty(admin, 'apps', { value: [{}], configurable: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
    Object.defineProperty(admin, 'apps', { value: [], configurable: true });
  });

  function createMockRequest(searchParams: Record<string, string>): NextRequest {
    const url = `http://localhost/api/metrics/site?${new URLSearchParams(searchParams)}`;
    return new NextRequest(url);
  }

  it('should return 400 if startDate is missing', async () => {
    const req = createMockRequest({ endDate: '2023-01-02' });
    const response = await GET(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('startDate');
  });

  it('should return 400 if endDate is missing', async () => {
    const req = createMockRequest({ startDate: '2023-01-01' });
    const response = await GET(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('endDate');
  });
  
  it('should return 400 for invalid date format', async () => {
    const req = createMockRequest({ startDate: '2023/01/01', endDate: '2023-01-02' });
    const response = await GET(req);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Dates must be in YYYY-MM-DD format.');
  });

  it('should return an empty array if no data is found', async () => {
    getMock.mockResolvedValue({ empty: true, docs: [] });
    const req = createMockRequest({ startDate: '2023-01-01', endDate: '2023-01-02' });
    const response = await GET(req);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  it('should return formatted metrics data on success', async () => {
    const mockData = [
      { date: '2023-01-01', totalClicks: 100, totalImpressions: 1000, averageCtr: 0.1, averagePosition: 5.0 },
      { date: '2023-01-02', totalClicks: 120, totalImpressions: 1100, averageCtr: 0.109, averagePosition: 4.8 },
    ];
    getMock.mockResolvedValue({
      empty: false,
      docs: mockData.map(d => ({ data: () => d })),
    });

    const req = createMockRequest({ startDate: '2023-01-01', endDate: '2023-01-02' });
    const response = await GET(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toEqual([
      { date: '2023-01-01', clicks: 100, impressions: 1000, ctr: 0.1, position: 5.0 },
      { date: '2023-01-02', clicks: 120, impressions: 1100, ctr: 0.109, position: 4.8 },
    ]);
    
    expect(collectionMock).toHaveBeenCalledWith('analytics_agg');
    expect(whereMock).toHaveBeenCalledWith('date', '>=', '2023-01-01');
  });
});
