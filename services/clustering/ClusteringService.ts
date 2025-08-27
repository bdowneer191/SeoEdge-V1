import kmeans from 'kmeans-ts';

export class ClusteringService {
  /**
   * Clusters a list of embeddings using the k-means algorithm.
   * @param embeddings - A list of numerical vectors (embeddings).
   * @returns An array of cluster indices, where each index corresponds to an embedding.
   */
  public clusterEmbeddings(embeddings: number[][]): number[] {
    if (embeddings.length === 0) {
      return [];
    }

    // Determine the number of clusters (k).
    // A common heuristic is the square root of half the number of data points.
    // This can be made more sophisticated in the future (e.g., using the elbow method).
    const k = Math.ceil(Math.sqrt(embeddings.length / 2));

    if (k <= 1) {
      // If k is 1 or less, all items belong to the same cluster.
      return new Array(embeddings.length).fill(0);
    }

    // The kmeans-ts library expects the number of clusters to be less than the number of data points.
    if (k >= embeddings.length) {
        return new Array(embeddings.length).fill(0);
    }

    try {
      const result = kmeans(embeddings, k);
      return result.map(cluster => cluster.centroid.length > 0 ? result.indexOf(cluster) : -1);
    } catch (error) {
      console.error('Error during clustering:', error);
      // Fallback: return a single cluster for all embeddings
      return new Array(embeddings.length).fill(0);
    }
  }
}
