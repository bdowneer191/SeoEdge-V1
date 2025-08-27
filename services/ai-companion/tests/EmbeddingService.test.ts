import { EmbeddingService } from '../EmbeddingService';
import { GoogleGenAI } from '@google/genai';

// Mock the @google/genai library
jest.mock('@google/genai', () => {
  const mockEmbedContent = jest.fn();
  const mockGoogleGenAI = jest.fn(() => ({
    models: {
      embedContent: mockEmbedContent,
    },
  }));

  return {
    GoogleGenAI: mockGoogleGenAI,
    // Expose the mock for easy access in tests
    __mockEmbedContent: mockEmbedContent,
  };
});

// Destructure the mock for easier access
const { __mockEmbedContent } = require('@google/genai');

describe('EmbeddingService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset mocks and environment before each test
    jest.resetModules();
    process.env = { ...originalEnv };
    __mockEmbedContent.mockClear();
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  it('should throw an error if GEMINI_API_KEY is not set', () => {
    delete process.env.GEMINI_API_KEY;
    expect(() => new EmbeddingService()).toThrow(
      'GEMINI_API_KEY environment variable is not set.'
    );
  });

  it('should correctly initialize with an API key', () => {
    process.env.GEMINI_API_KEY = 'test-api-key';
    expect(() => new EmbeddingService()).not.toThrow();
    expect(GoogleGenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' });
  });

  describe('generatePageEmbedding', () => {
    let service: EmbeddingService;

    beforeEach(() => {
      process.env.GEMINI_API_KEY = 'test-api-key';
      service = new EmbeddingService();
    });

    const pageData = {
      pageTitle: 'Test Title',
      pageContent: 'This is the test page content.',
      topQueries: ['query1', 'query2'],
    };

    it('should generate and return a valid embedding for a page', async () => {
      const mockEmbedding = [0.1, 0.2, 0.3, 0.4];
      __mockEmbedContent.mockResolvedValue({
        embedding: { values: mockEmbedding },
      });

      const embedding = await service.generatePageEmbedding(pageData);

      expect(embedding).toEqual(mockEmbedding);
    });

    it('should format the input data correctly for the API call', async () => {
      __mockEmbedContent.mockResolvedValue({
        embedding: { values: [0.1] },
      });

      await service.generatePageEmbedding(pageData);

      const expectedContent = [
        `Title: ${pageData.pageTitle}`,
        `Content: ${pageData.pageContent}`,
        `Top Queries: ${pageData.topQueries.join(', ')}`,
      ].join('\n\n');

      expect(__mockEmbedContent).toHaveBeenCalledWith({
        model: 'text-embedding-004',
        content: expectedContent,
      });
    });

    it('should throw an error for an invalid embedding response', async () => {
      __mockEmbedContent.mockResolvedValue({ embedding: null });

      await expect(service.generatePageEmbedding(pageData)).rejects.toThrow(
        'Failed to generate page embedding.'
      );
    });

    it('should throw an error if the embedding values are not an array', async () => {
      __mockEmbedContent.mockResolvedValue({
        embedding: { values: 'not-an-array' },
      });

      await expect(service.generatePageEmbedding(pageData)).rejects.toThrow(
        'Failed to generate page embedding.'
      );
    });

    it('should throw a generic error when the API call fails', async () => {
      const apiError = new Error('API is down');
      __mockEmbedContent.mockRejectedValue(apiError);

      await expect(service.generatePageEmbedding(pageData)).rejects.toThrow(
        'Failed to generate page embedding.'
      );
    });
  });
});
