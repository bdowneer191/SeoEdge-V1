import { kmeans } from 'ml-kmeans';

export class ClusteringService {
  public async getPageClusters(embeddings: number[][], k: number): Promise<number[]> {
    try {
      const result = kmeans(embeddings, k, {});
      return result.clusters.map(clusterId => clusterId);
    } catch (error) {
      console.error('Error during clustering:', error);
      return embeddings.map(() => 0);
    }
  }
}
