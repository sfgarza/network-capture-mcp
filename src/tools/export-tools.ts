import { TrafficStorage, TrafficFilters, HttpTrafficEntry, WebSocketTrafficEntry } from '../types/traffic.js';
import { SQLiteTrafficStorage } from '../storage/sqlite-storage.js';
import { SharedConfig } from '../config/shared-config.js';
import { writeFileSync } from 'fs';
import { join } from 'path';

export interface ExportOptions {
  format: 'json' | 'csv' | 'har';
  filters?: TrafficFilters;
  includeBody?: boolean;
  includeHeaders?: boolean;
  maxEntries?: number;
  outputPath?: string;
}

export interface HAREntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    headers: Array<{ name: string; value: string }>;
    queryString: Array<{ name: string; value: string }>;
    postData?: {
      mimeType: string;
      text: string;
    };
    headersSize: number;
    bodySize: number;
  };
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    headers: Array<{ name: string; value: string }>;
    content: {
      size: number;
      mimeType: string;
      text?: string;
    };
    headersSize: number;
    bodySize: number;
  };
  cache: {};
  timings: {
    send: number;
    wait: number;
    receive: number;
  };
}

export interface HARFormat {
  log: {
    version: '1.2';
    creator: {
      name: string;
      version: string;
    };
    entries: HAREntry[];
  };
}

export class ExportTools {
  private storage?: TrafficStorage;

  private async getStorage(): Promise<TrafficStorage> {
    if (!this.storage) {
      const sharedConfig = SharedConfig.getInstance();
      this.storage = new SQLiteTrafficStorage({
        dbPath: sharedConfig.defaultDbPath,
        enableFTS: true,
      });
    }
    return this.storage;
  }

