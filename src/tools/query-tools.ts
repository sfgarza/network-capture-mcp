import { z } from 'zod';
import { TrafficStorage, TrafficFilters, SearchQuery, WebSocketMessage, HttpTrafficEntry, WebSocketTrafficEntry } from '../types/traffic.js';
import { SharedConfig } from '../config/shared-config.js';

// Extended interface for storage methods
interface ExtendedTrafficStorage extends TrafficStorage {
  getWebSocketMessages(connectionId: string): Promise<WebSocketMessage[]>;
}

// Zod schemas for input validation
const QueryTrafficSchema = z.object({
  filters: z.object({
    method: z.string().optional(),
    host: z.string().optional(),
    path: z.string().optional(),
    statusCode: z.number().int().min(100).max(599).optional(),
    protocol: z.enum(['http', 'https', 'ws', 'wss']).optional(),
    connectionStatus: z.enum(['active', 'closed']).optional(),
    minResponseTime: z.number().min(0).optional(),
    maxResponseTime: z.number().min(0).optional(),
    timeRange: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }).optional(),
  }).optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['timestamp', 'url', 'method', 'status', 'responseTime']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  includeBody: z.boolean().default(false),
});

const GetRequestDetailsSchema = z.object({
  requestId: z.string().min(1),
});

const SearchTrafficSchema = z.object({
  query: z.string().min(1),
  searchIn: z.array(z.enum(['url', 'headers', 'body', 'response'])).default(['url', 'body']),
  caseSensitive: z.boolean().default(false),
  regex: z.boolean().default(false),
  limit: z.number().int().min(1).max(1000).default(100),
});

const GetWebSocketMessagesSchema = z.object({
  connectionId: z.string().min(1),
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  includeData: z.boolean().default(true),
});

export type QueryTrafficInput = z.infer<typeof QueryTrafficSchema>;
export type GetRequestDetailsInput = z.infer<typeof GetRequestDetailsSchema>;
export type SearchTrafficInput = z.infer<typeof SearchTrafficSchema>;
export type GetWebSocketMessagesInput = z.infer<typeof GetWebSocketMessagesSchema>;

