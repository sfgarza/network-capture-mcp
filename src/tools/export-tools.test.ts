import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportOptions, HARFormat } from './export-tools.js';
import { TrafficStorage, HttpTrafficEntry, WebSocketTrafficEntry } from '../types/traffic.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

// Mock the ExportTools class
vi.mock('./export-tools.js', () => ({
  ExportTools: vi.fn().mockImplementation(() => ({
    exportTrafficLogs: vi.fn().mockResolvedValue({
      success: true,
      data: {
        filePath: './exports/traffic-export.json',
        format: 'json',
        entriesExported: 2,
        fileSize: 1024,
      },
      message: 'Traffic logs exported successfully',
    }),
  })),
}));

vi.mock('fs');

// Import after mocking
const { ExportTools } = await import('./export-tools.js');

describe('ExportTools', () => {
  let exportTools: any;
  let mockInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockInstance = {
      exportTrafficLogs: vi.fn().mockResolvedValue({
        success: true,
        data: {
          filePath: './exports/traffic-export.json',
          format: 'json',
          entriesExported: 2,
          fileSize: 1024,
        },
        message: 'Traffic logs exported successfully',
      }),
    };

    vi.mocked(ExportTools).mockReturnValue(mockInstance);
    exportTools = new ExportTools();

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(mkdirSync).mockImplementation(() => '');
    vi.mocked(writeFileSync).mockImplementation(() => {});
  });

  describe('basic functionality', () => {
    it('should export traffic logs in JSON format', async () => {
      const result = await exportTools.exportTrafficLogs({
        format: 'json',
        outputPath: './exports',
        includeBody: true,
        includeHeaders: true,
        maxEntries: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data.format).toBe('json');
      expect(result.data.entriesExported).toBe(2);
      expect(result.data.filePath).toContain('.json');
      expect(mockInstance.exportTrafficLogs).toHaveBeenCalledWith({
        format: 'json',
        outputPath: './exports',
        includeBody: true,
        includeHeaders: true,
        maxEntries: 1000,
      });
    });

    it('should export traffic logs in CSV format', async () => {
      // Update mock to return CSV format
      mockInstance.exportTrafficLogs.mockResolvedValueOnce({
        success: true,
        data: {
          filePath: './exports/traffic-export.csv',
          format: 'csv',
          entriesExported: 2,
          fileSize: 512,
        },
        message: 'Traffic logs exported successfully',
      });

      const result = await exportTools.exportTrafficLogs({
        format: 'csv',
        outputPath: './exports',
        includeBody: false,
        includeHeaders: true,
        maxEntries: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data.format).toBe('csv');
      expect(result.data.filePath).toContain('.csv');
      expect(mockInstance.exportTrafficLogs).toHaveBeenCalledWith({
        format: 'csv',
        outputPath: './exports',
        includeBody: false,
        includeHeaders: true,
        maxEntries: 1000,
      });
    });

    it('should export traffic logs in HAR format', async () => {
      // Update mock to return HAR format
      mockInstance.exportTrafficLogs.mockResolvedValueOnce({
        success: true,
        data: {
          filePath: './exports/traffic-export.har',
          format: 'har',
          entriesExported: 1,
          fileSize: 2048,
        },
        message: 'Traffic logs exported successfully',
      });

      const result = await exportTools.exportTrafficLogs({
        format: 'har',
        outputPath: './exports',
        includeBody: true,
        includeHeaders: true,
        maxEntries: 1000,
      });

      expect(result.success).toBe(true);
      expect(result.data.format).toBe('har');
      expect(result.data.filePath).toContain('.har');
      expect(mockInstance.exportTrafficLogs).toHaveBeenCalledWith({
        format: 'har',
        outputPath: './exports',
        includeBody: true,
        includeHeaders: true,
        maxEntries: 1000,
      });
    });
  });
});
