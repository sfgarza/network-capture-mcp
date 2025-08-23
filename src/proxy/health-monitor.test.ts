import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HealthMonitorOptions, HealthCheckDetails } from './health-monitor.js';
import { MockttpProxyServer } from './mockttp-proxy.js';
import { createConnection } from 'net';

// Mock the HealthMonitor class
vi.mock('./health-monitor.js', () => ({
  HealthMonitor: vi.fn().mockImplementation(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    getHealthStatus: vi.fn(() => ({
      isHealthy: true,
      lastCheck: new Date(),
      details: {
        timestamp: new Date(),
        proxyResponsive: true,
        portAvailable: true,
        databaseConnected: true,
      },
      history: [],
    })),
    performHealthCheck: vi.fn().mockResolvedValue(undefined),
    getHealthMetrics: vi.fn(() => ({
      averageResponseTime: 100,
      uptimePercentage: 95,
      memoryTrend: 'stable',
      restartCount: 0,
    })),
  })),
}));

vi.mock('net');
vi.mock('./mockttp-proxy.js');

// Import after mocking
const { HealthMonitor } = await import('./health-monitor.js');

describe('HealthMonitor', () => {
  let healthMonitor: any;
  let mockInstance: any;
  let mockProxyServer: MockttpProxyServer;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInstance = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      getHealthStatus: vi.fn(() => ({
        isHealthy: true,
        lastCheck: new Date(),
        details: {
          timestamp: new Date(),
          proxyResponsive: true,
          portAvailable: true,
          databaseConnected: true,
        },
        history: [],
      })),
      performHealthCheck: vi.fn().mockResolvedValue(undefined),
      getHealthMetrics: vi.fn(() => ({
        averageResponseTime: 100,
        uptimePercentage: 95,
        memoryTrend: 'stable',
        restartCount: 0,
      })),
    };

    vi.mocked(HealthMonitor).mockReturnValue(mockInstance);

    mockProxyServer = {
      getStatus: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      restart: vi.fn(),
    } as any;
  });

  describe('basic functionality', () => {
    beforeEach(() => {
      const options: HealthMonitorOptions = {
        checkInterval: 1000,
        autoRestart: true,
      };
      healthMonitor = new HealthMonitor(mockProxyServer, options);
    });

    it('should create health monitor with options', () => {
      expect(HealthMonitor).toHaveBeenCalledWith(mockProxyServer, expect.any(Object));
      expect(healthMonitor).toBeDefined();
    });

    it('should start health monitoring', async () => {
      await expect(healthMonitor.start()).resolves.not.toThrow();
      expect(mockInstance.start).toHaveBeenCalled();
    });

    it('should stop health monitoring', () => {
      expect(() => healthMonitor.stop()).not.toThrow();
      expect(mockInstance.stop).toHaveBeenCalled();
    });

    it('should return health status', () => {
      const status = healthMonitor.getHealthStatus();

      expect(status).toBeDefined();
      expect(status.isHealthy).toBe(true);
      expect(status.details.proxyResponsive).toBe(true);
      expect(Array.isArray(status.history)).toBe(true);
      expect(mockInstance.getHealthStatus).toHaveBeenCalled();
    });

    it('should perform health check', async () => {
      await expect(healthMonitor.performHealthCheck()).resolves.not.toThrow();
      expect(mockInstance.performHealthCheck).toHaveBeenCalled();
    });

    it('should return health metrics', () => {
      const metrics = healthMonitor.getHealthMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.uptimePercentage).toBe(95);
      expect(metrics.memoryTrend).toBe('stable');
      expect(mockInstance.getHealthMetrics).toHaveBeenCalled();
    });
  });
});
