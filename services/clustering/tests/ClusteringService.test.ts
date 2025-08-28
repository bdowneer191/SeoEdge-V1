import { ClusteringService } from '../ClusteringService';
import { kmeans } from 'ml-kmeans';

jest.mock('ml-kmeans', () => ({
  kmeans: jest.fn(),
}));

describe('ClusteringService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call kmeans with the correct arguments', async () => {
    const service = new ClusteringService();
    const embeddings = [[1, 2], [3, 4]];
    const k = 2;
    const mockClusters = { clusters: [0, 1] };
    (kmeans as jest.Mock).mockReturnValue(mockClusters);

    await service.getPageClusters(embeddings, k);

    expect(kmeans).toHaveBeenCalledWith(embeddings, k, {});
  });

  it('should return cluster assignments', async () => {
    const service = new ClusteringService();
    const embeddings = [[1, 2], [3, 4]];
    const k = 2;
    const mockClusters = { clusters: [0, 1] };
    (kmeans as jest.Mock).mockReturnValue(mockClusters);

    const result = await service.getPageClusters(embeddings, k);

    expect(result).toEqual([0, 1]);
  });

  it('should handle errors and return a single cluster', async () => {
    const service = new ClusteringService();
    const embeddings = [[1, 2], [3, 4]];
    const k = 2;
    (kmeans as jest.Mock).mockImplementation(() => {
      throw new Error('Test error');
    });

    const result = await service.getPageClusters(embeddings, k);

    expect(result).toEqual([0, 0]);
  });
});
