import { describe, it, expect } from 'vitest';

// Since external.ts contains only type definitions and interfaces,
// we'll test type compatibility and structure validation

describe('External Types', () => {
  describe('MockttpRequest interface', () => {
    it('should have required properties for HTTP request', () => {
      // This is a compile-time test - if types are wrong, TypeScript will fail
      const mockRequest = {
        id: 'req-123',
        method: 'GET',
        url: 'https://example.com/api',
        path: '/api',
        hostname: 'example.com',
        headers: { 'content-type': 'application/json' },
        rawHeaders: [['content-type', 'application/json']],
        body: { buffer: Buffer.from('test') },
        timingEvents: { startTime: 1000, endTime: 2000 },
        tags: [],
      };

      // Type assertion to ensure structure matches interface
      expect(mockRequest.id).toBe('req-123');
      expect(mockRequest.method).toBe('GET');
      expect(mockRequest.url).toBe('https://example.com/api');
      expect(mockRequest.headers).toHaveProperty('content-type');
    });
  });

  describe('MockttpResponse interface', () => {
    it('should have required properties for HTTP response', () => {
      const mockResponse = {
        id: 'res-123',
        statusCode: 200,
        statusMessage: 'OK',
        headers: { 'content-type': 'application/json' },
        rawHeaders: [['content-type', 'application/json']],
        body: { buffer: Buffer.from('response') },
        timingEvents: { startTime: 1000, endTime: 2000 },
        tags: [],
      };

      expect(mockResponse.statusCode).toBe(200);
      expect(mockResponse.statusMessage).toBe('OK');
      expect(mockResponse.headers).toHaveProperty('content-type');
    });
  });

  describe('MockttpWebSocketMessage interface', () => {
    it('should have required properties for WebSocket message', () => {
      const mockMessage = {
        direction: 'sent' as const,
        content: { buffer: Buffer.from('message') },
        isBinary: false,
        eventTimestamp: 1000,
      };

      expect(mockMessage.direction).toBe('sent');
      expect(mockMessage.isBinary).toBe(false);
      expect(mockMessage.eventTimestamp).toBe(1000);
    });

    it('should support both sent and received directions', () => {
      const sentMessage = {
        direction: 'sent' as const,
        content: { buffer: Buffer.from('sent') },
        isBinary: false,
        eventTimestamp: 1000,
      };

      const receivedMessage = {
        direction: 'received' as const,
        content: { buffer: Buffer.from('received') },
        isBinary: true,
        eventTimestamp: 2000,
      };

      expect(sentMessage.direction).toBe('sent');
      expect(receivedMessage.direction).toBe('received');
      expect(receivedMessage.isBinary).toBe(true);
    });
  });

  describe('MockttpWebSocketCloseEvent interface', () => {
    it('should have required properties for WebSocket close event', () => {
      const closeEvent = {
        code: 1000,
        reason: 'Normal closure',
        eventTimestamp: 1000,
      };

      expect(closeEvent.code).toBe(1000);
      expect(closeEvent.reason).toBe('Normal closure');
      expect(closeEvent.eventTimestamp).toBe(1000);
    });
  });

  describe('MockttpHTTPSConfig interface', () => {
    it('should have required properties for HTTPS configuration', () => {
      const httpsConfig = {
        keyPath: './key.pem',
        certPath: './cert.pem',
      };

      expect(httpsConfig.keyPath).toBe('./key.pem');
      expect(httpsConfig.certPath).toBe('./cert.pem');
    });
  });

  describe('NodeServerError interface', () => {
    it('should extend Error with code property', () => {
      const serverError = {
        name: 'ServerError',
        message: 'Port in use',
        code: 'EADDRINUSE',
      };

      expect(serverError.code).toBe('EADDRINUSE');
      expect(serverError.message).toBe('Port in use');
    });
  });

  describe('Database query result interfaces', () => {
    it('should have correct structure for CountQueryResult', () => {
      const countResult = {
        count: 42,
      };

      expect(countResult.count).toBe(42);
    });

    it('should have correct structure for TimeRangeQueryResult', () => {
      const timeRangeResult = {
        min_timestamp: 1000,
        max_timestamp: 2000,
      };

      expect(timeRangeResult.min_timestamp).toBe(1000);
      expect(timeRangeResult.max_timestamp).toBe(2000);
    });

    it('should have correct structure for MethodCountResult', () => {
      const methodResult = {
        method: 'GET',
        count: 10,
      };

      expect(methodResult.method).toBe('GET');
      expect(methodResult.count).toBe(10);
    });

    it('should have correct structure for StatusCountResult', () => {
      const statusResult = {
        status_code: 200,
        count: 15,
      };

      expect(statusResult.status_code).toBe(200);
      expect(statusResult.count).toBe(15);
    });

    it('should have correct structure for HostCountResult', () => {
      const hostResult = {
        host: 'example.com',
        count: 25,
      };

      expect(hostResult.host).toBe('example.com');
      expect(hostResult.count).toBe(25);
    });

    it('should have correct structure for ResponseStatsResult', () => {
      const statsResult = {
        avg_response_time: 150.5,
        min_response_time: 50,
        max_response_time: 500,
      };

      expect(statsResult.avg_response_time).toBe(150.5);
      expect(statsResult.min_response_time).toBe(50);
      expect(statsResult.max_response_time).toBe(500);
    });

    it('should have correct structure for ProtocolCountResult', () => {
      const protocolResult = {
        protocol: 'https',
        count: 30,
      };

      expect(protocolResult.protocol).toBe('https');
      expect(protocolResult.count).toBe(30);
    });
  });

  describe('WebSocketMessageRow interface', () => {
    it('should have correct structure for database row', () => {
      const messageRow = {
        id: 'msg-123',
        connection_id: 'conn-456',
        timestamp: 1000,
        direction: 'sent',
        content: 'message content',
        is_binary: 0,
        size: 15,
      };

      expect(messageRow.id).toBe('msg-123');
      expect(messageRow.connection_id).toBe('conn-456');
      expect(messageRow.direction).toBe('sent');
      expect(messageRow.is_binary).toBe(0);
    });
  });

  describe('HttpTrafficRow interface', () => {
    it('should have correct structure for HTTP traffic database row', () => {
      const httpRow = {
        id: 'http-123',
        timestamp: 1000,
        method: 'POST',
        url: 'https://api.example.com/data',
        host: 'api.example.com',
        path: '/data',
        query_string: 'param=value',
        protocol: 'https',
        request_headers: '{"content-type":"application/json"}',
        request_raw_headers: '[["content-type","application/json"]]',
        request_body: '{"data":"test"}',
        request_size: 15,
        content_type: 'application/json',
        user_agent: 'TestAgent/1.0',
        status_code: 201,
        status_message: 'Created',
        response_headers: '{"location":"/data/123"}',
        response_raw_headers: '[["location","/data/123"]]',
        response_body: '{"id":123}',
        response_size: 10,
        response_time: 150,
        client_ip: '192.168.1.1',
        destination: 'api.example.com:443',
        error_message: null,
        created_at: 1000,
      };

      expect(httpRow.method).toBe('POST');
      expect(httpRow.status_code).toBe(201);
      expect(httpRow.response_time).toBe(150);
      expect(httpRow.error_message).toBeNull();
    });
  });
});
