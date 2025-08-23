import { z } from 'zod';
import { TrafficStorage, TrafficStats, TrafficFilters } from '../types/traffic.js';
import { SharedConfig } from '../config/shared-config.js';
import { statSync } from 'fs';

// Zod schemas for input validation
const ClearAllLogsSchema = z.object({
  confirm: z.boolean(),
  preserveSchema: z.boolean().default(true),
});

const ClearLogsByTimerangeSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  confirm: z.boolean().default(false),
});

const ClearLogsByFilterSchema = z.object({
  filters: z.object({
    host: z.string().optional(),
    method: z.string().optional(),
    statusCode: z.number().int().optional(),
    protocol: z.enum(['http', 'https', 'ws', 'wss']).optional(),
  }),
  confirm: z.boolean().default(false),
});

const CleanupOldLogsSchema = z.object({
  retentionDays: z.number().int().min(1),
  dryRun: z.boolean().default(false),
});

export type ClearAllLogsInput = z.infer<typeof ClearAllLogsSchema>;
export type ClearLogsByTimerangeInput = z.infer<typeof ClearLogsByTimerangeSchema>;
export type ClearLogsByFilterInput = z.infer<typeof ClearLogsByFilterSchema>;
export type CleanupOldLogsInput = z.infer<typeof CleanupOldLogsSchema>;

export class LogManagementTools {
  private storage?: TrafficStorage;

  constructor() {}

  private async getStorage(): Promise<TrafficStorage> {
    if (!this.storage) {
      // Import storage dynamically to avoid circular dependencies
      const { SQLiteTrafficStorage } = await import('../storage/sqlite-storage.js');
      const sharedConfig = SharedConfig.getInstance();
      this.storage = new SQLiteTrafficStorage({
        dbPath: sharedConfig.defaultDbPath,
        enableFTS: true,
      });
    }
    return this.storage!;
  }

