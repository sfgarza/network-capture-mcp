import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfigBuilder, ValidationResult } from './config-builder.js';
import { CommandLineArgs } from './argument-parser.js';
import { ProxyConfig } from '../types/traffic.js';
import { existsSync } from 'fs';

vi.mock('fs');

describe('ConfigBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('buildFromArgs', () => {
    it('should build config with default values when no args provided', () => {
      const args: CommandLineArgs = {};
      const config = ConfigBuilder.buildFromArgs(args);

      expect(config.proxy.httpPort).toBe(8080);
      expect(config.proxy.enableWebSockets).toBe(true);
      expect(config.proxy.enableHTTPS).toBe(true);
      expect(config.capture.captureHeaders).toBe(true);
      expect(config.capture.captureBody).toBe(true);
      expect(config.storage.dbPath).toBe('./traffic.db');
      expect(config.storage.maxEntries).toBe(100000);
      expect(config.storage.retentionDays).toBe(7);
    });

    it('should override port settings from args', () => {
      const args: CommandLineArgs = {
        port: 9090,
        httpsPort: 8443,
      };
      const config = ConfigBuilder.buildFromArgs(args);

      expect(config.proxy.httpPort).toBe(9090);
      expect(config.proxy.httpsPort).toBe(8443);
      expect(config.proxy.enableHTTPS).toBe(true); // Should be enabled when httpsPort is set
    });

    it('should override boolean settings from args', () => {
      const args: CommandLineArgs = {
        enableWebsockets: false,
        enableHttps: false,
        captureHeaders: false,
        captureBody: false,
      };
      const config = ConfigBuilder.buildFromArgs(args);

      expect(config.proxy.enableWebSockets).toBe(false);
      expect(config.proxy.enableHTTPS).toBe(false);
      expect(config.capture.captureHeaders).toBe(false);
      expect(config.capture.captureBody).toBe(false);
    });

    it('should override storage settings from args', () => {
      const args: CommandLineArgs = {
        dbPath: './custom.db',
        enableFts: false,
      };
      const config = ConfigBuilder.buildFromArgs(args);

      expect(config.storage.dbPath).toBe('./custom.db');
      expect(config.storage.enableFTS).toBe(false);
    });

    it('should override capture settings from args', () => {
      const args: CommandLineArgs = {
        maxBodySize: 2097152, // 2MB
        captureWebsocketMessages: false,
      };
      const config = ConfigBuilder.buildFromArgs(args);

      expect(config.capture.maxBodySize).toBe(2097152);
      expect(config.capture.captureWebSocketMessages).toBe(false);
    });

    it('should override certificate paths from args', () => {
      const args: CommandLineArgs = {
        certPath: './custom-cert.pem',
        keyPath: './custom-key.pem',
      };
      const config = ConfigBuilder.buildFromArgs(args);

      expect(config.proxy.certPath).toBe('./custom-cert.pem');
      expect(config.proxy.keyPath).toBe('./custom-key.pem');
    });

    it('should set ignoreHostHttpsErrors when insecure flag is provided', () => {
      const args: CommandLineArgs = {
        insecure: true,
      };
      const config = ConfigBuilder.buildFromArgs(args);

      expect(config.proxy.ignoreHostHttpsErrors).toBe(true);
    });

    it('should default ignoreHostHttpsErrors to false when insecure flag is not provided', () => {
      const args: CommandLineArgs = {};
      const config = ConfigBuilder.buildFromArgs(args);

      expect(config.proxy.ignoreHostHttpsErrors).toBe(false);
    });
  });

  describe('validateConfiguration', () => {
    it('should validate a valid config', () => {
      vi.mocked(existsSync).mockReturnValue(true);

      const config: ProxyConfig = ConfigBuilder.getDefaultConfig();
      const result = ConfigBuilder.validateConfiguration(config);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail validation for invalid port range', () => {
      const config: ProxyConfig = {
        ...ConfigBuilder.getDefaultConfig(),
        proxy: {
          ...ConfigBuilder.getDefaultConfig().proxy,
          httpPort: 70000, // Invalid port
        },
      };

      const result = ConfigBuilder.validateConfiguration(config);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('HTTP port must be between 1 and 65535');
    });

    it('should fail validation for missing certificate files when HTTPS enabled', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const config: ProxyConfig = {
        ...ConfigBuilder.getDefaultConfig(),
        proxy: {
          ...ConfigBuilder.getDefaultConfig().proxy,
          enableHTTPS: true,
          certPath: './missing-cert.pem',
          keyPath: './missing-key.pem',
        },
      };

      const result = ConfigBuilder.validateConfiguration(config);

      expect(result.valid).toBe(true); // Should be valid but with warnings
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('certificate file not found'))).toBe(true);
    });

    it('should validate storage settings', () => {
      const config: ProxyConfig = {
        ...ConfigBuilder.getDefaultConfig(),
        storage: {
          ...ConfigBuilder.getDefaultConfig().storage,
          dbPath: '', // Invalid empty path
        },
      };

      const result = ConfigBuilder.validateConfiguration(config);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Database path cannot be empty');
    });

    it('should validate capture settings', () => {
      const config: ProxyConfig = {
        ...ConfigBuilder.getDefaultConfig(),
        capture: {
          ...ConfigBuilder.getDefaultConfig().capture,
          maxBodySize: -1, // Invalid
        },
      };

      const result = ConfigBuilder.validateConfiguration(config);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Max body size cannot be negative');
    });

    it('should provide warnings for potential issues', () => {
      vi.mocked(existsSync).mockReturnValue(true);

      const config: ProxyConfig = {
        ...ConfigBuilder.getDefaultConfig(),
        capture: {
          ...ConfigBuilder.getDefaultConfig().capture,
          maxBodySize: 200 * 1024 * 1024, // 200MB - large
        },
      };

      const result = ConfigBuilder.validateConfiguration(config);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.some(w => w.includes('very large'))).toBe(true);
    });
  });

  describe('getDefaultConfig', () => {
    it('should return a deep copy of default config', () => {
      const config1 = ConfigBuilder.getDefaultConfig();
      const config2 = ConfigBuilder.getDefaultConfig();

      // Should be equal but not the same reference
      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2);
      expect(config1.proxy).not.toBe(config2.proxy);
      expect(config1.storage).not.toBe(config2.storage);
    });

    it('should have expected default values', () => {
      const config = ConfigBuilder.getDefaultConfig();

      expect(config.proxy.httpPort).toBe(8080);
      expect(config.proxy.enableWebSockets).toBe(true);
      expect(config.proxy.enableHTTPS).toBe(true);
      expect(config.proxy.ignoreHostHttpsErrors).toBe(false);
      expect(config.capture.captureHeaders).toBe(true);
      expect(config.capture.maxBodySize).toBe(1048576); // 1MB
      expect(config.storage.enableFTS).toBe(true);
    });
  });
});
