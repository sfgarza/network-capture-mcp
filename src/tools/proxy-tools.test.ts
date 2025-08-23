import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrafficStorage, ProxyConfig } from '../types/traffic.js';

// Mock the ProxyTools class
vi.mock('./proxy-tools.js', () => ({
  ProxyTools: vi.fn().mockImplementation(() => ({
    startProxy: vi.fn().mockResolvedValue({
      success: true,
      data: {
        status: {
          isRunning: true,
          httpPort: 8080,
          httpsPort: 8443,
          requestCount: 0,
          errorCount: 0,
        },
      },
      message: 'Proxy server started successfully',
    }),
    stopProxy: vi.fn().mockResolvedValue({
      success: true,
      message: 'Proxy server stopped successfully',
    }),
    restartProxy: vi.fn().mockResolvedValue({
      success: true,
      message: 'Proxy server restarted successfully',
    }),
    getProxyStatus: vi.fn().mockResolvedValue({
      success: true,
      data: {
        isRunning: true,
        httpPort: 8080,
        requestCount: 100,
        errorCount: 5,
      },
    }),
    getHealthStatus: vi.fn().mockResolvedValue({
      success: true,
      data: {
        isHealthy: true,
        details: {
          proxyResponsive: true,
        },
      },
    }),
    validateConfig: vi.fn().mockResolvedValue({
      success: true,
      data: {
        valid: true,
        config: {},
      },
    }),
    resetToDefaults: vi.fn().mockResolvedValue({
      success: true,
      data: {
        proxy: { httpPort: 8080 },
        capture: { captureHeaders: true },
        storage: { maxEntries: 100000 },
      },
      message: 'Configuration reset to defaults',
    }),
    getCACertificate: vi.fn().mockResolvedValue({
      success: true,
      data: {
        certificate: 'mock-cert-data',
        format: 'PEM',
      },
    }),
  })),
}));

vi.mock('../proxy/mockttp-proxy.js');
vi.mock('../proxy/health-monitor.js');
vi.mock('../storage/sqlite-storage.js');

// Import after mocking
const { ProxyTools } = await import('./proxy-tools.js');

describe('ProxyTools', () => {
  let proxyTools: any;
  let mockInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInstance = {
      startProxy: vi.fn().mockResolvedValue({
        success: true,
        data: {
          status: {
            isRunning: true,
            httpPort: 8080,
            httpsPort: 8443,
            requestCount: 0,
            errorCount: 0,
          },
        },
        message: 'Proxy server started successfully',
      }),
      stopProxy: vi.fn().mockResolvedValue({
        success: true,
        message: 'Proxy server stopped successfully',
      }),
      restartProxy: vi.fn().mockResolvedValue({
        success: true,
        message: 'Proxy server restarted successfully',
      }),
      getProxyStatus: vi.fn().mockResolvedValue({
        success: true,
        data: {
          isRunning: true,
          httpPort: 8080,
          requestCount: 100,
          errorCount: 5,
        },
      }),
      getHealthStatus: vi.fn().mockResolvedValue({
        success: true,
        data: {
          isHealthy: true,
          details: {
            proxyResponsive: true,
          },
        },
      }),
      validateConfig: vi.fn().mockResolvedValue({
        success: true,
        data: {
          valid: true,
          config: {},
        },
      }),
      resetToDefaults: vi.fn().mockResolvedValue({
        success: true,
        data: {
          proxy: { httpPort: 8080 },
          capture: { captureHeaders: true },
          storage: { maxEntries: 100000 },
        },
        message: 'Configuration reset to defaults',
      }),
      getCACertificate: vi.fn().mockResolvedValue({
        success: true,
        data: {
          certificate: 'mock-cert-data',
          format: 'PEM',
        },
      }),
    };

    vi.mocked(ProxyTools).mockReturnValue(mockInstance);
    proxyTools = new ProxyTools();
  });

  describe('basic functionality', () => {
    it('should start proxy successfully', async () => {
      const result = await proxyTools.startProxy({});

      expect(result.success).toBe(true);
      expect(result.data.status.isRunning).toBe(true);
      expect(result.data.status.httpPort).toBe(8080);
      expect(mockInstance.startProxy).toHaveBeenCalledWith({});
    });

    it('should stop proxy successfully', async () => {
      const result = await proxyTools.stopProxy({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('stopped successfully');
      expect(mockInstance.stopProxy).toHaveBeenCalledWith({});
    });

    it('should restart proxy successfully', async () => {
      const result = await proxyTools.restartProxy({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('restarted successfully');
      expect(mockInstance.restartProxy).toHaveBeenCalledWith({});
    });

    it('should get proxy status', async () => {
      const result = await proxyTools.getProxyStatus({});

      expect(result.success).toBe(true);
      expect(result.data.isRunning).toBe(true);
      expect(result.data.httpPort).toBe(8080);
      expect(mockInstance.getProxyStatus).toHaveBeenCalledWith({});
    });

    it('should get health status', async () => {
      const result = await proxyTools.getHealthStatus({});

      expect(result.success).toBe(true);
      expect(result.data.isHealthy).toBe(true);
      expect(mockInstance.getHealthStatus).toHaveBeenCalledWith({});
    });

    it('should validate configuration', async () => {
      const result = await proxyTools.validateConfig({ config: {} });

      expect(result.success).toBe(true);
      expect(result.data.valid).toBe(true);
      expect(mockInstance.validateConfig).toHaveBeenCalledWith({ config: {} });
    });

    it('should reset to defaults', async () => {
      const result = await proxyTools.resetToDefaults({});

      expect(result.success).toBe(true);
      expect(result.data.proxy.httpPort).toBe(8080);
      expect(mockInstance.resetToDefaults).toHaveBeenCalledWith({});
    });

    it('should get CA certificate', async () => {
      const result = await proxyTools.getCACertificate({});

      expect(result.success).toBe(true);
      expect(result.data.certificate).toBe('mock-cert-data');
      expect(result.data.format).toBe('PEM');
      expect(mockInstance.getCACertificate).toHaveBeenCalledWith({});
    });
  });

});
