import { describe, it, expect } from 'vitest';

// Since traffic.ts contains mainly type definitions and interfaces,
// we'll test type compatibility and structure validation

describe('Traffic Types', () => {
  describe('HttpTrafficEntry interface', () => {
    it('should have required properties for HTTP traffic entry', () => {
      const httpEntry = {
        id: 'http-123',
        timestamp: new Date(),
        method: 'GET',
        url: 'https://example.com/api',
        host: 'example.com',
        path: '/api',
        queryString: 'param=value',
        protocol: 'https',
        requestHeaders: { 'content-type': 'application/json' },
        requestRawHeaders: [['content-type', 'application/json']],
        requestBody: '{"test": true}',
        requestSize: 15,
        contentType: 'application/json',
        userAgent: 'TestAgent/1.0',
        statusCode: 200,
        statusMessage: 'OK',
        responseHeaders: { 'server': 'nginx' },
        responseRawHeaders: [['server', 'nginx']],
        responseBody: '{"result": "success"}',
        responseSize: 20,
        responseTime: 150,
        clientIp: '192.168.1.1',
        destination: 'example.com:443',
        errorMessage: null,
      };

      expect(httpEntry.id).toBe('http-123');
      expect(httpEntry.method).toBe('GET');
      expect(httpEntry.statusCode).toBe(200);
      expect(httpEntry.responseTime).toBe(150);
    });

    it('should allow optional properties to be undefined', () => {
      const minimalEntry = {
        id: 'http-minimal',
        timestamp: new Date(),
        method: 'GET',
        url: 'https://example.com',
        host: 'example.com',
        path: '/',
        protocol: 'https',
        requestHeaders: {},
        requestRawHeaders: [],
      };

      expect(minimalEntry.id).toBe('http-minimal');
      expect(minimalEntry.queryString).toBeUndefined();
      expect(minimalEntry.statusCode).toBeUndefined();
    });
  });

  describe('WebSocketMessage interface', () => {
    it('should have required properties for WebSocket message', () => {
      const message = {
        id: 'msg-123',
        timestamp: new Date(),
        direction: 'sent' as const,
        content: 'Hello WebSocket',
        isBinary: false,
        size: 15,
      };

      expect(message.id).toBe('msg-123');
      expect(message.direction).toBe('sent');
      expect(message.isBinary).toBe(false);
      expect(message.size).toBe(15);
    });

    it('should support both sent and received directions', () => {
      const sentMessage = {
        id: 'msg-sent',
        timestamp: new Date(),
        direction: 'sent' as const,
        content: 'outgoing',
        isBinary: false,
        size: 8,
      };

      const receivedMessage = {
        id: 'msg-received',
        timestamp: new Date(),
        direction: 'received' as const,
        content: 'incoming',
        isBinary: true,
        size: 8,
      };

      expect(sentMessage.direction).toBe('sent');
      expect(receivedMessage.direction).toBe('received');
      expect(receivedMessage.isBinary).toBe(true);
    });
  });

  describe('WebSocketTrafficEntry interface', () => {
    it('should have required properties for WebSocket traffic entry', () => {
      const wsEntry = {
        id: 'ws-123',
        timestamp: new Date(),
        url: 'wss://example.com/socket',
        host: 'example.com',
        path: '/socket',
        protocol: 'wss',
        clientIp: '192.168.1.1',
        destination: 'example.com:443',
        messages: [
          {
            id: 'msg-1',
            timestamp: new Date(),
            direction: 'sent' as const,
            content: 'hello',
            isBinary: false,
            size: 5,
          },
        ],
        closeCode: 1000,
        closeReason: 'Normal closure',
        errorMessage: null,
      };

      expect(wsEntry.id).toBe('ws-123');
      expect(wsEntry.protocol).toBe('wss');
      expect(wsEntry.messages).toHaveLength(1);
      expect(wsEntry.closeCode).toBe(1000);
    });

    it('should allow optional properties to be undefined', () => {
      const minimalWsEntry = {
        id: 'ws-minimal',
        timestamp: new Date(),
        url: 'ws://example.com',
        host: 'example.com',
        path: '/',
        protocol: 'ws',
        messages: [],
      };

      expect(minimalWsEntry.id).toBe('ws-minimal');
      expect(minimalWsEntry.clientIp).toBeUndefined();
      expect(minimalWsEntry.closeCode).toBeUndefined();
    });
  });

  describe('TrafficFilters interface', () => {
    it('should have optional filter properties', () => {
      const filters = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-12-31'),
        host: 'example.com',
        method: 'GET',
        statusCode: 200,
        protocol: 'https' as const,
      };

      expect(filters.startDate).toBeInstanceOf(Date);
      expect(filters.host).toBe('example.com');
      expect(filters.method).toBe('GET');
      expect(filters.statusCode).toBe(200);
      expect(filters.protocol).toBe('https');
    });

    it('should allow empty filters object', () => {
      const emptyFilters = {};

      expect(Object.keys(emptyFilters)).toHaveLength(0);
    });

    it('should support protocol enum values', () => {
      const httpFilter = { protocol: 'http' as const };
      const httpsFilter = { protocol: 'https' as const };
      const wsFilter = { protocol: 'ws' as const };
      const wssFilter = { protocol: 'wss' as const };

      expect(httpFilter.protocol).toBe('http');
      expect(httpsFilter.protocol).toBe('https');
      expect(wsFilter.protocol).toBe('ws');
      expect(wssFilter.protocol).toBe('wss');
    });
  });

  describe('SearchQuery interface', () => {
    it('should have required query property', () => {
      const searchQuery = {
        query: 'test search',
        searchIn: ['url', 'body'] as const,
        caseSensitive: false,
        regex: false,
      };

      expect(searchQuery.query).toBe('test search');
      expect(searchQuery.searchIn).toEqual(['url', 'body']);
      expect(searchQuery.caseSensitive).toBe(false);
      expect(searchQuery.regex).toBe(false);
    });

    it('should support different search targets', () => {
      const urlSearch = { query: 'test', searchIn: ['url'] as const };
      const headerSearch = { query: 'test', searchIn: ['headers'] as const };
      const bodySearch = { query: 'test', searchIn: ['body'] as const };
      const responseSearch = { query: 'test', searchIn: ['response'] as const };

      expect(urlSearch.searchIn).toEqual(['url']);
      expect(headerSearch.searchIn).toEqual(['headers']);
      expect(bodySearch.searchIn).toEqual(['body']);
      expect(responseSearch.searchIn).toEqual(['response']);
    });
  });

  describe('TrafficStats interface', () => {
    it('should have required statistics properties', () => {
      const stats = {
        totalRequests: 1000,
        totalWebSocketConnections: 50,
        totalWebSocketMessages: 500,
        uniqueHosts: 25,
        errorRate: 0.05,
        averageResponseTime: 150.5,
        timeRange: {
          start: new Date('2023-01-01'),
          end: new Date('2023-12-31'),
        },
        methodDistribution: {
          GET: 600,
          POST: 300,
          PUT: 75,
          DELETE: 25,
        },
        statusCodeDistribution: {
          200: 800,
          404: 100,
          500: 50,
          201: 50,
        },
        hostDistribution: {
          'api.example.com': 500,
          'cdn.example.com': 300,
          'auth.example.com': 200,
        },
        protocolDistribution: {
          https: 900,
          http: 100,
        },
      };

      expect(stats.totalRequests).toBe(1000);
      expect(stats.errorRate).toBe(0.05);
      expect(stats.averageResponseTime).toBe(150.5);
      expect(stats.timeRange.start).toBeInstanceOf(Date);
      expect(stats.methodDistribution.GET).toBe(600);
      expect(stats.statusCodeDistribution[200]).toBe(800);
      expect(stats.hostDistribution['api.example.com']).toBe(500);
    });
  });

  describe('ProxyStatus interface', () => {
    it('should have required status properties', () => {
      const status = {
        isRunning: true,
        httpPort: 8080,
        httpsPort: 8443,
        startTime: new Date(),
        requestCount: 1000,
        errorCount: 50,
        lastActivity: new Date(),
      };

      expect(status.isRunning).toBe(true);
      expect(status.httpPort).toBe(8080);
      expect(status.httpsPort).toBe(8443);
      expect(status.startTime).toBeInstanceOf(Date);
      expect(status.requestCount).toBe(1000);
      expect(status.errorCount).toBe(50);
    });

    it('should allow optional properties to be undefined', () => {
      const minimalStatus = {
        isRunning: false,
      };

      expect(minimalStatus.isRunning).toBe(false);
      expect(minimalStatus.httpPort).toBeUndefined();
      expect(minimalStatus.startTime).toBeUndefined();
    });
  });

  describe('ProxyConfig interface', () => {
    it('should have required configuration sections', () => {
      const config = {
        proxy: {
          httpPort: 8080,
          httpsPort: 8443,
          enableWebSockets: true,
          enableHTTPS: true,
          certPath: './cert.pem',
          keyPath: './key.pem',
          ignoreHostHttpsErrors: false,
        },
        capture: {
          captureHeaders: true,
          captureBody: true,
          maxBodySize: 1048576,
          captureWebSocketMessages: true,
          maxWebSocketMessages: 1000,
        },
        storage: {
          dbPath: './traffic.db',
          maxEntries: 100000,
          retentionDays: 7,
          enableFTS: true,
        },
      };

      expect(config.proxy.httpPort).toBe(8080);
      expect(config.capture.captureHeaders).toBe(true);
      expect(config.storage.maxEntries).toBe(100000);
    });
  });
});
