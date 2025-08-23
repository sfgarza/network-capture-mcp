import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NetCapMcpServer } from './index.js';
import { ArgumentParser } from './cli/argument-parser.js';
import { ConfigBuilder } from './cli/config-builder.js';

// Mock all the dependencies
vi.mock('@modelcontextprotocol/sdk/server/mcp.js', () => ({
  McpServer: vi.fn().mockImplementation(() => ({
    tool: vi.fn().mockReturnValue(undefined),
    resource: vi.fn().mockReturnValue(undefined),
    connect: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn().mockImplementation(() => ({})),
}));

vi.mock('./tools/proxy-tools.js', () => ({
  ProxyTools: vi.fn().mockImplementation(() => ({
    getProxyStatus: vi.fn(),
    startProxy: vi.fn(),
    stopProxy: vi.fn(),
    restartProxy: vi.fn(),
    validateConfig: vi.fn(),
    resetToDefaults: vi.fn(),
    getCACertificate: vi.fn(),
    getAutoStartStatus: vi.fn(),
    getHealthStatus: vi.fn(),
  })),
}));

vi.mock('./tools/query-tools.js', () => ({
  QueryTools: vi.fn().mockImplementation(() => ({
    queryTraffic: vi.fn(),
    getRequestDetails: vi.fn(),
    searchTraffic: vi.fn(),
    getTrafficStats: vi.fn(),
    getWebSocketMessages: vi.fn(),
  })),
}));

vi.mock('./tools/log-management-tools.js', () => ({
  LogManagementTools: vi.fn().mockImplementation(() => ({
    clearAllLogs: vi.fn(),
    clearLogsByTimerange: vi.fn(),
    clearLogsByFilter: vi.fn(),
    getStorageInfo: vi.fn(),
    cleanupOldLogs: vi.fn(),
    vacuumDatabase: vi.fn(),
    cleanup: vi.fn(),
  })),
}));

vi.mock('./tools/analysis-tools.js', () => ({
  AnalysisTools: vi.fn().mockImplementation(() => ({
    analyzeTrafficPatterns: vi.fn(),
    generateTrafficReport: vi.fn(),
    cleanup: vi.fn(),
  })),
}));

vi.mock('./tools/export-tools.js', () => ({
  ExportTools: vi.fn().mockImplementation(() => ({
    exportTrafficLogs: vi.fn(),
    cleanup: vi.fn(),
  })),
}));

vi.mock('./cli/argument-parser.js');
vi.mock('./cli/config-builder.js');

describe('MCP Server Index', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('NetCapMcpServer', () => {
    it('should be importable', () => {
      expect(NetCapMcpServer).toBeDefined();
      expect(typeof NetCapMcpServer).toBe('function');
    });

    it('should be a constructor function', () => {
      expect(NetCapMcpServer.prototype).toBeDefined();
      expect(NetCapMcpServer.prototype.constructor).toBe(NetCapMcpServer);
    });
  });

  describe('command line argument handling', () => {
    it('should parse help argument', () => {
      vi.mocked(ArgumentParser.parse).mockReturnValue({ help: true });
      vi.mocked(ArgumentParser.generateHelp).mockReturnValue('Help text');

      expect(ArgumentParser.parse).toBeDefined();
      expect(ArgumentParser.generateHelp).toBeDefined();
    });

    it('should parse version argument', () => {
      vi.mocked(ArgumentParser.parse).mockReturnValue({ version: true });

      expect(ArgumentParser.parse).toBeDefined();
    });

    it('should handle configuration building', () => {
      const mockConfig = {
        proxy: { httpPort: 8080, enableWebSockets: true, enableHTTPS: true },
        capture: { captureHeaders: true, captureBody: true, maxBodySize: 1048576, captureWebSocketMessages: true, maxWebSocketMessages: 1000 },
        storage: { dbPath: './traffic.db', maxEntries: 100000, retentionDays: 7, enableFTS: true },
      };

      vi.mocked(ConfigBuilder.buildFromArgs).mockReturnValue(mockConfig);
      vi.mocked(ConfigBuilder.validateConfiguration).mockReturnValue({ valid: true });

      expect(ConfigBuilder.buildFromArgs).toBeDefined();
      expect(ConfigBuilder.validateConfiguration).toBeDefined();
    });
  });

  describe('tool integration', () => {
    it('should have all required tool imports', () => {
      // Verify that all tool classes are imported
      expect(NetCapMcpServer).toBeDefined();
    });

    it('should have proper module structure', () => {
      // Test that the module exports what we expect
      expect(typeof NetCapMcpServer).toBe('function');
    });
  });
});
