import { z } from 'zod';
import { MockttpProxyServer } from '../proxy/mockttp-proxy.js';
import { ProxyConfig } from '../types/traffic.js';
import { HealthMonitor } from '../proxy/health-monitor.js';
import { ConfigBuilder } from '../cli/config-builder.js';
import { SharedConfig } from '../config/shared-config.js';

// Zod schemas for input validation
const StartProxySchema = z.object({
  port: z.number().int().min(1).max(65535).default(8080),
  httpsPort: z.number().int().min(1).max(65535).optional(),
  enableWebSockets: z.boolean().default(true),
  enableHTTPS: z.boolean().default(true),
  ignoreHostHttpsErrors: z.boolean().default(false),
  captureOptions: z.object({
    captureHeaders: z.boolean().default(true),
    captureBody: z.boolean().default(true),
    maxBodySize: z.number().int().min(0).default(1048576), // 1MB
    captureWebSocketMessages: z.boolean().default(true),
  }).optional(),
  storageOptions: z.object({
    dbPath: z.string().default('./traffic.db'),
    maxEntries: z.number().int().min(0).default(100000),
    retentionDays: z.number().int().min(1).default(7),
    enableFTS: z.boolean().default(true),
  }).optional(),
});

const RestartProxySchema = z.object({
  config: z.object({
    port: z.number().int().min(1).max(65535).optional(),
    httpsPort: z.number().int().min(1).max(65535).optional(),
    enableWebSockets: z.boolean().optional(),
    captureHeaders: z.boolean().optional(),
    captureBody: z.boolean().optional(),
    maxBodySize: z.number().int().min(0).optional(),
  }).optional(),
  preserveData: z.boolean().default(true),
});

const AutoStartConfigSchema = z.object({
  enabled: z.boolean(),
  config: z.object({
    port: z.number().int().min(1).max(65535).optional(),
    enableWebSockets: z.boolean().optional(),
    enableHTTPS: z.boolean().optional(),
    captureHeaders: z.boolean().optional(),
    captureBody: z.boolean().optional(),
  }).optional(),
});

export type StartProxyInput = z.infer<typeof StartProxySchema>;
export type RestartProxyInput = z.infer<typeof RestartProxySchema>;
export type AutoStartConfigInput = z.infer<typeof AutoStartConfigSchema>;

export class ProxyTools {
  private proxyServer?: MockttpProxyServer;
  private healthMonitor?: HealthMonitor;
  private autoStartEnabled: boolean = true;
  private autoStartConfig: ProxyConfig;
  private currentConfig?: ProxyConfig;

  constructor(autoStart: boolean = true, config?: ProxyConfig) {
    this.autoStartEnabled = autoStart;
    this.autoStartConfig = config || ConfigBuilder.getDefaultConfig();

    // Auto-start proxy if enabled
    if (this.autoStartEnabled) {
      this.initializeAutoStart();
    }
  }

  private async initializeAutoStart(): Promise<void> {
    console.log('🔧 initializeAutoStart called, autoStartEnabled:', this.autoStartEnabled);
    if (this.autoStartEnabled) {
      try {
        console.log('🔧 Calling startProxy...');
        const result = await this.startProxy(this.convertConfigToStartInput(this.autoStartConfig));
        console.log('🔧 startProxy result:', result.success);
        if (result.success) {
          console.error('Proxy server auto-started successfully');
        } else {
          console.error('❌ Proxy server auto-start failed:', result.message);
        }
      } catch (error) {
        console.error('Failed to auto-start proxy:', error instanceof Error ? error.message : String(error));
      }
    }
  }

  private convertConfigToStartInput(config: ProxyConfig): StartProxyInput {
    return {
      port: config.proxy.httpPort,
      httpsPort: config.proxy.httpsPort,
      enableWebSockets: config.proxy.enableWebSockets,
      enableHTTPS: config.proxy.enableHTTPS,
      ignoreHostHttpsErrors: config.proxy.ignoreHostHttpsErrors,
      captureOptions: {
        captureHeaders: config.capture.captureHeaders,
        captureBody: config.capture.captureBody,
        maxBodySize: config.capture.maxBodySize,
        captureWebSocketMessages: config.capture.captureWebSocketMessages,
      },
      storageOptions: {
        dbPath: config.storage.dbPath,
        maxEntries: config.storage.maxEntries,
        retentionDays: config.storage.retentionDays,
        enableFTS: config.storage.enableFTS,
      },
    };
  }

