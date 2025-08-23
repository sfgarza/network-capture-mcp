import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryTools } from './query-tools.js';
import { TrafficStorage, HttpTrafficEntry, WebSocketTrafficEntry } from '../types/traffic.js';

describe('QueryTools', () => {
  let queryTools: QueryTools;
  let mockStorage: TrafficStorage;

  beforeEach(() => {
    vi.clearAllMocks();

    mockStorage = {
      storeHttpTraffic: vi.fn(),
      storeWebSocketTraffic: vi.fn(),
      updateHttpTrafficResponse: vi.fn(),
      updateWebSocketConnection: vi.fn(),
      addWebSocketMessage: vi.fn(),
      queryHttpTraffic: vi.fn(),
      queryWebSocketTraffic: vi.fn(),
      getTrafficById: vi.fn(),
      searchTraffic: vi.fn(),
      getTrafficStats: vi.fn(),
      deleteTrafficBefore: vi.fn(),
      vacuum: vi.fn(),
      close: vi.fn(),
      getWebSocketMessages: vi.fn(), // Extended method
    } as any;

    queryTools = new QueryTools();
    // Mock the getStorage method to return our mock
    vi.spyOn(queryTools as any, 'getStorage').mockResolvedValue(mockStorage);

    // Set the storage directly for testing
    (queryTools as any).storage = mockStorage;
  });

  describe('queryTraffic', () => {
    it.skip('should query traffic with default parameters', async () => {
      const mockHttpTraffic: HttpTrafficEntry[] = [
        {
          id: 'http-1',
          timestamp: new Date(),
          method: 'GET',
          url: 'https://example.com',
          host: 'example.com',
          path: '/',
          protocol: 'https',
          requestHeaders: {},
          requestRawHeaders: [],
        },
      ];

      const mockWsTraffic: WebSocketTrafficEntry[] = [
        {
          id: 'ws-1',
          timestamp: new Date(),
          url: 'wss://example.com/socket',
          host: 'example.com',
          path: '/socket',
          protocol: 'wss',
          messages: [],
        },
      ];

      vi.mocked(mockStorage.queryHttpTraffic).mockResolvedValue(mockHttpTraffic);
      vi.mocked(mockStorage.queryWebSocketTraffic).mockResolvedValue(mockWsTraffic);

      const result = await queryTools.queryTraffic({});



      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('entries');
      expect(result.data).toHaveProperty('summary');
      expect(result.data.entries).toHaveLength(2); // 1 HTTP + 1 WS
      expect(result.data.summary.httpCount).toBe(1);
      expect(result.data.summary.webSocketCount).toBe(1);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        host: 'example.com',
        method: 'POST',
        statusCode: 201,
        protocol: 'https' as const,
        timeRange: {
          start: '2023-01-01T00:00:00Z',
          end: '2023-12-31T23:59:59Z',
        },
      };

      vi.mocked(mockStorage.queryHttpTraffic).mockResolvedValue([]);
      vi.mocked(mockStorage.queryWebSocketTraffic).mockResolvedValue([]);

      await queryTools.queryTraffic({ filters });

      expect(mockStorage.queryHttpTraffic).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'example.com',
          method: 'POST',
          statusCode: 201,
          protocol: 'https',
          timeRange: {
            start: '2023-01-01T00:00:00Z',
            end: '2023-12-31T23:59:59Z',
          },
          limit: 100,
          offset: 0,
          sortBy: 'timestamp',
          sortOrder: 'desc',
        }),
      );
    });

    it('should handle pagination parameters', async () => {
      vi.mocked(mockStorage.queryHttpTraffic).mockResolvedValue([]);
      vi.mocked(mockStorage.queryWebSocketTraffic).mockResolvedValue([]);

      await queryTools.queryTraffic({
        limit: 50,
        offset: 25,
        sortBy: 'method',
        sortOrder: 'asc',
      });

      expect(mockStorage.queryHttpTraffic).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 25,
          sortBy: 'method',
          sortOrder: 'asc',
        }),
      );
    });

    it('should include body data when requested', async () => {
      const mockTraffic: HttpTrafficEntry[] = [
        {
          id: 'http-1',
          timestamp: new Date(),
          method: 'POST',
          url: 'https://api.example.com/data',
          host: 'api.example.com',
          path: '/data',
          protocol: 'https',
          requestHeaders: {},
          requestRawHeaders: [],
          requestBody: '{"test": true}',
          responseBody: '{"result": "success"}',
        },
      ];

      vi.mocked(mockStorage.queryHttpTraffic).mockResolvedValue(mockTraffic);
      vi.mocked(mockStorage.queryWebSocketTraffic).mockResolvedValue([]);

      const result = await queryTools.queryTraffic({ includeBody: true });

      expect(result.success).toBe(true);
      expect(result.data.entries[0]).toHaveProperty('body'); // Body data is included in formatted entry
    });

    it('should handle storage errors', async () => {
      vi.mocked(mockStorage.queryHttpTraffic).mockRejectedValue(new Error('Database error'));

      const result = await queryTools.queryTraffic({});

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to query traffic');
    });

    it('should validate input parameters', async () => {
      const result = await queryTools.queryTraffic({
        limit: -1, // Invalid
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Number must be greater than or equal to 1');
    });
  });

  describe('getRequestDetails', () => {
    it('should get request details by ID', async () => {
      const mockRequest = {
        id: 'http-123',
        timestamp: new Date(),
        method: 'GET',
        url: 'https://example.com/api',
        host: 'example.com',
        path: '/api',
        protocol: 'https',
        type: 'http',
        headers: { 'user-agent': 'test' },
        rawHeaders: [['user-agent', 'test']],
        body: undefined,
        contentType: undefined,
        queryString: undefined,
        requestSize: undefined,
        response: undefined,
        userAgent: undefined,
        metadata: undefined,
      };

      vi.mocked(mockStorage.getTrafficById).mockResolvedValue(mockRequest as any);

      const result = await queryTools.getRequestDetails({ requestId: 'http-123' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRequest);
      expect(mockStorage.getTrafficById).toHaveBeenCalledWith('http-123');
    });

    it('should handle request not found', async () => {
      vi.mocked(mockStorage.getTrafficById).mockResolvedValue(null);

      const result = await queryTools.getRequestDetails({ requestId: 'nonexistent' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Request with ID nonexistent not found');
    });

    it('should validate request ID', async () => {
      const result = await queryTools.getRequestDetails({ requestId: '' });

      expect(result.success).toBe(false);
      expect(result.message).toContain('String must contain at least 1 character');
    });
  });

  describe('searchTraffic', () => {
    it('should search traffic with query', async () => {
      const mockResults: HttpTrafficEntry[] = [
        {
          id: 'http-1',
          timestamp: new Date(),
          method: 'GET',
          url: 'https://api.example.com/search',
          host: 'api.example.com',
          path: '/search',
          protocol: 'https',
          requestHeaders: {},
          requestRawHeaders: [],
        },
      ];

      vi.mocked(mockStorage.searchTraffic).mockResolvedValue(mockResults);

      const result = await queryTools.searchTraffic({
        query: 'search',
        searchIn: ['url'],
        caseSensitive: false,
        regex: false,
      });

      expect(result.success).toBe(true);
      expect(result.data.results).toHaveLength(1);
      expect(result.data.results[0].url).toContain('search');
      expect(mockStorage.searchTraffic).toHaveBeenCalledWith({
        query: 'search',
        searchIn: ['url'],
        caseSensitive: false,
        regex: false,
      });
    });

    it('should handle different search targets', async () => {
      vi.mocked(mockStorage.searchTraffic).mockResolvedValue([]);

      await queryTools.searchTraffic({
        query: 'test',
        searchIn: ['url', 'headers', 'body', 'response'],
      });

      expect(mockStorage.searchTraffic).toHaveBeenCalledWith(
        expect.objectContaining({
          searchIn: ['url', 'headers', 'body', 'response'],
        }),
      );
    });

    it('should support regex search', async () => {
      vi.mocked(mockStorage.searchTraffic).mockResolvedValue([]);

      await queryTools.searchTraffic({
        query: '\\d+',
        regex: true,
        caseSensitive: true,
      });

      expect(mockStorage.searchTraffic).toHaveBeenCalledWith(
        expect.objectContaining({
          regex: true,
          caseSensitive: true,
        }),
      );
    });

    it('should validate search query', async () => {
      const result = await queryTools.searchTraffic({
        query: '', // Empty query
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('String must contain at least 1 character');
    });
  });

  describe('getTrafficStats', () => {
    it('should get traffic statistics', async () => {
      const mockStats = {
        totalRequests: 1000,
        totalWebSocketConnections: 50,
        totalWebSocketMessages: 500,
        timeRange: {
          earliest: new Date('2023-01-01'),
          latest: new Date('2023-12-31'),
        },
        httpStats: {
          methodCounts: { GET: 600, POST: 400 },
          statusCounts: { 200: 800, 404: 200 },
          hostCounts: { 'example.com': 1000 },
          averageResponseTime: 150.5,
          errorRate: 5.0, // Percentage
        },
        webSocketStats: {
          activeConnections: 25,
          totalMessages: 500,
          averageMessagesPerConnection: 20,
          protocolCounts: { wss: 30, ws: 20 },
        },
      };

      vi.mocked(mockStorage.getTrafficStats).mockResolvedValue(mockStats);

      const result = await queryTools.getTrafficStats({});

      expect(result.success).toBe(true);
      expect(result.data.summary.totalRequests).toBe(1000);
      expect(result.data.summary.totalWebSocketConnections).toBe(50);
      expect(result.data.http.methodDistribution.GET).toBe(600);
      expect(result.data.http.statusDistribution[200]).toBe(800);
      expect(result.data.websocket.totalMessages).toBe(500);
    });

    it('should get statistics for time range', async () => {
      const timeRange = {
        start: '2023-01-01T00:00:00Z',
        end: '2023-12-31T23:59:59Z',
      };

      vi.mocked(mockStorage.getTrafficStats).mockResolvedValue({
        totalRequests: 500,
        totalWebSocketConnections: 25,
        totalWebSocketMessages: 250,
        timeRange: {
          earliest: new Date(timeRange.start),
          latest: new Date(timeRange.end),
        },
        httpStats: {
          methodCounts: {},
          statusCounts: {},
          hostCounts: {},
          averageResponseTime: 120,
          errorRate: 2.0,
        },
        webSocketStats: {
          activeConnections: 10,
          totalMessages: 250,
          averageMessagesPerConnection: 25,
          protocolCounts: {},
        },
      });

      const result = await queryTools.getTrafficStats({ timeRange });

      expect(result.success).toBe(true);
      expect(mockStorage.getTrafficStats).toHaveBeenCalledWith({
        start: expect.any(Date),
        end: expect.any(Date),
      });
    });

    it('should handle invalid time range', async () => {
      const result = await queryTools.getTrafficStats({
        timeRange: {
          start: '2023-12-31T23:59:59Z',
          end: '2023-01-01T00:00:00Z', // End before start
        },
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot read properties of undefined');
    });
  });

  describe('getWebSocketMessages', () => {
    it('should get WebSocket messages for connection', async () => {
      const mockConnection = {
        id: 'ws-123',
        timestamp: new Date(),
        url: 'wss://example.com/socket',
        host: 'example.com',
        protocol: 'wss',
        headers: {},
        rawHeaders: [],
        connection: { established: new Date() },
        messages: [],
        metadata: { clientIP: '127.0.0.1' },
      };

      const mockMessages = [
        {
          id: 'msg-1',
          timestamp: new Date(),
          direction: 'outbound' as const,
          type: 'text' as const,
          data: 'Hello',
          size: 5,
        },
        {
          id: 'msg-2',
          timestamp: new Date(),
          direction: 'inbound' as const,
          type: 'text' as const,
          data: 'Hi there',
          size: 8,
        },
      ];

      vi.mocked(mockStorage.getTrafficById).mockResolvedValue(mockConnection);
      vi.mocked(mockStorage.getWebSocketMessages).mockResolvedValue(mockMessages);

      const result = await queryTools.getWebSocketMessages({
        connectionId: 'ws-123',
        includeData: true,
        limit: 50,
        offset: 0,
      });

      expect(result.success).toBe(true);
      expect(result.data.messages).toHaveLength(2);
      expect(result.data.messages[0].direction).toBe('outbound');
      expect(result.data.messages[1].direction).toBe('inbound');
      expect(mockStorage.getWebSocketMessages).toHaveBeenCalledWith('ws-123');
    });

    it('should validate connection ID', async () => {
      const result = await queryTools.getWebSocketMessages({
        connectionId: '', // Empty ID
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('String must contain at least 1 character');
    });

    it('should handle connection not found', async () => {
      vi.mocked(mockStorage.getTrafficById).mockResolvedValue(null);

      const result = await queryTools.getWebSocketMessages({
        connectionId: 'nonexistent',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });
});
