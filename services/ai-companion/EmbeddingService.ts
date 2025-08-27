import { GoogleGenAI, EmbedContentResponse } from '@google/genai';

interface PageData {
  pageTitle: string;
  pageContent: string;
  topQueries: string[];
}

export class EmbeddingService {
  private readonly genAI: GoogleGenAI;
  private readonly embeddingModel = 'text-embedding-004';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set.');
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  public async generatePageEmbedding({
    pageTitle,
    pageContent,
    topQueries,
  }: PageData): Promise<number[]> {
    const combinedContent = [
      `Title: ${pageTitle}`,
      `Content: ${pageContent}`,
      `Top Queries: ${topQueries.join(', ')}`,
    ].join('\n\n');

    try {
      const response = await this.genAI.models.embedContent({
        model: this.embeddingModel,
        contents: [combinedContent],
      });

      if (!response.embeddings || !Array.isArray(response.embeddings) || response.embeddings.length === 0) {
        throw new Error('Invalid embedding response from Gemini API');
      }
      const embedding = response.embeddings[0];

      if (!embedding || !Array.isArray(embedding.values)) {
        throw new Error('Invalid embedding response from Gemini API');
      }

      return embedding.values;
    } catch (error) {
      console.error('Error generating embedding:', error);
      // It's better to let the caller handle the error, so re-throw or throw a custom error
      throw new Error('Failed to generate page embedding.');
    }
  }
}
