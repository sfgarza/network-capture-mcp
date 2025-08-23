import { MockttpProxyServer } from './mockttp-proxy.js';
import { createConnection } from 'net';
import { NodeServerError } from '../types/external.js';

export interface HealthMonitorOptions {
  checkInterval: number; // milliseconds
  autoRestart: boolean;
  maxRestartAttempts?: number;
  restartDelay?: number; // milliseconds
  onHealthChange?: (isHealthy: boolean, details: HealthCheckDetails) => void;
}

export interface HealthCheckDetails {
  timestamp: Date;
  proxyResponsive: boolean;
  portAvailable: boolean;
  databaseConnected: boolean;
  memoryUsage: number; // bytes
  uptime: number; // milliseconds
  lastError?: string;
  restartAttempts: number;
}

export interface HealthStatus {
  isHealthy: boolean;
  lastCheck: Date;
  details: HealthCheckDetails;
  history: HealthCheckDetails[];
}

export class HealthMonitor {
  private proxyServer: MockttpProxyServer;
  private options: HealthMonitorOptions;
  private checkInterval?: NodeJS.Timeout;
  private isRunning = false;
  private lastHealthStatus: HealthStatus;
  private restartAttempts = 0;
  private maxHistorySize = 50;

  constructor(proxyServer: MockttpProxyServer, options: HealthMonitorOptions) {
    this.proxyServer = proxyServer;
    this.options = {
      maxRestartAttempts: 3,
      restartDelay: 5000,
      ...options,
    };

    this.lastHealthStatus = {
      isHealthy: false,
      lastCheck: new Date(),
      details: this.createInitialHealthDetails(),
      history: [],
    };
  }

  private createInitialHealthDetails(): HealthCheckDetails {
    return {
      timestamp: new Date(),
      proxyResponsive: false,
      portAvailable: false,
      databaseConnected: false,
      memoryUsage: process.memoryUsage().heapUsed,
      uptime: 0,
      restartAttempts: 0,
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.restartAttempts = 0;

    // Perform initial health check
    await this.performHealthCheck();

    // Start periodic health checks
    this.checkInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.options.checkInterval);

    console.error(`Health monitor started with ${this.options.checkInterval}ms interval`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    console.error('Health monitor stopped');
  }

  async getHealthStatus(): Promise<HealthStatus> {
    return { ...this.lastHealthStatus };
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const details = await this.checkProxyHealth();
      const isHealthy = this.evaluateHealth(details);

      // Update health status
      const previousHealth = this.lastHealthStatus.isHealthy;
      this.lastHealthStatus = {
        isHealthy,
        lastCheck: new Date(),
        details,
        history: this.updateHistory(details),
      };

      // Notify of health changes
      if (previousHealth !== isHealthy && this.options.onHealthChange) {
        this.options.onHealthChange(isHealthy, details);
      }

      // Handle unhealthy state
      if (!isHealthy && this.options.autoRestart) {
        await this.handleUnhealthyState(details);
      } else if (isHealthy) {
        // Reset restart attempts on successful health check
        this.restartAttempts = 0;
      }

    } catch (error) {
      console.error('Health check failed:', error);

      const errorDetails: HealthCheckDetails = {
        ...this.createInitialHealthDetails(),
        timestamp: new Date(),
        lastError: error instanceof Error ? error.message : String(error),
        restartAttempts: this.restartAttempts,
      };

      this.lastHealthStatus = {
        isHealthy: false,
        lastCheck: new Date(),
        details: errorDetails,
        history: this.updateHistory(errorDetails),
      };
    }
  }

  private async checkProxyHealth(): Promise<HealthCheckDetails> {
    const status = this.proxyServer.getStatus();
    const memoryUsage = process.memoryUsage().heapUsed;
    const uptime = status.startTime ? Date.now() - status.startTime.getTime() : 0;

    // Check if proxy is responsive
    const proxyResponsive = await this.checkProxyResponsiveness(status.httpPort);

    // Check if port is available (should be occupied by our proxy)
    const portAvailable = status.isRunning && status.httpPort ? await this.checkPortOccupied(status.httpPort) : false;

    // Check database connectivity
    const databaseConnected = await this.checkDatabaseConnectivity();

    return {
      timestamp: new Date(),
      proxyResponsive,
      portAvailable,
      databaseConnected,
      memoryUsage,
      uptime,
      restartAttempts: this.restartAttempts,
    };
  }