  /**
   * Start the mockttp proxy server
   */
  async startProxy(input: StartProxyInput) {
    try {
      const validated = StartProxySchema.parse(input);

      if (this.proxyServer?.getStatus().isRunning) {
        throw new Error('Proxy server is already running. Stop it first before starting a new one.');
      }

      const enableHTTPS = validated.enableHTTPS || !!validated.httpsPort;

      // Create proxy configuration
      const config: ProxyConfig = {
        proxy: {
          httpPort: validated.port,
          httpsPort: validated.httpsPort,
          enableWebSockets: validated.enableWebSockets,
          enableHTTPS,
          certPath: enableHTTPS ? './certs/ca-cert.pem' : undefined,
          keyPath: enableHTTPS ? './certs/ca-key.pem' : undefined,
          ignoreHostHttpsErrors: validated.ignoreHostHttpsErrors,
        },
        capture: {
          captureHeaders: validated.captureOptions?.captureHeaders ?? true,
          captureBody: validated.captureOptions?.captureBody ?? true,
          maxBodySize: validated.captureOptions?.maxBodySize ?? 1048576,
          captureWebSocketMessages: validated.captureOptions?.captureWebSocketMessages ?? true,
        },
        storage: {
          dbPath: validated.storageOptions?.dbPath ?? SharedConfig.getInstance().defaultDbPath,
          maxEntries: validated.storageOptions?.maxEntries ?? 100000,
          retentionDays: validated.storageOptions?.retentionDays ?? 7,
          enableFTS: validated.storageOptions?.enableFTS ?? true,
        },
      };

      // Validate configuration
      const validation = ConfigBuilder.validateConfiguration(config);
      if (!validation.valid) {
        throw new Error(`Configuration validation failed: ${validation.error}`);
      }

      // Check port availability
      const portValidation = await ConfigBuilder.validatePortAvailability(config.proxy.httpPort);
      if (!portValidation.valid) {
        throw new Error(portValidation.error);
      }

      if (config.proxy.httpsPort) {
        const httpsPortValidation = await ConfigBuilder.validatePortAvailability(config.proxy.httpsPort);
        if (!httpsPortValidation.valid) {
          throw new Error(httpsPortValidation.error);
        }
      }

      // Import storage here to avoid circular dependencies
      const { SQLiteTrafficStorage } = await import('../storage/sqlite-storage.js');
      const storage = new SQLiteTrafficStorage({
        dbPath: config.storage.dbPath,
        enableFTS: config.storage.enableFTS,
      });

      console.log('🔧 Creating MockttpProxyServer...');
      this.proxyServer = new MockttpProxyServer(storage, config);
      console.log('🔧 Calling proxyServer.start()...');
      await this.proxyServer.start();
      console.log('🔧 proxyServer.start() completed');

      // Start health monitoring
      this.healthMonitor = new HealthMonitor(this.proxyServer, {
        checkInterval: 30000, // 30 seconds
        autoRestart: true,
        onHealthChange: (isHealthy, details) => {
          if (!isHealthy) {
            console.error('Proxy health check failed:', details);
          }
        },
      });
      await this.healthMonitor.start();

      this.currentConfig = config;
      const status = this.proxyServer.getStatus();

      return {
        success: true,
        message: 'Proxy server started successfully',
        data: {
          httpPort: status.httpPort,
          httpsPort: status.httpsPort,
          startTime: status.startTime,
          config: {
            enableWebSockets: config.proxy.enableWebSockets,
            enableHTTPS: config.proxy.enableHTTPS,
            captureHeaders: config.capture.captureHeaders,
            captureBody: config.capture.captureBody,
            maxBodySize: config.capture.maxBodySize,
          },
          warnings: validation.warnings,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to start proxy server: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Get the generated CA certificate for HTTPS trust installation
   */
  async getCACertificate() {
    try {
      if (!this.proxyServer) {
        throw new Error('Proxy server is not initialized. Start the proxy first.');
      }

      const status = this.proxyServer.getStatus();
      if (!status.isRunning) {
        throw new Error('Proxy server is not running. Start the proxy first.');
      }

      if (!status.config.proxy.enableHTTPS) {
        throw new Error('HTTPS is not enabled on the proxy server.');
      }

      const ca = this.proxyServer.getGeneratedCA();
      if (!ca) {
        return {
          success: false,
          message: 'No CA certificate available. The proxy may be using provided certificates instead of generated ones.',
          data: null,
        };
      }

      return {
        success: true,
        message: 'CA certificate retrieved successfully',
        data: {
          certificate: ca.cert,
          privateKey: ca.key,
          instructions: {
            chrome: [
              '1. Open Chrome Settings',
              '2. Go to Privacy and Security > Security',
              '3. Click "Manage certificates"',
              '4. Go to "Authorities" tab',
              '5. Click "Import" and select the certificate file',
              '6. Check "Trust this certificate for identifying websites"',
            ],
            firefox: [
              '1. Open Firefox Settings',
              '2. Go to Privacy & Security',
              '3. Scroll to "Certificates" section',
              '4. Click "View Certificates"',
              '5. Go to "Authorities" tab',
              '6. Click "Import" and select the certificate file',
              '7. Check "Trust this CA to identify websites"',
            ],
            safari: [
              '1. Double-click the certificate file to open Keychain Access',
              '2. Find the certificate in "login" keychain',
              '3. Double-click the certificate',
              '4. Expand "Trust" section',
              '5. Set "When using this certificate" to "Always Trust"',
            ],
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get CA certificate: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Stop the proxy server
   */
  async stopProxy() {
    try {
      if (!this.proxyServer) {
        return {
          success: false,
          message: 'No proxy server instance found',
          data: null,
        };
      }

      const status = this.proxyServer.getStatus();
      if (!status.isRunning) {
        return {
          success: false,
          message: 'Proxy server is not running',
          data: null,
        };
      }

      // Stop health monitoring
      if (this.healthMonitor) {
        await this.healthMonitor.stop();
        this.healthMonitor = undefined;
      }

      await this.proxyServer.stop();

      return {
        success: true,
        message: 'Proxy server stopped successfully',
        data: {
          wasRunning: true,
          stoppedAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to stop proxy server: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Restart the proxy server with optional configuration updates
   */
  async restartProxy(input: RestartProxyInput) {
    try {
      const validated = RestartProxySchema.parse(input);

      // Get current status
      const currentStatus = this.proxyServer?.getStatus();

      // Stop current server if running
      if (currentStatus?.isRunning) {
        await this.stopProxy();

        // Wait a moment for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Merge new config with existing
      const baseConfig = this.currentConfig || this.autoStartConfig;
      const newConfig: ProxyConfig = {
        ...baseConfig,
        proxy: {
          ...baseConfig.proxy,
          httpPort: validated.config?.port ?? baseConfig.proxy.httpPort,
          httpsPort: validated.config?.httpsPort ?? baseConfig.proxy.httpsPort,
          enableWebSockets: validated.config?.enableWebSockets ?? baseConfig.proxy.enableWebSockets,
        },
        capture: {
          ...baseConfig.capture,
          captureHeaders: validated.config?.captureHeaders ?? baseConfig.capture.captureHeaders,
          captureBody: validated.config?.captureBody ?? baseConfig.capture.captureBody,
          maxBodySize: validated.config?.maxBodySize ?? baseConfig.capture.maxBodySize,
        },
      };

      // Start with new configuration
      const startInput = this.convertConfigToStartInput(newConfig);
      const result = await this.startProxy(startInput);

      if (result.success) {
        return {
          success: true,
          message: 'Proxy server restarted successfully',
          data: {
            previousConfig: currentStatus?.config,
            newConfig,
            restartTime: new Date(),
            preservedData: validated.preserveData,
            ...result.data,
          },
        };
      } else {
        return result;
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to restart proxy server: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Get current proxy server status
   */
  async getProxyStatus() {
    try {
      if (!this.proxyServer) {
        return {
          success: true,
          message: 'No proxy server instance',
          data: {
            isRunning: false,
            httpPort: null,
            httpsPort: null,
            startTime: null,
            uptime: 0,
            stats: {
              totalRequests: 0,
              totalWebSocketConnections: 0,
              activeConnections: 0,
            },
            health: {
              isHealthy: false,
              lastCheck: null,
            },
          },
        };
      }

      const status = this.proxyServer.getStatus();
      const healthStatus = this.healthMonitor ? await this.healthMonitor.getHealthStatus() : null;

      return {
        success: true,
        message: 'Proxy server status retrieved',
        data: {
          isRunning: status.isRunning,
          httpPort: status.httpPort,
          httpsPort: status.httpsPort,
          startTime: status.startTime,
          uptime: status.startTime ? Date.now() - status.startTime.getTime() : 0,
          stats: status.stats,
          config: {
            enableWebSockets: status.config.proxy.enableWebSockets,
            enableHTTPS: status.config.proxy.enableHTTPS,
            captureHeaders: status.config.capture.captureHeaders,
            captureBody: status.config.capture.captureBody,
            maxBodySize: status.config.capture.maxBodySize,
            dbPath: status.config.storage.dbPath,
          },
          health: healthStatus,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get proxy status: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Configure auto-start behavior
   */
  async configureAutoStart(input: AutoStartConfigInput) {
    try {
      const validated = AutoStartConfigSchema.parse(input);

      // Update auto-start configuration
      this.autoStartEnabled = validated.enabled;

      if (validated.config) {
        this.autoStartConfig = {
          ...this.autoStartConfig,
          proxy: {
            ...this.autoStartConfig.proxy,
            httpPort: validated.config.port ?? this.autoStartConfig.proxy.httpPort,
            enableWebSockets: validated.config.enableWebSockets ?? this.autoStartConfig.proxy.enableWebSockets,
            enableHTTPS: validated.config.enableHTTPS ?? this.autoStartConfig.proxy.enableHTTPS,
          },
          capture: {
            ...this.autoStartConfig.capture,
            captureHeaders: validated.config.captureHeaders ?? this.autoStartConfig.capture.captureHeaders,
            captureBody: validated.config.captureBody ?? this.autoStartConfig.capture.captureBody,
          },
        };
      }

      return {
        success: true,
        message: `Auto-start ${validated.enabled ? 'enabled' : 'disabled'}`,
        data: {
          autoStartEnabled: this.autoStartEnabled,
          config: this.autoStartConfig,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to configure auto-start: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Get auto-start status
   */
  async getAutoStartStatus() {
    try {
      return {
        success: true,
        message: 'Auto-start status retrieved',
        data: {
          enabled: this.autoStartEnabled,
          config: this.autoStartConfig,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get auto-start status: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    try {
      if (!this.healthMonitor) {
        return {
          success: true,
          message: 'Health monitoring not active',
          data: {
            isHealthy: false,
            lastCheck: null,
            details: 'Health monitoring is not running',
          },
        };
      }

      const healthStatus = await this.healthMonitor.getHealthStatus();

      return {
        success: true,
        message: 'Health status retrieved',
        data: healthStatus,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get health status: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Validate configuration
   */
  async validateConfig(config: Partial<ProxyConfig>) {
    try {
      // Build a complete config for validation
      const baseConfig = this.currentConfig || this.autoStartConfig;
      const fullConfig: ProxyConfig = {
        ...baseConfig,
        ...config,
      };

      const validation = ConfigBuilder.validateConfiguration(fullConfig);

      return {
        success: validation.valid,
        message: validation.valid ? 'Configuration is valid' : `Configuration validation failed: ${validation.error}`,
        data: {
          valid: validation.valid,
          error: validation.error,
          warnings: validation.warnings,
          config: fullConfig,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to validate configuration: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Reset to default configuration
   */
  async resetToDefaults() {
    try {
      const wasRunning = this.proxyServer?.getStatus().isRunning;

      // Stop current server if running
      if (wasRunning) {
        await this.stopProxy();
      }

      // Reset to defaults
      this.autoStartConfig = ConfigBuilder.getDefaultConfig();
      this.currentConfig = undefined;

      // Restart if it was running
      if (wasRunning) {
        const startInput = this.convertConfigToStartInput(this.autoStartConfig);
        await this.startProxy(startInput);
      }

      return {
        success: true,
        message: 'Configuration reset to defaults',
        data: {
          config: this.autoStartConfig,
          restarted: wasRunning,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reset configuration: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.healthMonitor) {
      await this.healthMonitor.stop();
    }

    if (this.proxyServer?.getStatus().isRunning) {
      await this.stopProxy();
    }
  }
}
