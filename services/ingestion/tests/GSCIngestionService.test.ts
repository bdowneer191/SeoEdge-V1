import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Buffer } from 'node:buffer';
import { GSCIngestionService } from '../GSCIngestionService';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
import { normalizeUrl } from '../urlUtils';

// Mock the dependencies
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  apps: [],
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(() => ({
    batch: jest.fn(() => ({
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(true),
    })),
    collection: jest.fn(() => ({
      doc: jest.fn(),
    })),
  })),
}));
jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn(),
    },
    searchconsole: jest.fn(),
  },
}));
jest.mock('../urlUtils', () => ({
  normalizeUrl: jest.fn(url => `${url}/normalized`),
}));

describe('GSCIngestionService', () => {
  let service: GSCIngestionService;
  let mockSearchConsoleQuery: jest.Mock;

  beforeEach(() => {
    // Set up environment variable
    process.env.FIREBASE_ADMIN_SDK_JSON_BASE64 = Buffer.from(
      JSON.stringify({ client_email: 'test@test.com', private_key: 'key' })
    ).toString('base64');

    // Mock GSC API client
    mockSearchConsoleQuery = jest.fn();
    (google.searchconsole as jest.Mock).mockReturnValue({
      searchanalytics: {
        query: mockSearchConsoleQuery,
      },
    });

    // Reset mocks before each test
    jest.clearAllMocks();

    service = new GSCIngestionService();
  });
  
  afterEach(() => {
    delete process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
  });

  const createMockGscRow = (i: number) => ({
    keys: [
      '2023-01-01',
      `query ${i}`,
      `https://example.com/page${i}`,
      'DESKTOP',
      'USA',
    ],
    clicks: i,
    impressions: i * 10,
    ctr: 0.1,
    position: i,
  });

  it('should fetch data and write to Firestore in a single batch', async () => {
    const mockRows = Array.from({ length: 10 }, (_, i) => createMockGscRow(i));
    mockSearchConsoleQuery.mockResolvedValue({ data: { rows: mockRows } });

    await service.ingestData('https://example.com', '2023-01-01', '2023-01-02');

    expect(mockSearchConsoleQuery).toHaveBeenCalledTimes(1);
    expect(mockSearchConsoleQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        siteUrl: 'https://example.com',
        requestBody: expect.objectContaining({ startRow: 0, rowLimit: 25000 }),
      })
    );

    const mockBatch = (admin.firestore().batch as jest.Mock).mock.results[0].value;
    expect(mockBatch.set).toHaveBeenCalledTimes(10);
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);

    expect(normalizeUrl).toHaveBeenCalledTimes(10);
    expect(mockBatch.set).toHaveBeenCalledWith(
      undefined, // We don't care about the doc ref mock
      expect.objectContaining({
        page: 'https://example.com/page0/normalized',
        query: 'query 0',
      })
    );
  });
  
  it('should handle pagination and multiple batches', async () => {
    const firstPageRows = Array.from({ length: 25000 }, (_, i) => createMockGscRow(i));
    const secondPageRows = Array.from({ length: 100 }, (_, i) => createMockGscRow(i + 25000));
    
    mockSearchConsoleQuery
      .mockResolvedValueOnce({ data: { rows: firstPageRows } })
      .mockResolvedValueOnce({ data: { rows: secondPageRows } });

    // Mock batch creation to return new batch instances
    const mockBatchCommit = jest.fn().mockResolvedValue(true);
    const mockBatchSet = jest.fn();
    (admin.firestore().batch as jest.Mock).mockImplementation(() => ({
        set: mockBatchSet,
        commit: mockBatchCommit,
    }));

    await service.ingestData('https://example.com', '2023-01-01', '2023-01-02');

    // API calls
    expect(mockSearchConsoleQuery).toHaveBeenCalledTimes(2);
    expect(mockSearchConsoleQuery).toHaveBeenCalledWith(expect.objectContaining({ requestBody: expect.objectContaining({ startRow: 0 })}));
    expect(mockSearchConsoleQuery).toHaveBeenCalledWith(expect.objectContaining({ requestBody: expect.objectContaining({ startRow: 25000 })}));
    
    // Batching logic (25100 rows, batch size 500)
    expect(mockBatchSet).toHaveBeenCalledTimes(25100);
    expect(mockBatchCommit).toHaveBeenCalledTimes(51); // 25000/500 + 1
  });
  
  it('should retry on GSC API failure', async () => {
    mockSearchConsoleQuery
      .mockRejectedValueOnce(new Error('API rate limit'))
      .mockResolvedValue({ data: { rows: [createMockGscRow(1)] } });
      
    // Suppress console.warn for cleaner test output
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await service.ingestData('https://example.com', '2023-01-01', '2023-01-02');
    
    expect(mockSearchConsoleQuery).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Retrying in'));
    
    const mockBatch = (admin.firestore().batch as jest.Mock).mock.results[0].value;
    expect(mockBatch.commit).toHaveBeenCalledTimes(1);

    consoleWarnSpy.mockRestore();
  });
});