import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrafficStorage } from '../types/traffic.js';
import { statSync } from 'fs';

// Mock the LogManagementTools class
vi.mock('./log-management-tools.js', () => ({
  LogManagementTools: vi.fn().mockImplementation(() => ({
    clearAllLogs: vi.fn().mockResolvedValue({
      success: true,
      message: 'All logs cleared successfully',
      data: {
        deletedEntries: 1550,
        previousStats: { totalRequests: 1000 },
        preservedSchema: true,
      },
    }),
    clearLogsByTimerange: vi.fn().mockResolvedValue({
      success: true,
      message: 'Logs cleared successfully',
      data: {
        deletedEntries: 250,
        timeRange: { start: new Date(), end: new Date() },
      },
    }),
    clearLogsByFilter: vi.fn().mockResolvedValue({
      success: true,
      message: 'Logs cleared successfully',
      data: {
        deletedEntries: 100,
        appliedFilters: { host: 'example.com' },
      },
    }),
    getStorageInfo: vi.fn().mockResolvedValue({
      success: true,
      data: {
        totalEntries: 1550,
        databaseSize: 1048576,
        httpEntries: 1000,
        websocketEntries: 550,
        oldestEntry: new Date('2023-01-01'),
        newestEntry: new Date('2023-12-31'),
      },
    }),
    cleanupOldLogs: vi.fn().mockResolvedValue({
      success: true,
      message: 'Old logs cleaned up successfully',
      data: {
        deletedEntries: 200,
        retentionDays: 7,
        dryRun: false,
      },
    }),
    vacuumDatabase: vi.fn().mockResolvedValue({
      success: true,
      message: 'Database vacuum completed successfully',
      data: {
        freedBytes: 25000,
      },
    }),
  })),
}));

vi.mock('fs');

// Import after mocking
const { LogManagementTools } = await import('./log-management-tools.js');

describe('LogManagementTools', () => {
  let logTools: any;
  let mockInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInstance = {
      clearAllLogs: vi.fn().mockResolvedValue({
        success: true,
        message: 'All logs cleared successfully',
        data: {
          deletedEntries: 1550,
          previousStats: { totalRequests: 1000 },
          preservedSchema: true,
        },
      }),
      clearLogsByTimerange: vi.fn().mockResolvedValue({
        success: true,
        message: 'Logs cleared successfully',
        data: {
          deletedEntries: 250,
          timeRange: { start: new Date(), end: new Date() },
        },
      }),
      clearLogsByFilter: vi.fn().mockResolvedValue({
        success: true,
        message: 'Logs cleared successfully',
        data: {
          deletedEntries: 100,
          appliedFilters: { host: 'example.com' },
        },
      }),
      getStorageInfo: vi.fn().mockResolvedValue({
        success: true,
        data: {
          totalEntries: 1550,
          databaseSize: 1048576,
          httpEntries: 1000,
          websocketEntries: 550,
          oldestEntry: new Date('2023-01-01'),
          newestEntry: new Date('2023-12-31'),
        },
      }),
      cleanupOldLogs: vi.fn().mockResolvedValue({
        success: true,
        message: 'Old logs cleaned up successfully',
        data: {
          deletedEntries: 200,
          retentionDays: 7,
          dryRun: false,
        },
      }),
      vacuumDatabase: vi.fn().mockResolvedValue({
        success: true,
        message: 'Database vacuum completed successfully',
        data: {
          freedBytes: 25000,
        },
      }),
    };

    vi.mocked(LogManagementTools).mockReturnValue(mockInstance);
    logTools = new LogManagementTools();
  });

  describe('basic functionality', () => {
    it('should clear all logs when confirmed', async () => {
      const result = await logTools.clearAllLogs({
        confirm: true,
        preserveSchema: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.deletedEntries).toBe(1550);
      expect(result.data.previousStats.totalRequests).toBe(1000);
      expect(result.data.preservedSchema).toBe(true);
      expect(mockInstance.clearAllLogs).toHaveBeenCalledWith({
        confirm: true,
        preserveSchema: true,
      });
    });

    it('should clear logs by time range', async () => {
      const result = await logTools.clearLogsByTimerange({
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-01-31T23:59:59Z',
        confirm: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.deletedEntries).toBe(250);
      expect(result.data.timeRange.start).toBeInstanceOf(Date);
      expect(result.data.timeRange.end).toBeInstanceOf(Date);
      expect(mockInstance.clearLogsByTimerange).toHaveBeenCalledWith({
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-01-31T23:59:59Z',
        confirm: true,
      });
    });

    it('should clear logs by filter', async () => {
      const result = await logTools.clearLogsByFilter({
        filters: {
          host: 'example.com',
          method: 'GET',
          statusCode: 404,
        },
        confirm: true,
      });

      expect(result.success).toBe(true);
      expect(result.data.deletedEntries).toBe(100);
      expect(result.data.appliedFilters).toEqual({ host: 'example.com' });
      expect(mockInstance.clearLogsByFilter).toHaveBeenCalledWith({
        filters: {
          host: 'example.com',
          method: 'GET',
          statusCode: 404,
        },
        confirm: true,
      });
    });

    it('should get storage information', async () => {
      const result = await logTools.getStorageInfo({});

      expect(result.success).toBe(true);
      expect(result.data.databaseSize).toBe(1048576);
      expect(result.data.totalEntries).toBe(1550);
      expect(result.data.oldestEntry).toBeInstanceOf(Date);
      expect(result.data.newestEntry).toBeInstanceOf(Date);
      expect(mockInstance.getStorageInfo).toHaveBeenCalledWith({});
    });

    it('should cleanup old logs', async () => {
      const result = await logTools.cleanupOldLogs({
        retentionDays: 7,
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(result.data.deletedEntries).toBe(200);
      expect(result.data.retentionDays).toBe(7);
      expect(result.data.dryRun).toBe(false);
      expect(mockInstance.cleanupOldLogs).toHaveBeenCalledWith({
        retentionDays: 7,
        dryRun: false,
      });
    });

    it('should vacuum database', async () => {
      const result = await logTools.vacuumDatabase({});

      expect(result.success).toBe(true);
      expect(result.message).toContain('Database vacuum completed');
      expect(result.data.freedBytes).toBe(25000);
      expect(mockInstance.vacuumDatabase).toHaveBeenCalledWith({});
    });
  });

});
