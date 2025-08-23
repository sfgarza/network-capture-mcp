import { ProxyConfig } from '../types/traffic.js';
import { CommandLineArgs } from './argument-parser.js';
import { existsSync } from 'fs';
import { createServer } from 'net';
import { NodeServerError } from '../types/external.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
}

export class ConfigBuilder {
  private static readonly DEFAULT_CONFIG: ProxyConfig = {
    proxy: {
      httpPort: 8080,
      httpsPort: undefined,
      enableWebSockets: true,
      enableHTTPS: true,
      certPath: './certs/ca-cert.pem',
      keyPath: './certs/ca-key.pem',
      ignoreHostHttpsErrors: false,
    },
    capture: {
      captureHeaders: true,
      captureBody: true,
      maxBodySize: 1048576, // 1MB
      captureWebSocketMessages: true,
    },
    storage: {
      dbPath: './traffic.db',
      maxEntries: 100000,
      retentionDays: 7,
      enableFTS: true,
    },
  };

  static buildFromArgs(args: CommandLineArgs): ProxyConfig {
    const config: ProxyConfig = JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));

    // Apply command line arguments
    if (args.port !== undefined) {
      config.proxy.httpPort = args.port;
    }

    if (args.httpsPort !== undefined) {
      config.proxy.httpsPort = args.httpsPort;
      // Only enable HTTPS if not explicitly disabled
      if (args.enableHttps !== false) {
        config.proxy.enableHTTPS = true;
      }
    }

    if (args.enableWebsockets !== undefined) {
      config.proxy.enableWebSockets = args.enableWebsockets;
    }

    if (args.enableHttps !== undefined) {
      config.proxy.enableHTTPS = args.enableHttps;
    }

    if (args.certPath !== undefined) {
      config.proxy.certPath = args.certPath;
    }

    if (args.keyPath !== undefined) {
      config.proxy.keyPath = args.keyPath;
    }

    if (args.insecure !== undefined) {
      config.proxy.ignoreHostHttpsErrors = args.insecure;
    }

    // Storage configuration
    if (args.dbPath !== undefined) {
      config.storage.dbPath = args.dbPath;
    }

    if (args.enableFts !== undefined) {
      config.storage.enableFTS = args.enableFts;
    }

    // Capture configuration
    if (args.captureHeaders !== undefined) {
      config.capture.captureHeaders = args.captureHeaders;
    }

    if (args.captureBody !== undefined) {
      config.capture.captureBody = args.captureBody;
    }

    if (args.maxBodySize !== undefined) {
      config.capture.maxBodySize = args.maxBodySize;
    }

    if (args.captureWebsocketMessages !== undefined) {
      config.capture.captureWebSocketMessages = args.captureWebsocketMessages;
    }

    return config;
  }

  static validateConfiguration(config: ProxyConfig): ValidationResult {
    const warnings: string[] = [];

    try {
      // Validate proxy configuration
      const proxyValidation = this.validateProxyConfig(config.proxy);
      if (!proxyValidation.valid) {
        return proxyValidation;
      }
      if (proxyValidation.warnings) {
        warnings.push(...proxyValidation.warnings);
      }

      // Validate storage configuration
      const storageValidation = this.validateStorageConfig(config.storage);
      if (!storageValidation.valid) {
        return storageValidation;
      }
      if (storageValidation.warnings) {
        warnings.push(...storageValidation.warnings);
      }

      // Validate capture configuration
      const captureValidation = this.validateCaptureConfig(config.capture);
      if (!captureValidation.valid) {
        return captureValidation;
      }
      if (captureValidation.warnings) {
        warnings.push(...captureValidation.warnings);
      }

      return {
        valid: true,
        warnings: warnings.length > 0 ? warnings : undefined,
      };

    } catch (error) {
      return {
        valid: false,
        error: `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private static validateProxyConfig(proxy: ProxyConfig['proxy']): ValidationResult {
    const warnings: string[] = [];

    // Validate HTTP port
    if (proxy.httpPort < 1 || proxy.httpPort > 65535) {
      return {
        valid: false,
        error: `HTTP port must be between 1 and 65535, got: ${proxy.httpPort}`,
      };
    }

    // Validate HTTPS port if specified
    if (proxy.httpsPort !== undefined) {
      if (proxy.httpsPort < 1 || proxy.httpsPort > 65535) {
        return {
          valid: false,
          error: `HTTPS port must be between 1 and 65535, got: ${proxy.httpsPort}`,
        };
      }

      if (proxy.httpsPort === proxy.httpPort) {
        return {
          valid: false,
          error: `HTTPS port cannot be the same as HTTP port: ${proxy.httpPort}`,
        };
      }
    }

    // Validate HTTPS configuration
    if (proxy.enableHTTPS) {
      if (!proxy.httpsPort) {
        warnings.push('HTTPS enabled but no HTTPS port specified, using default 8443');
      }

      // Only validate certificate files if they are provided
      if (proxy.certPath && proxy.keyPath) {
        // If both paths are provided, check if they exist
        if (!existsSync(proxy.certPath)) {
          warnings.push(`SSL certificate file not found: ${proxy.certPath}. Will generate CA certificate instead.`);
        }

        if (!existsSync(proxy.keyPath)) {
          warnings.push(`SSL private key file not found: ${proxy.keyPath}. Will generate CA certificate instead.`);
        }
      } else {
        // No certificate paths provided - will auto-generate
        warnings.push('HTTPS enabled but no certificate/key paths specified. A CA certificate will be automatically generated for HTTPS interception.');
      }
    }

    // Check for common port conflicts
    const commonPorts = [80, 443, 3000, 8000, 8080, 9000];
    if (commonPorts.includes(proxy.httpPort)) {
      warnings.push(`HTTP port ${proxy.httpPort} is commonly used by other services. Ensure it's available.`);
    }

    if (proxy.httpsPort && commonPorts.includes(proxy.httpsPort)) {
      warnings.push(`HTTPS port ${proxy.httpsPort} is commonly used by other services. Ensure it's available.`);
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private static validateStorageConfig(storage: ProxyConfig['storage']): ValidationResult {
    const warnings: string[] = [];

    // Validate database path
    if (!storage.dbPath || storage.dbPath.trim() === '') {
      return {
        valid: false,
        error: 'Database path cannot be empty',
      };
    }

    // Check if database directory is writable
    const dbDir = storage.dbPath.includes('/') ?
      storage.dbPath.substring(0, storage.dbPath.lastIndexOf('/')) : '.';

    try {
      // This is a basic check - in a real implementation, you'd want to test actual write permissions
      if (!existsSync(dbDir)) {
        warnings.push(`Database directory does not exist: ${dbDir}. It will be created.`);
      }
    } catch (_error) {
      warnings.push(`Cannot access database directory: ${dbDir}`);
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private static validateCaptureConfig(capture: ProxyConfig['capture']): ValidationResult {
    const warnings: string[] = [];

    // Validate max body size
    if (capture.maxBodySize < 0) {
      return {
        valid: false,
        error: `Max body size cannot be negative, got: ${capture.maxBodySize}`,
      };
    }

    const maxBodySizeMB = capture.maxBodySize / (1024 * 1024);
    if (maxBodySizeMB > 100) {
      warnings.push(`Max body size is very large (${maxBodySizeMB.toFixed(1)}MB). This may impact performance and storage.`);
    }

    // Check for potential performance issues
    if (capture.captureBody && capture.captureWebSocketMessages && maxBodySizeMB > 10) {
      warnings.push('Capturing both HTTP bodies and WebSocket messages with large body size may impact performance.');
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  static async validatePortAvailability(port: number): Promise<ValidationResult> {
    return new Promise((resolve) => {
      const server = createServer();

      server.listen(port, () => {
        server.close(() => {
          resolve({ valid: true });
        });
      });

      server.on('error', (err: NodeServerError) => {
        if (err.code === 'EADDRINUSE') {
          resolve({
            valid: false,
            error: `Port ${port} is already in use`,
          });
        } else {
          resolve({
            valid: false,
            error: `Cannot bind to port ${port}: ${err.message}`,
          });
        }
      });
    });
  }

  static getDefaultConfig(): ProxyConfig {
    return JSON.parse(JSON.stringify(this.DEFAULT_CONFIG));
  }
}
