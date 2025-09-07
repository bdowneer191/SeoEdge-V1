import { GET } from './route';
import { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseConfig';

// Mock the firebaseConfig module
jest.mock('@/lib/firebaseConfig', () => ({
  initializeFirebaseAdmin: jest.fn(),
}));

// Mock Firestore
const mockGet = jest.fn();
const mockWhere = jest.fn(() => ({ get: mockGet }));
const mockCollection = jest.fn(() => ({
  where: mockWhere,
  get: mockGet,
}));

(initializeFirebaseAdmin as jest.Mock).mockReturnValue({
  collection: mockCollection,
});

describe('GET /api/pages/tiers', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockPages = [
    { id: '1', url: '/page1', title: 'Page 1', performance_tier: 'Winners', performance_reason: 'High traffic' },
    { id: '2', url: '/page2', title: 'Page 2', performance_tier: 'Declining', performance_reason: 'Low traffic' },
    { id: '3', url: '/page3', title: 'Page 3', performance_tier: 'Winners', performance_reason: 'High engagement' },
  ];

  const mockDocs = mockPages.map(page => ({
    id: page.id,
    data: () => ({
      url: page.url,
      title: page.title,
      performance_tier: page.performance_tier,
      performance_reason: page.performance_reason,
    }),
  }));

  it('should return all pages when no tier is specified', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: mockDocs,
    });

    const request = new NextRequest('http://localhost/api/pages/tiers');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.length).toBe(3);
    expect(mockWhere).not.toHaveBeenCalled();
  });

  it('should return filtered pages when a tier is specified', async () => {
    const winners = mockDocs.filter(doc => doc.data().performance_tier === 'Winners');
    mockGet.mockResolvedValue({
      empty: false,
      docs: winners,
    });

    const request = new NextRequest('http://localhost/api/pages/tiers?tier=Winners');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.length).toBe(2);
    expect(body[0].performance_tier).toBe('Winners');
    expect(mockWhere).toHaveBeenCalledWith('performance_tier', '==', 'Winners');
  });

  it('should return an empty array when no pages match the tier', async () => {
    mockGet.mockResolvedValue({
      empty: true,
      docs: [],
    });

    const request = new NextRequest('http://localhost/api/pages/tiers?tier=Unknown');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
    expect(mockWhere).toHaveBeenCalledWith('performance_tier', '==', 'Unknown');
  });

  it('should return an empty array when the collection is empty', async () => {
    mockGet.mockResolvedValue({
      empty: true,
      docs: [],
    });

    const request = new NextRequest('http://localhost/api/pages/tiers');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual([]);
    expect(mockWhere).not.toHaveBeenCalled();
  });

  it('should return 500 on a server error', async () => {
    mockGet.mockRejectedValue(new Error('Firestore error'));

    const request = new NextRequest('http://localhost/api/pages/tiers');
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch pages.');
  });

  it('should filter by date when "days" query param is provided', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [mockDocs[0]],
    });

    const request = new NextRequest('http://localhost/api/pages/tiers?days=7');
    await GET(request);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    expect(mockWhere).toHaveBeenCalledWith('last_tiering_run', '>=', expect.stringMatching(sevenDaysAgo.toISOString().substring(0, 10)));
  });
});
