import { GET } from './route';
import { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseConfig';

// Mock the firebaseConfig module
jest.mock('@/lib/firebaseConfig', () => ({
  initializeFirebaseAdmin: jest.fn(),
}));

// Mock Firestore
const mockGet = jest.fn();
const mockSet = jest.fn();
const mockBatchCommit = jest.fn();
const mockBatch = {
  set: mockSet,
  commit: mockBatchCommit,
};
const mockCollection = jest.fn(() => ({
  get: mockGet,
  doc: jest.fn(() => ({
    set: mockSet,
  })),
}));

(initializeFirebaseAdmin as jest.Mock).mockReturnValue({
  collection: mockCollection,
  batch: () => mockBatch,
});

describe('GET /api/pages/populate', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockRawData = [
    { id: '1', page: '/page1' },
    { id: '2', page: '/page2' },
    { id: '3', page: '/page1' }, // Duplicate
    { id: '4', page: '/page3' },
    { id: '5', page: null }, // No page
  ];

  const mockDocs = mockRawData.map(item => ({
    id: item.id,
    data: () => ({ page: item.page }),
  }));

  it('should populate pages from raw GSC data', async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: mockDocs,
    });

    const request = new NextRequest('http://localhost/api/pages/populate');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.message).toBe("Successfully populated 'pages' collection with 3 unique URLs.");
    expect(mockCollection).toHaveBeenCalledWith('gsc_raw');
    expect(mockCollection).toHaveBeenCalledWith('pages');
    expect(mockSet).toHaveBeenCalledTimes(3);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);

    // Check that the correct data is being set
    expect(mockSet).toHaveBeenCalledWith(expect.any(Object), {
      url: '/page1',
      title: 'page1',
      siteUrl: 'sc-domain:hypefresh.com',
      last_tiering_run: expect.any(String),
    }, { merge: true });
  });

  it('should return a message when gsc_raw is empty', async () => {
    mockGet.mockResolvedValue({
      empty: true,
      docs: [],
    });

    const request = new NextRequest('http://localhost/api/pages/populate');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('No data found in gsc_raw to populate pages.');
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('should return a message when no pages are found in gsc_raw', async () => {
    const noPageDocs = [{ id: '1', data: () => ({ page: null }) }];
    mockGet.mockResolvedValue({
      empty: false,
      docs: noPageDocs,
    });

    const request = new NextRequest('http://localhost/api/pages/populate');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('No pages found in gsc_raw to populate.');
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it('should return 500 on a server error', async () => {
    mockGet.mockRejectedValue(new Error('Firestore error'));

    const request = new NextRequest('http://localhost/api/pages/populate');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to populate pages collection.');
    expect(body.details).toBe('Firestore error');
  });
});