  /**
   * Clear all captured traffic data
   */
  async clearAllLogs(input: ClearAllLogsInput) {
    try {
      const validated = ClearAllLogsSchema.parse(input);

      if (!validated.confirm) {
        return {
          success: false,
          message: 'Confirmation required. Set confirm: true to proceed with clearing all logs.',
          data: {
            requiresConfirmation: true,
            action: 'clear_all_logs',
          },
        };
      }

      const storage = await this.getStorage();

      // Get current stats before clearing
      const statsBefore = await storage.getTrafficStats();

      // Clear all data
      const deletedCount = await this.clearAllData(storage, validated.preserveSchema);

      return {
        success: true,
        message: 'All traffic logs cleared successfully',
        data: {
          deletedEntries: deletedCount,
          previousStats: {
            totalRequests: statsBefore.totalRequests,
            totalWebSocketConnections: statsBefore.totalWebSocketConnections,
            totalWebSocketMessages: statsBefore.totalWebSocketMessages,
          },
          preservedSchema: validated.preserveSchema,
          clearedAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear all logs: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Clear logs within a specific time period
   */
  async clearLogsByTimerange(input: ClearLogsByTimerangeInput) {
    try {
      const validated = ClearLogsByTimerangeSchema.parse(input);

      const startDate = new Date(validated.startDate);
      const endDate = new Date(validated.endDate);

      if (startDate >= endDate) {
        return {
          success: false,
          message: 'Start date must be before end date',
          data: null,
        };
      }

      const storage = await this.getStorage();

      // Preview what will be deleted if not confirmed
      if (!validated.confirm) {
        const previewStats = await this.getTimerangeStats(storage, startDate, endDate);

        return {
          success: false,
          message: 'Confirmation required. Set confirm: true to proceed with clearing logs in this time range.',
          data: {
            requiresConfirmation: true,
            action: 'clear_logs_by_timerange',
            timeRange: {
              start: startDate,
              end: endDate,
              duration: endDate.getTime() - startDate.getTime(),
            },
            preview: previewStats,
          },
        };
      }

      // Delete logs in time range
      const deletedCount = await this.deleteLogsByTimerange(storage, startDate, endDate);

      return {
        success: true,
        message: `Cleared ${deletedCount} log entries from time range`,
        data: {
          deletedEntries: deletedCount,
          timeRange: {
            start: startDate,
            end: endDate,
            duration: endDate.getTime() - startDate.getTime(),
          },
          clearedAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear logs by time range: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Clear logs matching specific criteria
   */
  async clearLogsByFilter(input: ClearLogsByFilterInput) {
    try {
      const validated = ClearLogsByFilterSchema.parse(input);

      const storage = await this.getStorage();

      // Preview what will be deleted if not confirmed
      if (!validated.confirm) {
        const previewStats = await this.getFilterStats(storage, validated.filters);

        return {
          success: false,
          message: 'Confirmation required. Set confirm: true to proceed with clearing logs matching these filters.',
          data: {
            requiresConfirmation: true,
            action: 'clear_logs_by_filter',
            filters: validated.filters,
            preview: previewStats,
          },
        };
      }

      // Delete logs matching filters
      const deletedCount = await this.deleteLogsByFilter(storage, validated.filters);

      return {
        success: true,
        message: `Cleared ${deletedCount} log entries matching filters`,
        data: {
          deletedEntries: deletedCount,
          filters: validated.filters,
          clearedAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to clear logs by filter: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Get database size and storage statistics
   */
  async getStorageInfo() {
    try {
      const storage = await this.getStorage();
      const stats = await storage.getTrafficStats();

      // Get database file size
      let databaseSize = 0;
      const storageLocation = './traffic.db';

      try {
        const dbStats = statSync(storageLocation);
        databaseSize = dbStats.size;
      } catch (_error) {
        // Database file might not exist yet
      }

      return {
        success: true,
        message: 'Storage information retrieved',
        data: {
          databaseSize: this.formatBytes(databaseSize),
          databaseSizeBytes: databaseSize,
          totalEntries: stats.totalRequests + stats.totalWebSocketConnections,
          httpRequests: stats.totalRequests,
          webSocketConnections: stats.totalWebSocketConnections,
          webSocketMessages: stats.totalWebSocketMessages,
          oldestEntry: stats.timeRange.earliest,
          newestEntry: stats.timeRange.latest,
          storageLocation,
          retentionPeriod: stats.timeRange.latest.getTime() - stats.timeRange.earliest.getTime(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get storage info: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Remove logs older than specified retention period
   */
  async cleanupOldLogs(input: CleanupOldLogsInput) {
    try {
      const validated = CleanupOldLogsSchema.parse(input);

      const storage = await this.getStorage();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - validated.retentionDays);

      if (validated.dryRun) {
        // Preview what would be deleted
        const previewStats = await this.getTimerangeStats(storage, new Date(0), cutoffDate);

        return {
          success: true,
          message: `Dry run: Would delete logs older than ${validated.retentionDays} days`,
          data: {
            dryRun: true,
            cutoffDate,
            retentionDays: validated.retentionDays,
            preview: previewStats,
          },
        };
      }

      // Actually delete old logs
      const deletedCount = await storage.deleteTrafficBefore(cutoffDate);

      return {
        success: true,
        message: `Cleaned up ${deletedCount} old log entries`,
        data: {
          deletedEntries: deletedCount,
          cutoffDate,
          retentionDays: validated.retentionDays,
          cleanedAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to cleanup old logs: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Optimize database storage and reclaim space
   */
  async vacuumDatabase() {
    try {
      const storage = await this.getStorage();

      // Get size before vacuum
      const sizeBefore = this.getDatabaseSize();

      // Perform vacuum operation
      await this.performVacuum(storage);

      // Get size after vacuum
      const sizeAfter = this.getDatabaseSize();
      const spaceReclaimed = sizeBefore - sizeAfter;

      return {
        success: true,
        message: `Database optimized. Reclaimed ${this.formatBytes(spaceReclaimed)} of space.`,
        data: {
          sizeBefore: this.formatBytes(sizeBefore),
          sizeAfter: this.formatBytes(sizeAfter),
          spaceReclaimed: this.formatBytes(spaceReclaimed),
          optimizedAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to vacuum database: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  // Helper methods
  private async clearAllData(storage: TrafficStorage, _preserveSchema: boolean): Promise<number> {
    // This would need to be implemented in the storage layer
    // For now, we'll delete everything before current date
    return await storage.deleteTrafficBefore(new Date());
  }

  private async deleteLogsByTimerange(storage: TrafficStorage, startDate: Date, endDate: Date): Promise<number> {
    // This would need custom implementation in storage layer
    // For now, we'll delete everything before endDate if startDate is very old
    if (startDate.getTime() < new Date('2000-01-01').getTime()) {
      return await storage.deleteTrafficBefore(endDate);
    }

    // For specific ranges, we'd need a more sophisticated delete method
    throw new Error('Time range deletion not yet implemented for specific ranges');
  }

  private async deleteLogsByFilter(_storage: TrafficStorage, _filters: TrafficFilters): Promise<number> {
    // This would need custom implementation in storage layer
    throw new Error('Filter-based deletion not yet implemented');
  }

  private async getTimerangeStats(storage: TrafficStorage, startDate: Date, endDate: Date): Promise<TrafficStats> {
    return await storage.getTrafficStats({ start: startDate, end: endDate });
  }

  private async getFilterStats(_storage: TrafficStorage, filters: TrafficFilters): Promise<{ estimatedEntries: number; filters: TrafficFilters }> {
    // This would query matching entries without deleting
    return { estimatedEntries: 0, filters };
  }

  private async performVacuum(storage: TrafficStorage): Promise<void> {
    await storage.vacuum();
  }

  private getDatabaseSize(): number {
    try {
      const stats = statSync('./traffic.db');
      return stats.size;
    } catch (_error) {
      return 0;
    }
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.storage) {
      await this.storage.close();
    }
  }
}
