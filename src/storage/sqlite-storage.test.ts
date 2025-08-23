import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HttpTrafficEntry, WebSocketTrafficEntry, TrafficFilters, SQLiteStorageOptions } from '../types/traffic.js';
import Database from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';

// Mock the SQLiteTrafficStorage class
vi.mock('./sqlite-storage.js', () => ({
  SQLiteTrafficStorage: vi.fn().mockImplementation(() => ({
    storeHttpTraffic: vi.fn().mockResolvedValue(undefined),
    storeWebSocketTraffic: vi.fn().mockResolvedValue(undefined),
    queryHttpTraffic: vi.fn().mockResolvedValue([]),
    queryWebSocketTraffic: vi.fn().mockResolvedValue([]),
    getTrafficById: vi.fn().mockResolvedValue(null),
    searchTraffic: vi.fn().mockResolvedValue([]),
    getTrafficStats: vi.fn().mockResolvedValue({
      totalRequests: 1000,
      totalWebSocketConnections: 50,
      totalWebSocketMessages: 500,
      uniqueHosts: 25,
      errorRate: 0.05,
      averageResponseTime: 150.5,
      methodDistribution: { GET: 600, POST: 400 },
      statusCodeDistribution: { 200: 800, 404: 200 },
    }),
    deleteTrafficBefore: vi.fn().mockResolvedValue(0),
    deleteAllTraffic: vi.fn().mockResolvedValue(0),
    vacuum: vi.fn().mockResolvedValue({ freedBytes: 0 }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('better-sqlite3');
vi.mock('fs');

// Import after mocking
const { SQLiteTrafficStorage } = await import('./sqlite-storage.js');

describe('SQLiteTrafficStorage', () => {
  let storage: any;
  let mockInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInstance = {
      storeHttpTraffic: vi.fn().mockResolvedValue(undefined),
      storeWebSocketTraffic: vi.fn().mockResolvedValue(undefined),
      queryHttpTraffic: vi.fn().mockResolvedValue([]),
      queryWebSocketTraffic: vi.fn().mockResolvedValue([]),
      getTrafficById: vi.fn().mockResolvedValue(null),
      searchTraffic: vi.fn().mockResolvedValue([]),
      getTrafficStats: vi.fn().mockResolvedValue({
        totalRequests: 1000,
        totalWebSocketConnections: 50,
        totalWebSocketMessages: 500,
        uniqueHosts: 25,
        errorRate: 0.05,
        averageResponseTime: 150.5,
        methodDistribution: { GET: 600, POST: 400 },
        statusCodeDistribution: { 200: 800, 404: 200 },
      }),
      deleteTrafficBefore: vi.fn().mockResolvedValue(0),
      deleteAllTraffic: vi.fn().mockResolvedValue(0),
      vacuum: vi.fn().mockResolvedValue({ freedBytes: 0 }),
      close: vi.fn().mockResolvedValue(undefined),
    };

    vi.mocked(SQLiteTrafficStorage).mockReturnValue(mockInstance);
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(mkdirSync).mockImplementation(() => '');
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      const options: SQLiteStorageOptions = {
        dbPath: './test.db',
        enableFTS: true,
      };
      storage = new SQLiteTrafficStorage(options);
    });

    it('should create storage with valid options', () => {
      expect(SQLiteTrafficStorage).toHaveBeenCalled();
      expect(storage).toBeDefined();
    });

    it('should store HTTP traffic', async () => {
      const entry: HttpTrafficEntry = {
        id: 'http-123',
        timestamp: new Date(),
        method: 'GET',
        url: 'https://example.com',
        host: 'example.com',
        path: '/',
        protocol: 'https',
        requestHeaders: {},
        requestRawHeaders: [],
      };

      await expect(storage.storeHttpTraffic(entry)).resolves.not.toThrow();
      expect(mockInstance.storeHttpTraffic).toHaveBeenCalledWith(entry);
    });

    it('should store WebSocket traffic', async () => {
      const entry: WebSocketTrafficEntry = {
        id: 'ws-123',
        timestamp: new Date(),
        url: 'wss://example.com',
        host: 'example.com',
        path: '/',
        protocol: 'wss',
        messages: [],
      };

      await expect(storage.storeWebSocketTraffic(entry)).resolves.not.toThrow();
      expect(mockInstance.storeWebSocketTraffic).toHaveBeenCalledWith(entry);
    });

    it('should query HTTP traffic', async () => {
      const filters: TrafficFilters = { host: 'example.com' };

      const result = await storage.queryHttpTraffic(filters, 10, 0, 'timestamp', 'desc');

      expect(result).toBeDefined();
      expect(mockInstance.queryHttpTraffic).toHaveBeenCalledWith(filters, 10, 0, 'timestamp', 'desc');
    });

    it('should search traffic', async () => {
      const searchOptions = {
        query: 'test',
        searchIn: ['url'] as const,
        caseSensitive: false,
        regex: false,
      };

      const result = await storage.searchTraffic(searchOptions, 10);

      expect(result).toBeDefined();
      expect(mockInstance.searchTraffic).toHaveBeenCalledWith(searchOptions, 10);
    });

    it('should get traffic statistics', async () => {
      const stats = await storage.getTrafficStats();

      expect(stats).toBeDefined();
      expect(stats.totalRequests).toBe(1000);
      expect(mockInstance.getTrafficStats).toHaveBeenCalled();
    });

    it('should close connection', async () => {
      await expect(storage.close()).resolves.not.toThrow();
      expect(mockInstance.close).toHaveBeenCalled();
    });
  });

});