  private async checkProxyResponsiveness(port?: number): Promise<boolean> {
    if (!port) return false;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, 5000); // 5 second timeout

      try {
        const connection = createConnection(port, 'localhost');

        connection.on('connect', () => {
          clearTimeout(timeout);
          connection.destroy();
          resolve(true);
        });

        connection.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });

      } catch (_error) {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  private async checkPortOccupied(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const connection = createConnection(port, 'localhost');

      connection.on('connect', () => {
        connection.destroy();
        resolve(true); // Port is occupied (good - our proxy is running)
      });

      connection.on('error', (err: NodeServerError) => {
        if (err.code === 'ECONNREFUSED') {
          resolve(false); // Port is not occupied (bad - proxy not running)
        } else {
          resolve(false); // Other error
        }
      });
    });
  }

  private async checkDatabaseConnectivity(): Promise<boolean> {
    try {
      // This would need to be implemented based on the actual storage interface
      // For now, we'll assume it's connected if the proxy is running
      const status = this.proxyServer.getStatus();
      return status.isRunning;
    } catch (_error) {
      return false;
    }
  }

  private evaluateHealth(details: HealthCheckDetails): boolean {
    // Proxy must be responsive and port must be occupied
    if (!details.proxyResponsive || !details.portAvailable) {
      return false;
    }

    // Database must be connected
    if (!details.databaseConnected) {
      return false;
    }

    // Check memory usage (warn if over 500MB)
    const memoryMB = details.memoryUsage / (1024 * 1024);
    if (memoryMB > 500) {
      console.warn(`High memory usage: ${memoryMB.toFixed(1)}MB`);
      // Don't fail health check for high memory, just warn
    }

    return true;
  }

  private async handleUnhealthyState(_details: HealthCheckDetails): Promise<void> {
    if (this.restartAttempts >= (this.options.maxRestartAttempts || 3)) {
      console.error(`Max restart attempts (${this.options.maxRestartAttempts}) reached. Stopping auto-restart.`);
      return;
    }

    this.restartAttempts++;
    console.error(`Proxy unhealthy, attempting restart ${this.restartAttempts}/${this.options.maxRestartAttempts}`);

    try {
      // Wait before restart
      if (this.options.restartDelay) {
        await new Promise(resolve => setTimeout(resolve, this.options.restartDelay));
      }

      // Stop the proxy
      await this.proxyServer.stop();

      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Restart with the same configuration
      await this.proxyServer.start();

      console.error(`Proxy restarted successfully (attempt ${this.restartAttempts})`);

    } catch (error) {
      console.error(`Failed to restart proxy (attempt ${this.restartAttempts}):`, error);
    }
  }

  private updateHistory(details: HealthCheckDetails): HealthCheckDetails[] {
    const history = [...this.lastHealthStatus.history, details];

    // Keep only the last N entries
    if (history.length > this.maxHistorySize) {
      history.splice(0, history.length - this.maxHistorySize);
    }

    return history;
  }

  getHealthMetrics(): {
    averageResponseTime: number;
    uptimePercentage: number;
    memoryTrend: 'increasing' | 'decreasing' | 'stable';
    restartCount: number;
    } {
    const history = this.lastHealthStatus.history;

    if (history.length === 0) {
      return {
        averageResponseTime: 0,
        uptimePercentage: 0,
        memoryTrend: 'stable',
        restartCount: this.restartAttempts,
      };
    }

    // Calculate uptime percentage
    const healthyChecks = history.filter(h =>
      h.proxyResponsive && h.portAvailable && h.databaseConnected,
    ).length;
    const uptimePercentage = (healthyChecks / history.length) * 100;

    // Calculate memory trend
    let memoryTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (history.length >= 3) {
      const recent = history.slice(-3);
      const first = recent[0].memoryUsage;
      const last = recent[recent.length - 1].memoryUsage;
      const diff = last - first;
      const threshold = 10 * 1024 * 1024; // 10MB threshold

      if (diff > threshold) {
        memoryTrend = 'increasing';
      } else if (diff < -threshold) {
        memoryTrend = 'decreasing';
      }
    }

    return {
      averageResponseTime: 0, // Would need to implement response time tracking
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      memoryTrend,
      restartCount: this.restartAttempts,
    };
  }
}
