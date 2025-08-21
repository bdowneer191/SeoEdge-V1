import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { Buffer } from 'node:buffer';

// Mock dependencies before importing the module
const mockFirestoreBatchCommit = jest.fn();
const mockFirestoreBatchSet = jest.fn();
const mockSearchConsoleQuery = jest.fn();

jest.mock('./firestore-client', () => ({
  firestore: {
    batch: jest.fn(() => ({
      set: mockFirestoreBatchSet,
      commit: mockFirestoreBatchCommit,
    })),
    collection: jest.fn(() => ({
      doc: jest.fn(),
    })),
  },
}));

jest.mock('googleapis', () => ({
  google: {
    auth: {
      GoogleAuth: jest.fn(),
    },
    searchconsole: jest.fn(() => ({
      searchanalytics: {
        query: mockSearchConsoleQuery,
      },
    })),
  },
}));

jest.mock('./urlUtils', () => ({
  normalizeUrl: jest.fn(url => `${url}/normalized`),
}));

// Now import the module
import { ingestGscData } from './gsc-ingestor';
import { normalizeUrl } from './urlUtils';

describe('ingestGscData', () => {

  beforeEach(() => {
    jest.resetModules(); // Reset modules to allow env var changes
    // Set up environment variables
    process.env.GSC_SERVICE_ACCOUNT_BASE64 = Buffer.from(
      JSON.stringify({ client_email: 'gsc@test.com', private_key: 'gsc_key' })
    ).toString('base64');
    process.env.FIREBASE_ADMIN_SDK_JSON_BASE64 = Buffer.from(
      JSON.stringify({ client_email: 'firebase@test.com', private_key: 'firebase_key' })
    ).toString('base64');

    jest.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.GSC_SERVICE_ACCOUNT_BASE64;
    delete process.env.FIREBASE_ADMIN_SDK_JSON_BASE64;
  });

  const createMockGscRow = (i: number) => ({
    keys: [
      '2023-01-01',
      `query ${i}`,
      `https://example.com/page${i}`,
      'DESKTOP',
      'USA',
      'News', // searchAppearance
    ],
    clicks: i,
    impressions: i * 10,
    ctr: 0.1, // Will be ignored
    position: i,
  });

  it('should fetch, transform, and write data in a single batch', async () => {
    const mockRows = Array.from({ length: 10 }, (_, i) => createMockGscRow(i));
    mockSearchConsoleQuery.mockResolvedValue({ data: { rows: mockRows } });
    mockFirestoreBatchCommit.mockResolvedValue(true);

    await ingestGscData('sc-domain:example.com', '2023-01-01', '2023-01-02');

    // Verify GSC call
    expect(mockSearchConsoleQuery).toHaveBeenCalledTimes(1);
    expect(mockSearchConsoleQuery).toHaveBeenCalledWith(expect.objectContaining({
      siteUrl: 'sc-domain:example.com',
      requestBody: expect.objectContaining({
        dimensions: ['date', 'query', 'page', 'device', 'country', 'searchAppearance'],
      }),
    }));

    // Verify Firestore write
    expect(mockFirestoreBatchSet).toHaveBeenCalledTimes(10);
    expect(mockFirestoreBatchCommit).toHaveBeenCalledTimes(1);

    // Verify data transformation
    expect(normalizeUrl).toHaveBeenCalledTimes(10);
    const firstCallData = mockFirestoreBatchSet.mock.calls[0][1];
    expect(firstCallData).toEqual({
      site: 'sc-domain:example.com',
      url: 'https://example.com/page0/normalized',
      query: 'query 0',
      date: '2023-01-01',
      impressions: 0,
      clicks: 0,
      position: 0,
      device: 'DESKTOP',
      country: 'USA',
      searchAppearance: 'News',
    });
    expect(firstCallData.ctr).toBeUndefined();
  });

  it('should handle pagination correctly', async () => {
    const firstPageRows = Array.from({ length: 25000 }, (_, i) => createMockGscRow(i));
    const secondPageRows = Array.from({ length: 100 }, (_, i) => createMockGscRow(i + 25000));

    mockSearchConsoleQuery
      .mockResolvedValueOnce({ data: { rows: firstPageRows } })
      .mockResolvedValueOnce({ data: { rows: secondPageRows } });
    mockFirestoreBatchCommit.mockResolvedValue(true);

    await ingestGscData('sc-domain:example.com', '2023-01-01', '2023-01-02');

    expect(mockSearchConsoleQuery).toHaveBeenCalledTimes(2);
    expect(mockSearchConsoleQuery).toHaveBeenCalledWith(expect.objectContaining({ requestBody: expect.objectContaining({ startRow: 0 })}));
    expect(mockSearchConsoleQuery).toHaveBeenCalledWith(expect.objectContaining({ requestBody: expect.objectContaining({ startRow: 25000 })}));

    expect(mockFirestoreBatchSet).toHaveBeenCalledTimes(25100);
    // 25100 rows, batch size 450 -> ceil(25100 / 450) = 56 commits
    expect(mockFirestoreBatchCommit).toHaveBeenCalledTimes(56);
  });

  it('should retry on GSC API failure and succeed', async () => {
    mockSearchConsoleQuery
      .mockRejectedValueOnce(new Error('API rate limit'))
      .mockResolvedValue({ data: { rows: [createMockGscRow(1)] } });
    mockFirestoreBatchCommit.mockResolvedValue(true);

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await ingestGscData('sc-domain:example.com', '2023-01-01', '2023-01-02');

    expect(mockSearchConsoleQuery).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Retrying in'));
    expect(mockFirestoreBatchCommit).toHaveBeenCalledTimes(1);

    consoleWarnSpy.mockRestore();
  });

  it('should retry on Firestore commit failure and succeed', async () => {
    mockSearchConsoleQuery.mockResolvedValue({ data: { rows: [createMockGscRow(1)] } });
    mockFirestoreBatchCommit
      .mockRejectedValueOnce(new Error('Firestore timeout'))
      .mockResolvedValue(true);

    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    await ingestGscData('sc-domain:example.com', '2023-01-01', '2023-01-02');

    expect(mockFirestoreBatchCommit).toHaveBeenCalledTimes(2);
    expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Retrying in'));

    consoleWarnSpy.mockRestore();
  });

  it('should throw an error if GSC env var is not set', () => {
    delete process.env.GSC_SERVICE_ACCOUNT_BASE64;
    // Use require here to import the module after the env var has been deleted
    const { ingestGscData } = require('./gsc-ingestor');
    // Expect the function call to throw
    expect(ingestGscData('site', 'date', 'date')).rejects.toThrow(
      'GSC_SERVICE_ACCOUNT_BASE64 env variable not set.'
    );
  });
});