export class QueryTools {
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
   * Query HTTP and WebSocket traffic with filters
   */
  async queryTraffic(input: QueryTrafficInput) {
    try {
      const validated = QueryTrafficSchema.parse(input);
      const storage = await this.getStorage();

      const filters: TrafficFilters = {
        ...validated.filters,
        limit: validated.limit,
        offset: validated.offset,
        sortBy: validated.sortBy,
        sortOrder: validated.sortOrder,
      };

      // Query traffic based on protocol filter
      let httpTraffic: HttpTrafficEntry[] = [];
      let wsTraffic: WebSocketTrafficEntry[] = [];

      const protocol = validated.filters?.protocol;

      if (!protocol || protocol === 'http' || protocol === 'https') {
        // Query HTTP traffic if no protocol filter or HTTP/HTTPS specified
        httpTraffic = await storage.queryHttpTraffic(filters);
      }

      if (!protocol || protocol === 'ws' || protocol === 'wss') {
        // Query WebSocket traffic if no protocol filter or WS/WSS specified
        wsTraffic = await storage.queryWebSocketTraffic(filters);
      }

      // Combine and sort results
      const allTraffic = [...httpTraffic, ...wsTraffic];

      // Sort by timestamp if mixing types
      if (httpTraffic.length > 0 && wsTraffic.length > 0) {
        allTraffic.sort((a, b) => {
          const timeA = a.timestamp.getTime();
          const timeB = b.timestamp.getTime();
          return validated.sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        });
      }

      // Apply pagination after combining
      const startIndex = validated.offset;
      const endIndex = startIndex + validated.limit;
      const paginatedResults = allTraffic.slice(startIndex, endIndex);

      // Format results for response
      const formattedResults = paginatedResults.map(entry => {
        const baseEntry = {
          id: entry.id,
          timestamp: entry.timestamp,
          url: entry.url,
          host: entry.host,
          protocol: entry.protocol,
        };

        if ('method' in entry) {
          // HTTP entry
          return {
            ...baseEntry,
            type: 'http',
            method: entry.method,
            path: entry.path,
            statusCode: entry.response?.statusCode,
            responseTime: entry.response?.responseTime,
            requestSize: entry.requestSize,
            responseSize: entry.response?.responseSize,
            contentType: entry.contentType,
            userAgent: entry.userAgent,
            headers: validated.includeBody ? entry.headers : undefined,
            body: validated.includeBody ? entry.body : undefined,
            response: validated.includeBody ? entry.response : {
              statusCode: entry.response?.statusCode,
              statusMessage: entry.response?.statusMessage,
              responseTime: entry.response?.responseTime,
            },
          };
        } else {
          // WebSocket entry
          return {
            ...baseEntry,
            type: 'websocket',
            established: entry.connection.established,
            closed: entry.connection.closed,
            closeCode: entry.connection.closeCode,
            closeReason: entry.connection.closeReason,
            messageCount: entry.messages.length,
            isActive: !entry.connection.closed,
            headers: validated.includeBody ? entry.headers : undefined,
            messages: validated.includeBody ? entry.messages : undefined,
          };
        }
      });

      return {
        success: true,
        message: `Found ${formattedResults.length} traffic entries`,
        data: {
          entries: formattedResults,
          pagination: {
            limit: validated.limit,
            offset: validated.offset,
            total: formattedResults.length,
            hasMore: (validated.offset + validated.limit) < allTraffic.length,
          },
          summary: {
            httpCount: httpTraffic.length,
            webSocketCount: wsTraffic.length,
            totalCount: allTraffic.length,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to query traffic: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Get detailed information about a specific request
   */
  async getRequestDetails(input: GetRequestDetailsInput) {
    try {
      const validated = GetRequestDetailsSchema.parse(input);
      const storage = await this.getStorage();

      const entry = await storage.getTrafficById(validated.requestId);

      if (!entry) {
        return {
          success: false,
          message: `Request with ID ${validated.requestId} not found`,
          data: null,
        };
      }

      // Format detailed response
      const detailedEntry = {
        id: entry.id,
        timestamp: entry.timestamp,
        url: entry.url,
        host: entry.host,
        protocol: entry.protocol,
        metadata: entry.metadata,
      };

      if ('method' in entry) {
        // HTTP entry
        return {
          success: true,
          message: 'HTTP request details retrieved',
          data: {
            ...detailedEntry,
            type: 'http',
            method: entry.method,
            path: entry.path,
            queryString: entry.queryString,
            headers: entry.headers,
            rawHeaders: entry.rawHeaders,
            body: entry.body,
            requestSize: entry.requestSize,
            contentType: entry.contentType,
            userAgent: entry.userAgent,
            response: entry.response,
          },
        };
      } else {
        // WebSocket entry
        return {
          success: true,
          message: 'WebSocket connection details retrieved',
          data: {
            ...detailedEntry,
            type: 'websocket',
            headers: entry.headers,
            rawHeaders: entry.rawHeaders,
            response: entry.response,
            connection: entry.connection,
            messages: entry.messages,
            messageCount: entry.messages.length,
            isActive: !entry.connection.closed,
          },
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Failed to get request details: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Search traffic by content
   */
  async searchTraffic(input: SearchTrafficInput) {
    try {
      const validated = SearchTrafficSchema.parse(input);
      const storage = await this.getStorage();

      const searchQuery: SearchQuery = {
        query: validated.query,
        searchIn: validated.searchIn,
        caseSensitive: validated.caseSensitive,
        regex: validated.regex,
      };

      const results = await storage.searchTraffic(searchQuery);

      // Limit results
      const limitedResults = results.slice(0, validated.limit);

      // Format results
      const formattedResults = limitedResults.map(entry => {
        const baseEntry = {
          id: entry.id,
          timestamp: entry.timestamp,
          url: entry.url,
          host: entry.host,
          protocol: entry.protocol,
        };

        if ('method' in entry) {
          return {
            ...baseEntry,
            type: 'http',
            method: entry.method,
            path: entry.path,
            statusCode: entry.response?.statusCode,
            responseTime: entry.response?.responseTime,
          };
        } else {
          return {
            ...baseEntry,
            type: 'websocket',
            messageCount: entry.messages.length,
            isActive: !entry.connection.closed,
          };
        }
      });

      return {
        success: true,
        message: `Found ${formattedResults.length} matching entries`,
        data: {
          query: validated.query,
          searchIn: validated.searchIn,
          results: formattedResults,
          totalFound: results.length,
          limitApplied: validated.limit,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to search traffic: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Get WebSocket messages for a specific connection with actual message content
   */
  async getWebSocketMessages(input: GetWebSocketMessagesInput) {
    try {
      const validated = GetWebSocketMessagesSchema.parse(input);
      const storage = await this.getStorage();

      // First verify the connection exists
      const connection = await storage.getTrafficById(validated.connectionId);
      if (!connection || !('messages' in connection)) {
        return {
          success: false,
          message: `WebSocket connection with ID ${validated.connectionId} not found`,
          data: null,
        };
      }

      // Get messages with actual data
      const messages = await (storage as ExtendedTrafficStorage).getWebSocketMessages(validated.connectionId);

      // Apply pagination
      const startIndex = validated.offset;
      const endIndex = startIndex + validated.limit;
      const paginatedMessages = messages.slice(startIndex, endIndex);

      // Format messages for response
      const formattedMessages = paginatedMessages.map((message: WebSocketMessage) => {
        const baseMessage = {
          id: message.id,
          timestamp: message.timestamp,
          direction: message.direction,
          type: message.type,
          size: message.size,
        };

        if (validated.includeData) {
          // Convert Buffer to string if it's text data, otherwise to base64
          let dataContent: string;
          if (message.type === 'text' && message.data) {
            try {
              dataContent = message.data.toString('utf8');
            } catch {
              dataContent = message.data.toString('base64');
            }
          } else if (message.data && message.data.length > 0) {
            dataContent = message.data.toString('base64');
          } else {
            dataContent = '';
          }

          return {
            ...baseMessage,
            data: dataContent,
            dataEncoding: message.type === 'text' ? 'utf8' : 'base64',
          };
        }

        return baseMessage;
      });

      return {
        success: true,
        message: `Retrieved ${formattedMessages.length} WebSocket messages`,
        data: {
          connectionId: validated.connectionId,
          totalMessages: messages.length,
          offset: validated.offset,
          limit: validated.limit,
          messages: formattedMessages,
          connection: {
            url: connection.url,
            host: connection.host,
            protocol: connection.protocol,
            established: connection.connection.established,
            closed: connection.connection.closed,
            isActive: !connection.connection.closed,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get WebSocket messages: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
  }

  /**
   * Get traffic statistics
   */
  async getTrafficStats(timeRange?: { start: string; end: string }) {
    try {
      const storage = await this.getStorage();

      const range = timeRange ? {
        start: new Date(timeRange.start),
        end: new Date(timeRange.end),
      } : undefined;

      const stats = await storage.getTrafficStats(range);

      return {
        success: true,
        message: 'Traffic statistics retrieved',
        data: {
          summary: {
            totalRequests: stats.totalRequests,
            totalWebSocketConnections: stats.totalWebSocketConnections,
            totalWebSocketMessages: stats.totalWebSocketMessages,
            timeRange: {
              earliest: stats.timeRange.earliest,
              latest: stats.timeRange.latest,
              duration: stats.timeRange.latest.getTime() - stats.timeRange.earliest.getTime(),
            },
          },
          http: {
            methodDistribution: stats.httpStats.methodCounts,
            statusDistribution: stats.httpStats.statusCounts,
            topHosts: stats.httpStats.hostCounts,
            averageResponseTime: Math.round(stats.httpStats.averageResponseTime),
            errorRate: Math.round(stats.httpStats.errorRate * 100) / 100,
          },
          websocket: {
            activeConnections: stats.webSocketStats.activeConnections,
            totalMessages: stats.webSocketStats.totalMessages,
            averageMessagesPerConnection: Math.round(stats.webSocketStats.averageMessagesPerConnection * 100) / 100,
            protocolDistribution: stats.webSocketStats.protocolCounts,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to get traffic statistics: ${error instanceof Error ? error.message : String(error)}`,
        data: null,
      };
    }
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