  /**
   * Export traffic logs in various formats
   */
  async exportTrafficLogs(options: ExportOptions) {
    try {
      const storage = await this.getStorage();

      // Apply default options
      const exportOptions: Required<ExportOptions> = {
        format: options.format,
        filters: options.filters || {},
        includeBody: options.includeBody ?? false,
        includeHeaders: options.includeHeaders ?? true,
        maxEntries: options.maxEntries || 10000,
        outputPath: options.outputPath || './exports',
      };

      // Query traffic data
      const httpTraffic = await storage.queryHttpTraffic({
        ...exportOptions.filters,
        limit: exportOptions.maxEntries,
      });

      const wsTraffic = await storage.queryWebSocketTraffic({
        ...exportOptions.filters,
        limit: exportOptions.maxEntries,
      });

      let exportData: string;
      let filename: string;
      let mimeType: string;

      switch (exportOptions.format) {
      case 'json':
        exportData = this.exportToJSON(httpTraffic, wsTraffic, exportOptions);
        filename = `traffic-export-${Date.now()}.json`;
        mimeType = 'application/json';
        break;

      case 'csv':
        exportData = this.exportToCSV(httpTraffic, wsTraffic, exportOptions);
        filename = `traffic-export-${Date.now()}.csv`;
        mimeType = 'text/csv';
        break;

      case 'har':
        exportData = this.exportToHAR(httpTraffic, exportOptions);
        filename = `traffic-export-${Date.now()}.har`;
        mimeType = 'application/json';
        break;

      default:
        throw new Error(`Unsupported export format: ${exportOptions.format}`);
      }

      // Write to file if outputPath is provided
      const fullPath = join(exportOptions.outputPath, filename);
      writeFileSync(fullPath, exportData);

      return {
        success: true,
        message: `Traffic logs exported successfully to ${filename}`,
        data: {
          filename,
          path: fullPath,
          format: exportOptions.format,
          mimeType,
          entriesExported: {
            http: httpTraffic.length,
            websocket: wsTraffic.length,
            total: httpTraffic.length + wsTraffic.length,
          },
          fileSize: Buffer.byteLength(exportData, 'utf8'),
          exportedAt: new Date(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to export traffic logs: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  private exportToJSON(httpTraffic: HttpTrafficEntry[], wsTraffic: WebSocketTrafficEntry[], options: Required<ExportOptions>): string {
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        format: 'json',
        version: '1.0',
        filters: options.filters,
        options: {
          includeBody: options.includeBody,
          includeHeaders: options.includeHeaders,
          maxEntries: options.maxEntries,
        },
      },
      traffic: {
        http: httpTraffic.map(entry => this.sanitizeHttpEntry(entry, options)),
        websocket: wsTraffic.map(entry => this.sanitizeWebSocketEntry(entry, options)),
      },
      summary: {
        totalHttpRequests: httpTraffic.length,
        totalWebSocketConnections: wsTraffic.length,
        totalWebSocketMessages: wsTraffic.reduce((sum, conn) => sum + conn.messages.length, 0),
      },
    };

    return JSON.stringify(exportData, null, 2);
  }

  private exportToCSV(httpTraffic: HttpTrafficEntry[], wsTraffic: WebSocketTrafficEntry[], _options: Required<ExportOptions>): string {
    const csvLines: string[] = [];

    // HTTP traffic CSV
    if (httpTraffic.length > 0) {
      csvLines.push('# HTTP Traffic');
      csvLines.push('timestamp,method,url,host,status_code,response_time,content_type,user_agent');

      for (const entry of httpTraffic) {
        const line = [
          entry.timestamp.toISOString(),
          entry.method,
          `"${entry.url.replace(/"/g, '""')}"`,
          entry.host,
          entry.response?.statusCode || '',
          entry.response?.responseTime || '',
          entry.contentType || '',
          entry.userAgent || '',
        ].join(',');
        csvLines.push(line);
      }
      csvLines.push('');
    }

    // WebSocket traffic CSV
    if (wsTraffic.length > 0) {
      csvLines.push('# WebSocket Traffic');
      csvLines.push('timestamp,url,host,protocol,established,closed,message_count');

      for (const entry of wsTraffic) {
        const line = [
          entry.timestamp.toISOString(),
          `"${entry.url.replace(/"/g, '""')}"`,
          entry.host,
          entry.protocol,
          entry.connection.established?.toISOString() || '',
          entry.connection.closed?.toISOString() || '',
          entry.messages.length,
        ].join(',');
        csvLines.push(line);
      }
    }

    return csvLines.join('\n');
  }

  private exportToHAR(httpTraffic: HttpTrafficEntry[], options: Required<ExportOptions>): string {
    const harEntries: HAREntry[] = httpTraffic.map(entry => this.convertToHAREntry(entry, options));

    const harData: HARFormat = {
      log: {
        version: '1.2',
        creator: {
          name: 'MCP Proxy Traffic Server',
          version: '1.0.0',
        },
        entries: harEntries,
      },
    };

    return JSON.stringify(harData, null, 2);
  }

  private convertToHAREntry(entry: HttpTrafficEntry, options: Required<ExportOptions>): HAREntry {
    const queryString = entry.queryString ?
      new URLSearchParams(entry.queryString).entries() : [];

    return {
      startedDateTime: entry.timestamp.toISOString(),
      time: entry.response?.responseTime || 0,
      request: {
        method: entry.method,
        url: entry.url,
        httpVersion: 'HTTP/1.1',
        headers: options.includeHeaders ?
          Object.entries(entry.headers).map(([name, value]) => ({
            name,
            value: Array.isArray(value) ? value.join(', ') : value,
          })) : [],
        queryString: Array.from(queryString).map(([name, value]) => ({ name, value })),
        postData: options.includeBody && entry.body ? {
          mimeType: entry.contentType || 'application/octet-stream',
          text: entry.body.toString(),
        } : undefined,
        headersSize: -1,
        bodySize: entry.requestSize,
      },
      response: {
        status: entry.response?.statusCode || 0,
        statusText: entry.response?.statusMessage || '',
        httpVersion: 'HTTP/1.1',
        headers: options.includeHeaders && entry.response ?
          Object.entries(entry.response.headers).map(([name, value]) => ({
            name,
            value: Array.isArray(value) ? value.join(', ') : value,
          })) : [],
        content: {
          size: entry.response?.responseSize || 0,
          mimeType: entry.response?.headers['content-type'] as string || 'application/octet-stream',
          text: options.includeBody && entry.response?.body ? entry.response.body.toString() : undefined,
        },
        headersSize: -1,
        bodySize: entry.response?.responseSize || 0,
      },
      cache: {},
      timings: {
        send: 0,
        wait: entry.response?.responseTime || 0,
        receive: 0,
      },
    };
  }

  private sanitizeHttpEntry(entry: HttpTrafficEntry, options: Required<ExportOptions>) {
    return {
      id: entry.id,
      timestamp: entry.timestamp,
      method: entry.method,
      url: entry.url,
      host: entry.host,
      path: entry.path,
      protocol: entry.protocol,
      headers: options.includeHeaders ? entry.headers : undefined,
      body: options.includeBody ? entry.body : undefined,
      requestSize: entry.requestSize,
      contentType: entry.contentType,
      userAgent: entry.userAgent,
      response: entry.response ? {
        statusCode: entry.response.statusCode,
        statusMessage: entry.response.statusMessage,
        headers: options.includeHeaders ? entry.response.headers : undefined,
        body: options.includeBody ? entry.response.body : undefined,
        responseSize: entry.response.responseSize,
        responseTime: entry.response.responseTime,
      } : undefined,
      metadata: entry.metadata,
    };
  }

  private sanitizeWebSocketEntry(entry: WebSocketTrafficEntry, options: Required<ExportOptions>) {
    return {
      id: entry.id,
      timestamp: entry.timestamp,
      url: entry.url,
      host: entry.host,
      protocol: entry.protocol,
      headers: options.includeHeaders ? entry.headers : undefined,
      connection: entry.connection,
      messages: entry.messages.map(msg => ({
        id: msg.id,
        timestamp: msg.timestamp,
        direction: msg.direction,
        type: msg.type,
        data: options.includeBody ? msg.data : undefined,
        size: msg.size,
      })),
      metadata: entry.metadata,
    };
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
