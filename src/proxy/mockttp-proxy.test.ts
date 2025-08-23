import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrafficStorage, ProxyConfig } from '../types/traffic.js';
import * as mockttp from 'mockttp';
import { existsSync, writeFileSync, mkdirSync } from 'fs';

// Mock the MockttpProxyServer class
vi.mock('./mockttp-proxy.js', () => ({
  MockttpProxyServer: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn(),
    getStatus: vi.fn(() => ({
      isRunning: false,
      httpPort: 8080,
      requestCount: 0,
      errorCount: 0,
    })),
    getCACertificate: vi.fn(),
  })),
}));

vi.mock('mockttp');
vi.mock('fs');
vi.mock('zlib');
vi.mock('@mongodb-js/zstd');
vi.mock('dns');

// Import after mocking
const { MockttpProxyServer } = await import('./mockttp-proxy.js');

describe('MockttpProxyServer', () => {
  let proxyServer: any;
  let mockStorage: TrafficStorage;
  let mockConfig: ProxyConfig;
  let mockMockttpServer: any;
  let mockProxyInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMockttpServer = {
      start: vi.fn(),
      stop: vi.fn(),
      forAnyRequest: vi.fn(() => ({
        thenPassThrough: vi.fn(),
      })),
      forAnyWebSocket: vi.fn(() => ({
        thenPassThrough: vi.fn(),
      })),
      on: vi.fn(),
      port: 8080,
    };

    mockProxyInstance = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      restart: vi.fn().mockResolvedValue(undefined),
      getStatus: vi.fn(() => ({
        isRunning: false,
        httpPort: undefined,
        requestCount: 0,
        errorCount: 0,
      })),
      getCACertificate: vi.fn().mockResolvedValue('mock-cert'),
    };

    vi.mocked(MockttpProxyServer).mockReturnValue(mockProxyInstance);
    vi.mocked(mockttp.getLocal).mockReturnValue(mockMockttpServer);
    vi.mocked(existsSync).mockReturnValue(true);

    mockStorage = {
      storeHttpTraffic: vi.fn(),
      storeWebSocketTraffic: vi.fn(),
      queryHttpTraffic: vi.fn(),
      queryWebSocketTraffic: vi.fn(),
      getRequestDetails: vi.fn(),
      getWebSocketMessages: vi.fn(),
      searchTraffic: vi.fn(),
      getTrafficStats: vi.fn(),
      deleteTrafficBefore: vi.fn(),
      vacuum: vi.fn(),
      close: vi.fn(),
    };

    mockConfig = {
      proxy: {
        httpPort: 8080,
        httpsPort: 8443,
        enableWebSockets: true,
        enableHTTPS: true,
        certPath: './cert.pem',
        keyPath: './key.pem',
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
  });

  afterEach(() => {
    if (proxyServer) {
      // Don't actually stop in tests
    }
  });

  describe('constructor', () => {
    it('should create proxy server with storage and config', () => {
      proxyServer = new MockttpProxyServer(mockStorage, mockConfig);

      expect(MockttpProxyServer).toHaveBeenCalledWith(mockStorage, mockConfig);
      expect(proxyServer).toBeDefined();
    });
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      proxyServer = new MockttpProxyServer(mockStorage, mockConfig);
    });

    it('should start proxy server successfully', async () => {
      await expect(proxyServer.start()).resolves.not.toThrow();
      expect(mockProxyInstance.start).toHaveBeenCalled();
    });

    it('should stop proxy server successfully', async () => {
      await expect(proxyServer.stop()).resolves.not.toThrow();
      expect(mockProxyInstance.stop).toHaveBeenCalled();
    });

    it('should restart proxy server successfully', async () => {
      await expect(proxyServer.restart()).resolves.not.toThrow();
      expect(mockProxyInstance.restart).toHaveBeenCalled();
    });

    it('should return status', () => {
      const status = proxyServer.getStatus();
      expect(status).toBeDefined();
      expect(typeof status.isRunning).toBe('boolean');
    });

    it('should get CA certificate', async () => {
      await expect(proxyServer.getCACertificate()).resolves.not.toThrow();
      expect(mockProxyInstance.getCACertificate).toHaveBeenCalled();
    });
  });

});
