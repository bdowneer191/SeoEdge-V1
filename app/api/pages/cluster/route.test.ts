import { GET } from './route';
import { NextRequest } from 'next/server';
import { initializeFirebaseAdmin } from '@/lib/firebaseAdmin';
import { EmbeddingService } from '@/services/ai-companion/EmbeddingService';
import { ClusteringService } from '@/services/clustering/ClusteringService';

// Mock dependencies
jest.mock('@/lib/firebaseAdmin', () => ({
  initializeFirebaseAdmin: jest.fn(),
}));

jest.mock('@/services/ai-companion/EmbeddingService');
jest.mock('@/services/clustering/ClusteringService');

describe('GET /api/pages/cluster', () => {
  const mockSecret = 'test-secret';
  let mockRequest: NextRequest;

  const mockPages = [
    { id: 'page1', pageTitle: 'Page 1', pageContent: 'Content 1', topQueries: ['q1'] },
    { id: 'page2', pageTitle: 'Page 2', pageContent: 'Content 2', topQueries: ['q2'] },
    { id: 'page3', pageTitle: 'Page 3', pageContent: 'Content 3', topQueries: ['q3'] },
  ];

  const mockEmbeddings = [
    [0.1, 0.2],
    [0.3, 0.4],
    [0.5, 0.6],
  ];

  const mockClusterAssignments = [0, 1, 0];

  let mockFirestore: any;

  beforeEach(() => {
    process.env.ADMIN_SHARED_SECRET = mockSecret;

    // Mock Firestore
    const mockBatchUpdate = jest.fn();
    const mockBatchCommit = jest.fn().mockResolvedValue({});
    const mockBatch = {
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    };

    mockFirestore = {
      collection: jest.fn().mockReturnThis(),
      doc: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: mockPages.map(p => ({ id: p.id, data: () => p })),
      }),
      batch: () => mockBatch,
    };
    (initializeFirebaseAdmin as jest.Mock).mockReturnValue(mockFirestore);

    // Mock services
    (EmbeddingService as jest.Mock).mockImplementation(() => ({
      generatePageEmbedding: jest.fn()
        .mockResolvedValueOnce(mockEmbeddings[0])
        .mockResolvedValueOnce(mockEmbeddings[1])
        .mockResolvedValueOnce(mockEmbeddings[2]),
    }));
    (ClusteringService as jest.Mock).mockImplementation(() => ({
      clusterEmbeddings: jest.fn().mockReturnValue(mockClusterAssignments),
    }));

    // Reset mocks
    jest.clearAllMocks();
    (mockBatch.update as jest.Mock).mockClear();
  });

  it('should return 401 if secret is invalid', async () => {
    mockRequest = new NextRequest('http://localhost?secret=invalid');
    const response = await GET(mockRequest);
    expect(response.status).toBe(401);
  });

  it('should successfully cluster pages and update Firestore', async () => {
    mockRequest = new NextRequest(`http://localhost?secret=${mockSecret}`);
    const response = await GET(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('success');
    expect(body.pagesProcessed).toBe(mockPages.length);
    expect(body.clustersCreated).toBe(2);

    // Verify Firestore interactions
    expect(mockFirestore.collection).toHaveBeenCalledWith('pages');
    expect(mockFirestore.batch().update).toHaveBeenCalledTimes(mockPages.length);

    // Check if pages were updated with correct cluster_id
    mockPages.forEach((page, index) => {
        expect(mockFirestore.batch().update).toHaveBeenCalledWith(
            expect.anything(), { cluster_id: `cluster_${mockClusterAssignments[index]}` }
        );
    });

    expect(mockFirestore.batch().commit).toHaveBeenCalledTimes(1);
  });

  it('should return a message if no pages are found', async () => {
    mockFirestore.get.mockResolvedValue({ empty: true, docs: [] });
    mockRequest = new NextRequest(`http://localhost?secret=${mockSecret}`);
    const response = await GET(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('No pages found to cluster.');
  });

  it('should handle errors during embedding generation', async () => {
    (EmbeddingService as jest.Mock).mockImplementation(() => ({
      generatePageEmbedding: jest.fn().mockRejectedValue(new Error('Embedding failed')),
    }));

    mockRequest = new NextRequest(`http://localhost?secret=${mockSecret}`);
    const response = await GET(mockRequest);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.status).toBe('error');
    expect(body.message).toBe('Page clustering failed.');
  });
});
