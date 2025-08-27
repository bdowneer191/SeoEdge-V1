import { ClusteringService } from '../ClusteringService';
import { kmeans } from 'ml-kmeans';

jest.mock('ml-kmeans', () => ({
  kmeans: jest.fn(),
}));

describe('ClusteringService', () => {
  let clusteringService: ClusteringService;

  beforeEach(() => {
    clusteringService = new ClusteringService();
    (kmeans as jest.Mock).mockClear();
  });

  it('should return an empty array for empty input', () => {
    const result = clusteringService.getPageClusters([], 5);
    expect(result).toEqual([]);
  });

  it('should return a single cluster if k is 1', () => {
    const embeddings = [[1], [2], [3]];
    const result = clusteringService.getPageClusters(embeddings, 1);
    expect(result).toEqual([0, 0, 0]);
  });

  it('should return unique clusters if k is greater than or equal to the number of embeddings', () => {
    const embeddings = [[1], [2], [3]];
    const result = clusteringService.getPageClusters(embeddings, 3);
    expect(result).toEqual([0, 1, 2]);
  });

  it('should call kmeans and return the cluster assignments', () => {
    const embeddings = [[1, 2], [1, 3], [8, 7], [8, 6]];
    const mockResult = { clusters: [0, 0, 1, 1] };
    (kmeans as jest.Mock).mockReturnValue(mockResult);

    const result = clusteringService.getPageClusters(embeddings, 2);
    expect(kmeans).toHaveBeenCalledWith(embeddings, 2);
    expect(result).toEqual(mockResult.clusters);
  });

  it('should handle errors from the kmeans function and return a single cluster', () => {
    const embeddings = [[1, 2], [1, 3], [8, 7], [8, 6]];
    (kmeans as jest.Mock).mockImplementation(() => {
      throw new Error('Kmeans failed');
    });

    const result = clusteringService.getPageClusters(embeddings, 2);
    expect(result).toEqual([0, 0, 0, 0]);
  });
});
