import { kmeans } from 'ml-kmeans';

export class ClusteringService {
  /**
   * Clusters a list of embeddings using the k-means algorithm.
   * @param embeddings - A list of numerical vectors (embeddings).
   * @param k - The number of clusters to create.
   * @returns An array of cluster indices, where each index corresponds to an embedding.
   */
  public getPageClusters(embeddings: number[][], k: number): number[] {
    if (embeddings.length === 0) {
      return [];
    }

    if (k <= 1) {
      return new Array(embeddings.length).fill(0);
    }

    if (k >= embeddings.length) {
        return Array.from({ length: embeddings.length }, (_, i) => i);
    }

    try {
      const result = kmeans(embeddings, k);
      return result.clusters;
    } catch (error) {
      console.error('Error during clustering:', error);
      // Fallback: return a single cluster for all embeddings
      return new Array(embeddings.length).fill(0);
    }
  }
}
