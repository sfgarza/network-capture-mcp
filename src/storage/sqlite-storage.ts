import Database from 'better-sqlite3';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';
import { SharedConfig } from '../config/shared-config.js';
import {
  TrafficStorage,
  HttpTrafficEntry,
  WebSocketTrafficEntry,
  TrafficEntry,
  TrafficFilters,
  SearchQuery,
  TrafficStats,
  WebSocketMessage,
} from '../types/traffic.js';
import {
  WebSocketMessageRow,
  CountQueryResult,
  TimeRangeQueryResult,
  MethodCountResult,
  StatusCountResult,
  HostCountResult,
  ResponseStatsResult,
  ProtocolCountResult,
  WebSocketEntryQueryResult,
  HttpTrafficRow,
} from '../types/external.js';

export interface SQLiteStorageOptions {
  dbPath: string;
  enableFTS: boolean;
}

export class SQLiteTrafficStorage implements TrafficStorage {
  private db: Database.Database;
  private options: SQLiteStorageOptions;

  constructor(options: SQLiteStorageOptions) {
    this.options = options;

    // Resolve and ensure database path exists
    const dbPath = this.ensureDatabasePath(options.dbPath);

    try {
      this.db = new Database(dbPath);
      this.initializeDatabase();
    } catch (error) {
      throw new Error(`Failed to open database at ${dbPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private ensureDatabasePath(dbPath: string): string {
    // Use SharedConfig to resolve the path properly
    const sharedConfig = SharedConfig.getInstance();
    const resolvedPath = sharedConfig.resolveDbPath(dbPath);

    // Ensure the directory exists
    const dbDir = dirname(resolvedPath);
    if (!existsSync(dbDir)) {
      try {
        mkdirSync(dbDir, { recursive: true });
      } catch (error) {
        throw new Error(`Failed to create database directory ${dbDir}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return resolvedPath;
  }

  private initializeDatabase(): void {
    try {
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
    } catch (error) {
      console.warn('Failed to enable WAL mode:', error instanceof Error ? error.message : String(error));
      // Continue without WAL mode
    }

    // Create HTTP traffic table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS http_traffic (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        method TEXT NOT NULL,
        url TEXT NOT NULL,
        host TEXT NOT NULL,
        path TEXT NOT NULL,
        query_string TEXT,
        protocol TEXT NOT NULL,

        -- Request data
        request_headers TEXT,
        request_raw_headers TEXT,
        request_body TEXT,
        request_size INTEGER,
        content_type TEXT,
        user_agent TEXT,

        -- Response data
        status_code INTEGER,
        status_message TEXT,
        response_headers TEXT,
        response_raw_headers TEXT,
        response_body TEXT,
        response_size INTEGER,
        response_time INTEGER,

        -- Metadata
        client_ip TEXT,
        destination TEXT,
        error_message TEXT,

        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Create WebSocket connections table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS websocket_connections (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        url TEXT NOT NULL,
        host TEXT NOT NULL,
        protocol TEXT NOT NULL,

        -- Request headers
        headers TEXT,
        raw_headers TEXT,

        -- Response data
        response_status_code INTEGER,
        response_headers TEXT,

        -- Connection data
        established_at INTEGER,
        closed_at INTEGER,
        close_code INTEGER,
        close_reason TEXT,

        -- Metadata
        client_ip TEXT,
        destination TEXT,

        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);

    // Create WebSocket messages table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS websocket_messages (
        id TEXT PRIMARY KEY,
        connection_id TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        direction TEXT NOT NULL,
        message_type TEXT NOT NULL,
        data TEXT,
        size INTEGER,

        FOREIGN KEY (connection_id) REFERENCES websocket_connections(id)
      )
    `);

    // Create indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_http_timestamp ON http_traffic(timestamp);
      CREATE INDEX IF NOT EXISTS idx_http_host ON http_traffic(host);
      CREATE INDEX IF NOT EXISTS idx_http_method ON http_traffic(method);
      CREATE INDEX IF NOT EXISTS idx_http_status ON http_traffic(status_code);

      CREATE INDEX IF NOT EXISTS idx_ws_timestamp ON websocket_connections(timestamp);
      CREATE INDEX IF NOT EXISTS idx_ws_host ON websocket_connections(host);
      CREATE INDEX IF NOT EXISTS idx_ws_protocol ON websocket_connections(protocol);

      CREATE INDEX IF NOT EXISTS idx_ws_msg_connection ON websocket_messages(connection_id);
      CREATE INDEX IF NOT EXISTS idx_ws_msg_timestamp ON websocket_messages(timestamp);
    `);

    // Create FTS tables if enabled
    if (this.options.enableFTS) {
      this.db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS http_traffic_fts USING fts5(
          id, url, request_headers, request_body, response_body,
          content='http_traffic',
          content_rowid='rowid'
        );

        CREATE VIRTUAL TABLE IF NOT EXISTS websocket_traffic_fts USING fts5(
          id, url, headers,
          content='websocket_connections',
          content_rowid='rowid'
        );
      `);

      // Create triggers to populate FTS tables automatically
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS http_traffic_fts_insert AFTER INSERT ON http_traffic BEGIN
          INSERT INTO http_traffic_fts(rowid, id, url, request_headers, request_body, response_body)
          VALUES (new.rowid, new.id, new.url, new.request_headers, new.request_body, new.response_body);
        END;

        CREATE TRIGGER IF NOT EXISTS http_traffic_fts_delete AFTER DELETE ON http_traffic BEGIN
          INSERT INTO http_traffic_fts(http_traffic_fts, rowid, id, url, request_headers, request_body, response_body)
          VALUES ('delete', old.rowid, old.id, old.url, old.request_headers, old.request_body, old.response_body);
        END;

        CREATE TRIGGER IF NOT EXISTS http_traffic_fts_update AFTER UPDATE ON http_traffic BEGIN
          INSERT INTO http_traffic_fts(http_traffic_fts, rowid, id, url, request_headers, request_body, response_body)
          VALUES ('delete', old.rowid, old.id, old.url, old.request_headers, old.request_body, old.response_body);
          INSERT INTO http_traffic_fts(rowid, id, url, request_headers, request_body, response_body)
          VALUES (new.rowid, new.id, new.url, new.request_headers, new.request_body, new.response_body);
        END;

        CREATE TRIGGER IF NOT EXISTS websocket_traffic_fts_insert AFTER INSERT ON websocket_connections BEGIN
          INSERT INTO websocket_traffic_fts(rowid, id, url, headers)
          VALUES (new.rowid, new.id, new.url, new.headers);
        END;

        CREATE TRIGGER IF NOT EXISTS websocket_traffic_fts_delete AFTER DELETE ON websocket_connections BEGIN
          INSERT INTO websocket_traffic_fts(websocket_traffic_fts, rowid, id, url, headers)
          VALUES ('delete', old.rowid, old.id, old.url, old.headers);
        END;

        CREATE TRIGGER IF NOT EXISTS websocket_traffic_fts_update AFTER UPDATE ON websocket_connections BEGIN
          INSERT INTO websocket_traffic_fts(websocket_traffic_fts, rowid, id, url, headers)
          VALUES ('delete', old.rowid, old.id, old.url, old.headers);
          INSERT INTO websocket_traffic_fts(rowid, id, url, headers)
          VALUES (new.rowid, new.id, new.url, new.headers);
        END;
      `);

      // Rebuild FTS tables to populate with existing data
      try {
        this.db.exec(`
          INSERT INTO http_traffic_fts(http_traffic_fts) VALUES('rebuild');
          INSERT INTO websocket_traffic_fts(websocket_traffic_fts) VALUES('rebuild');
        `);
      } catch (error) {
        // Ignore errors if tables are already populated or don't exist
        console.warn('FTS rebuild warning (this is normal for new databases):', error instanceof Error ? error.message : String(error));
      }
    }
  }

  async storeHttpTraffic(entry: HttpTrafficEntry): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO http_traffic (
        id, timestamp, method, url, host, path, query_string, protocol,
        request_headers, request_raw_headers, request_body, request_size,
        content_type, user_agent,
        status_code, status_message, response_headers, response_raw_headers,
        response_body, response_size, response_time,
        client_ip, destination, error_message
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.id,
      entry.timestamp.getTime(),
      entry.method,
      entry.url,
      entry.host,
      entry.path,
      this.emptyStringToNull(entry.queryString),
      entry.protocol,
      JSON.stringify(entry.headers),
      JSON.stringify(entry.rawHeaders),
      this.convertBodyToText(entry.body),
      entry.requestSize,
      this.emptyStringToNull(entry.contentType),
      this.emptyStringToNull(entry.userAgent),
      entry.response?.statusCode,
      this.emptyStringToNull(entry.response?.statusMessage),
      entry.response ? JSON.stringify(entry.response.headers) : null,
      entry.response ? JSON.stringify(entry.response.rawHeaders) : null,
      this.convertBodyToText(entry.response?.body),
      entry.response?.responseSize,
      entry.response?.responseTime,
      entry.metadata.clientIP,
      this.emptyStringToNull(entry.metadata.destination),
      this.emptyStringToNull(entry.metadata.errorMessage),
    );
  }

  async updateHttpTrafficResponse(id: string, responseData: {
    statusCode: number;
    statusMessage: string;
    responseHeaders: Record<string, unknown>;
    responseRawHeaders: [string, string][];
    responseBody?: string | Buffer;
    responseSize: number;
    responseTime: number;
  }): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE http_traffic
      SET status_code = ?, status_message = ?, response_headers = ?,
          response_raw_headers = ?, response_body = ?, response_size = ?,
          response_time = ?
      WHERE id = ?
    `);

    stmt.run(
      responseData.statusCode,
      responseData.statusMessage,
      JSON.stringify(responseData.responseHeaders),
      JSON.stringify(responseData.responseRawHeaders || []),
      this.convertBodyToText(responseData.responseBody),
      responseData.responseSize,
      responseData.responseTime,
      id,
    );
  }

  async storeWebSocketTraffic(entry: WebSocketTrafficEntry): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO websocket_connections (
        id, timestamp, url, host, protocol,
        headers, raw_headers,
        response_status_code, response_headers,
        established_at, closed_at, close_code, close_reason,
        client_ip, destination
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.id,
      entry.timestamp.getTime(),
      entry.url,
      entry.host,
      entry.protocol,
      JSON.stringify(entry.headers),
      JSON.stringify(entry.rawHeaders),
      entry.response?.statusCode,
      entry.response ? JSON.stringify(entry.response.headers) : null,
      entry.connection.established?.getTime(),
      entry.connection.closed?.getTime(),
      entry.connection.closeCode,
      this.emptyStringToNull(entry.connection.closeReason),
      entry.metadata.clientIP,
      this.emptyStringToNull(entry.metadata.destination),
    );

    // Store messages
    if (entry.messages.length > 0) {
      const msgStmt = this.db.prepare(`
        INSERT INTO websocket_messages (
          id, connection_id, timestamp, direction, message_type, data, size
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const message of entry.messages) {
        msgStmt.run(
          message.id,
          entry.id,
          message.timestamp.getTime(),
          message.direction,
          message.type,
          this.convertBodyToText(message.data),
          message.size,
        );
      }
    }
  }

  async updateWebSocketConnection(id: string, updates: Partial<WebSocketTrafficEntry>): Promise<void> {
    // Basic implementation - would need more sophisticated update logic
    if (updates.connection?.closed) {
      const stmt = this.db.prepare(`
        UPDATE websocket_connections
        SET closed_at = ?, close_code = ?, close_reason = ?
        WHERE id = ?
      `);

      stmt.run(
        updates.connection.closed.getTime(),
        updates.connection.closeCode,
        updates.connection.closeReason,
        id,
      );
    }
  }

  async addWebSocketMessage(connectionId: string, message: WebSocketMessage): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO websocket_messages (
        id, connection_id, timestamp, direction, message_type, data, size
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      message.id,
      connectionId,
      message.timestamp.getTime(),
      message.direction,
      message.type,
      this.convertBodyToText(message.data),
      message.size,
    );
  }

  async getWebSocketMessages(connectionId: string): Promise<WebSocketMessage[]> {
    const stmt = this.db.prepare(`
      SELECT id, timestamp, direction, message_type, data, size
      FROM websocket_messages
      WHERE connection_id = ?
      ORDER BY timestamp ASC
    `);

    const rows = stmt.all(connectionId) as WebSocketMessageRow[];
    return rows.map((row: WebSocketMessageRow) => ({
      id: row.id,
      timestamp: new Date(parseInt(row.timestamp)),
      direction: row.direction as 'inbound' | 'outbound',
      type: row.message_type as 'text' | 'binary' | 'ping' | 'pong' | 'close',
      data: row.data || '',
      size: row.size,
    }));
  }

  async queryHttpTraffic(filters: TrafficFilters): Promise<HttpTrafficEntry[]> {
    let query = 'SELECT * FROM http_traffic WHERE 1=1';
    const params: unknown[] = [];

    if (filters.host) {
      query += ' AND host LIKE ?';
      params.push(`%${filters.host}%`);
    }

    if (filters.method) {
      query += ' AND method = ?';
      params.push(filters.method);
    }

    if (filters.path) {
      query += ' AND path LIKE ?';
      params.push(`%${filters.path}%`);
    }

    if (filters.statusCode) {
      query += ' AND status_code = ?';
      params.push(filters.statusCode);
    }

    if (filters.timeRange) {
      query += ' AND timestamp BETWEEN ? AND ?';
      params.push(new Date(filters.timeRange.start).getTime());
      params.push(new Date(filters.timeRange.end).getTime());
    }

    if (filters.minResponseTime) {
      query += ' AND response_time >= ?';
      params.push(filters.minResponseTime);
    }

    if (filters.maxResponseTime) {
      query += ' AND response_time <= ?';
      params.push(filters.maxResponseTime);
    }

    // Add protocol filtering for HTTP traffic
    if (filters.protocol && (filters.protocol === 'http' || filters.protocol === 'https')) {
      query += ' AND protocol = ?';
      params.push(filters.protocol);
    }

    // Add sorting
    const sortBy = filters.sortBy || 'timestamp';
    const sortOrder = filters.sortOrder || 'desc';
    query += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    // Add pagination
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);

      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const rows = this.db.prepare(query).all(...params) as HttpTrafficRow[];
    return rows.map(row => this.mapRowToHttpEntry(row));
  }

  async queryWebSocketTraffic(filters: TrafficFilters): Promise<WebSocketTrafficEntry[]> {
    let query = `
      SELECT c.*,
             GROUP_CONCAT(m.id) as message_ids,
             GROUP_CONCAT(m.timestamp) as message_timestamps,
             GROUP_CONCAT(m.direction) as message_directions,
             GROUP_CONCAT(m.message_type) as message_types,
             GROUP_CONCAT(m.size) as message_sizes
      FROM websocket_connections c
      LEFT JOIN websocket_messages m ON c.id = m.connection_id
      WHERE 1=1
    `;
    const params: unknown[] = [];

    if (filters.host) {
      query += ' AND c.host LIKE ?';
      params.push(`%${filters.host}%`);
    }

    if (filters.protocol && (filters.protocol === 'ws' || filters.protocol === 'wss')) {
      query += ' AND c.protocol = ?';
      params.push(filters.protocol);
    }

    if (filters.connectionStatus) {
      if (filters.connectionStatus === 'active') {
        query += ' AND c.closed_at IS NULL';
      } else {
        query += ' AND c.closed_at IS NOT NULL';
      }
    }

    if (filters.timeRange) {
      query += ' AND c.timestamp BETWEEN ? AND ?';
      params.push(new Date(filters.timeRange.start).getTime());
      params.push(new Date(filters.timeRange.end).getTime());
    }

    query += ' GROUP BY c.id';

    // Add sorting
    const sortBy = filters.sortBy || 'timestamp';
    const sortOrder = filters.sortOrder || 'desc';
    query += ` ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}`;

    // Add pagination
    if (filters.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);

      if (filters.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }
    }

    const rows = this.db.prepare(query).all(...params) as WebSocketEntryQueryResult[];
    return rows.map(row => this.mapRowToWebSocketEntry(row));
  }

  async getTrafficById(id: string): Promise<TrafficEntry | null> {
    // Try HTTP first
    const httpRow = this.db.prepare('SELECT * FROM http_traffic WHERE id = ?').get(id) as HttpTrafficRow | undefined;
    if (httpRow) {
      return this.mapRowToHttpEntry(httpRow);
    }

    // Try WebSocket
    const wsRow = this.db.prepare(`
      SELECT c.*,
             GROUP_CONCAT(m.id) as message_ids,
             GROUP_CONCAT(m.timestamp) as message_timestamps,
             GROUP_CONCAT(m.direction) as message_directions,
             GROUP_CONCAT(m.message_type) as message_types,
             GROUP_CONCAT(m.size) as message_sizes
      FROM websocket_connections c
      LEFT JOIN websocket_messages m ON c.id = m.connection_id
      WHERE c.id = ?
      GROUP BY c.id
    `).get(id);

    if (wsRow) {
      const wsEntry = this.mapRowToWebSocketEntry(wsRow as WebSocketEntryQueryResult);
      // Fetch actual message data for detailed view
      wsEntry.messages = await this.getWebSocketMessages(id);
      return wsEntry;
    }

    return null;
  }

  async searchTraffic(query: SearchQuery): Promise<TrafficEntry[]> {
    const results: TrafficEntry[] = [];
    const searchTerm = query.regex ? query.query : this.escapeForFTS(query.query);

    if (this.options.enableFTS) {
      try {
        // Use FTS for efficient search
        await this.searchWithFTS(query, searchTerm, results);

        // If FTS returns no results, try LIKE as fallback for better user experience
        if (results.length === 0) {
          await this.searchWithLike(query, results);
        }
      } catch (error) {
        console.warn('FTS search failed, falling back to LIKE:', error instanceof Error ? error.message : String(error));
        // Fallback to LIKE queries if FTS fails
        await this.searchWithLike(query, results);
      }
    } else {
      // Fallback to LIKE queries
      await this.searchWithLike(query, results);
    }

    return results;
  }

  private escapeForFTS(query: string): string {
    // For FTS5, we need to handle special characters properly
    // If the query contains special characters, wrap it in double quotes
    if (/[.:\-@/]/.test(query)) {
      // Escape any existing double quotes and wrap the entire query
      return `"${query.replace(/"/g, '""')}"`;
    }
    // For simple queries, just escape the basic FTS special characters
    return query.replace(/['"*]/g, '\\$&');
  }

  private async searchWithFTS(query: SearchQuery, searchTerm: string, results: TrafficEntry[]): Promise<void> {
    // Search HTTP traffic with FTS
    if (query.searchIn.some(field => ['url', 'headers', 'body', 'response'].includes(field))) {
      const httpQuery = `
        SELECT h.* FROM http_traffic h
        JOIN http_traffic_fts fts ON h.rowid = fts.rowid
        WHERE http_traffic_fts MATCH ?
        ORDER BY rank
        LIMIT 1000
      `;

      const httpRows = this.db.prepare(httpQuery).all(searchTerm) as HttpTrafficRow[];
      results.push(...httpRows.map(row => this.mapRowToHttpEntry(row)));
    }

    // Search WebSocket traffic with FTS
    if (query.searchIn.some(field => ['url', 'headers'].includes(field))) {
      const wsQuery = `
        SELECT c.*,
               GROUP_CONCAT(m.id) as message_ids,
               GROUP_CONCAT(m.timestamp) as message_timestamps,
               GROUP_CONCAT(m.direction) as message_directions,
               GROUP_CONCAT(m.message_type) as message_types,
               GROUP_CONCAT(m.size) as message_sizes
        FROM websocket_connections c
        JOIN websocket_traffic_fts fts ON c.rowid = fts.rowid
        LEFT JOIN websocket_messages m ON c.id = m.connection_id
        WHERE websocket_traffic_fts MATCH ?
        GROUP BY c.id
        ORDER BY rank
        LIMIT 1000
      `;

      const wsRows = this.db.prepare(wsQuery).all(searchTerm) as WebSocketEntryQueryResult[];
      results.push(...wsRows.map(row => this.mapRowToWebSocketEntry(row)));
    }
  }

  private async searchWithLike(query: SearchQuery, results: TrafficEntry[]): Promise<void> {
    const likePattern = query.caseSensitive ? query.query : query.query.toLowerCase();
    const likeOp = query.caseSensitive ? 'LIKE' : 'LIKE';

    // Search HTTP traffic
    if (query.searchIn.includes('url')) {
      const httpUrlQuery = `
        SELECT * FROM http_traffic
        WHERE ${query.caseSensitive ? 'url' : 'LOWER(url)'} ${likeOp} ?
        LIMIT 500
      `;
      const httpRows = this.db.prepare(httpUrlQuery).all(`%${likePattern}%`) as HttpTrafficRow[];
      results.push(...httpRows.map(row => this.mapRowToHttpEntry(row)));
    }

    if (query.searchIn.includes('headers')) {
      const httpHeaderQuery = `
        SELECT * FROM http_traffic
        WHERE ${query.caseSensitive ? 'request_headers' : 'LOWER(request_headers)'} ${likeOp} ?
           OR ${query.caseSensitive ? 'response_headers' : 'LOWER(response_headers)'} ${likeOp} ?
        LIMIT 500
      `;
      const httpRows = this.db.prepare(httpHeaderQuery).all(`%${likePattern}%`, `%${likePattern}%`) as HttpTrafficRow[];
      results.push(...httpRows.map(row => this.mapRowToHttpEntry(row)));
    }

    // Search WebSocket traffic
    if (query.searchIn.includes('url')) {
      const wsUrlQuery = `
        SELECT c.*,
               GROUP_CONCAT(m.id) as message_ids,
               GROUP_CONCAT(m.timestamp) as message_timestamps,
               GROUP_CONCAT(m.direction) as message_directions,
               GROUP_CONCAT(m.message_type) as message_types,
               GROUP_CONCAT(m.size) as message_sizes
        FROM websocket_connections c
        LEFT JOIN websocket_messages m ON c.id = m.connection_id
        WHERE ${query.caseSensitive ? 'c.url' : 'LOWER(c.url)'} ${likeOp} ?
        GROUP BY c.id
        LIMIT 500
      `;
      const wsRows = this.db.prepare(wsUrlQuery).all(`%${likePattern}%`) as WebSocketEntryQueryResult[];
      results.push(...wsRows.map(row => this.mapRowToWebSocketEntry(row)));
    }
  }

  async getTrafficStats(timeRange?: { start: Date; end: Date }): Promise<TrafficStats> {
    let whereClause = '';
    const params: unknown[] = [];

    if (timeRange) {
      whereClause = 'WHERE timestamp BETWEEN ? AND ?';
      params.push(timeRange.start.getTime(), timeRange.end.getTime());
    }

    // Get basic counts
    const httpCount = this.db.prepare(`SELECT COUNT(*) as count FROM http_traffic ${whereClause}`).get(...params) as CountQueryResult;
    const wsCount = this.db.prepare(`SELECT COUNT(*) as count FROM websocket_connections ${whereClause}`).get(...params) as CountQueryResult;
    const wsMessageCount = this.db.prepare(`SELECT COUNT(*) as count FROM websocket_messages ${whereClause ? whereClause.replace('timestamp', 'timestamp') : ''}`).get(...params) as CountQueryResult;

    // Get time range
    const timeRangeQuery = this.db.prepare(`
      SELECT
        MIN(timestamp) as earliest,
        MAX(timestamp) as latest
      FROM (
        SELECT timestamp FROM http_traffic ${whereClause}
        UNION ALL
        SELECT timestamp FROM websocket_connections ${whereClause}
      )
    `).get(...params, ...params) as TimeRangeQueryResult;

    // Get HTTP method distribution
    const methodCounts = this.db.prepare(`
      SELECT method, COUNT(*) as count
      FROM http_traffic ${whereClause}
      GROUP BY method
    `).all(...params) as MethodCountResult[];

    // Get HTTP status distribution
    const statusCounts = this.db.prepare(`
      SELECT status_code, COUNT(*) as count
      FROM http_traffic
      WHERE status_code IS NOT NULL ${whereClause ? `AND ${  whereClause.substring(6)}` : ''}
      GROUP BY status_code
    `).all(...params) as StatusCountResult[];

    // Get host distribution
    const hostCounts = this.db.prepare(`
      SELECT host, COUNT(*) as count
      FROM http_traffic ${whereClause}
      GROUP BY host
      ORDER BY count DESC
      LIMIT 10
    `).all(...params) as HostCountResult[];

    // Get average response time and error rate
    const responseStats = this.db.prepare(`
      SELECT
        AVG(response_time) as avgResponseTime,
        COUNT(CASE WHEN status_code >= 400 THEN 1 END) as errorCount,
        COUNT(*) as totalCount
      FROM http_traffic
      WHERE response_time IS NOT NULL ${whereClause ? `AND ${  whereClause.substring(6)}` : ''}
    `).get(...params) as ResponseStatsResult;

    // Get WebSocket protocol distribution
    const protocolCounts = this.db.prepare(`
      SELECT protocol, COUNT(*) as count
      FROM websocket_connections ${whereClause}
      GROUP BY protocol
    `).all(...params) as ProtocolCountResult[];

    // Get active WebSocket connections
    const activeConnections = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM websocket_connections
      WHERE closed_at IS NULL ${whereClause ? `AND ${  whereClause.substring(6)}` : ''}
    `).get(...params) as CountQueryResult;

    // Calculate average messages per connection
    const avgMessages = wsCount?.count > 0 ? (wsMessageCount?.count || 0) / wsCount.count : 0;

    return {
      totalRequests: httpCount?.count || 0,
      totalWebSocketConnections: wsCount?.count || 0,
      totalWebSocketMessages: wsMessageCount?.count || 0,
      timeRange: {
        earliest: new Date(timeRangeQuery?.earliest || 0),
        latest: new Date(timeRangeQuery?.latest || 0),
      },
      httpStats: {
        methodCounts: Object.fromEntries(methodCounts.map(row => [row.method, row.count])),
        statusCounts: Object.fromEntries(statusCounts.map(row => [row.status_code, row.count])),
        hostCounts: Object.fromEntries(hostCounts.map(row => [row.host, row.count])),
        averageResponseTime: responseStats?.avgResponseTime || 0,
        errorRate: responseStats?.totalCount > 0 ? (responseStats.errorCount / responseStats.totalCount) * 100 : 0,
      },
      webSocketStats: {
        activeConnections: activeConnections?.count || 0,
        totalMessages: wsMessageCount?.count || 0,
        averageMessagesPerConnection: avgMessages,
        protocolCounts: Object.fromEntries(protocolCounts.map(row => [row.protocol, row.count])),
      },
    };
  }

  async deleteTrafficBefore(date: Date): Promise<number> {
    const timestamp = date.getTime();

    // Delete HTTP traffic
    const httpDeleted = this.db.prepare('DELETE FROM http_traffic WHERE timestamp < ?').run(timestamp);

    // Delete WebSocket messages first (foreign key constraint)
    this.db.prepare('DELETE FROM websocket_messages WHERE timestamp < ?').run(timestamp);

    // Delete WebSocket connections
    const wsDeleted = this.db.prepare('DELETE FROM websocket_connections WHERE timestamp < ?').run(timestamp);

    return httpDeleted.changes + wsDeleted.changes;
  }

  async vacuum(): Promise<void> {
    this.db.exec('VACUUM');
  }

  async rebuildFTS(): Promise<void> {
    if (!this.options.enableFTS) {
      throw new Error('FTS is not enabled');
    }

    try {
      // Rebuild FTS tables to populate with existing data
      this.db.exec(`
        INSERT INTO http_traffic_fts(http_traffic_fts) VALUES('rebuild');
        INSERT INTO websocket_traffic_fts(websocket_traffic_fts) VALUES('rebuild');
      `);
    } catch (error) {
      throw new Error(`Failed to rebuild FTS tables: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(): Promise<void> {
    this.db.close();
  }

  private mapRowToHttpEntry(row: HttpTrafficRow): HttpTrafficEntry {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      method: row.method,
      url: row.url,
      host: row.host,
      path: row.path,
      queryString: row.query_string,
      protocol: row.protocol,
      headers: row.request_headers ? JSON.parse(row.request_headers) : {},
      rawHeaders: row.request_raw_headers ? JSON.parse(row.request_raw_headers) : [],
      body: row.request_body,
      requestSize: row.request_size,
      contentType: row.content_type,
      userAgent: row.user_agent,
      response: row.status_code ? {
        statusCode: row.status_code,
        statusMessage: row.status_message || '',
        headers: row.response_headers ? JSON.parse(row.response_headers) : {},
        rawHeaders: row.response_raw_headers ? JSON.parse(row.response_raw_headers) : [],
        body: row.response_body,
        responseSize: row.response_size || 0,
        responseTime: row.response_time || 0,
      } : undefined,
      metadata: {
        clientIP: row.client_ip || 'unknown',
        destination: row.destination,
        errorMessage: row.error_message,
      },
    };
  }

  private mapRowToWebSocketEntry(row: WebSocketEntryQueryResult): WebSocketTrafficEntry {
    const messages: WebSocketMessage[] = [];

    if (row.message_ids && row.message_timestamps && row.message_directions && row.message_types && row.message_sizes) {
      const ids = row.message_ids.split(',');
      const timestamps = row.message_timestamps.split(',');
      const directions = row.message_directions.split(',');
      const types = row.message_types.split(',');
      const sizes = row.message_sizes.split(',');

      for (let i = 0; i < ids.length; i++) {
        messages.push({
          id: ids[i],
          timestamp: new Date(parseInt(timestamps[i])),
          direction: directions[i] as 'inbound' | 'outbound',
          type: types[i] as 'text' | 'binary' | 'ping' | 'pong' | 'close',
          data: '', // Data will be fetched separately when needed
          size: parseInt(sizes[i]),
        });
      }
    }

    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      url: row.url,
      host: row.host,
      protocol: row.protocol as 'ws' | 'wss',
      headers: row.headers ? JSON.parse(row.headers) : {},
      rawHeaders: row.raw_headers ? JSON.parse(row.raw_headers) : [],
      response: row.response_status_code ? {
        statusCode: row.response_status_code,
        headers: row.response_headers ? JSON.parse(row.response_headers) : {},
        rawHeaders: [],
      } : undefined,
      connection: {
        established: row.established_at ? new Date(row.established_at) : undefined,
        closed: row.closed_at ? new Date(row.closed_at) : undefined,
        closeCode: row.close_code || undefined,
        closeReason: row.close_reason || undefined,
      },
      messages,
      metadata: {
        clientIP: row.client_ip || 'unknown',
        destination: row.destination,
      },
    };
  }

  /**
   * Convert body data (Buffer, string, or other) to text for storage
   */
  private convertBodyToText(body: Buffer | string | undefined | null): string | null {
    if (body === undefined || body === null) {
      return null;
    }

    if (typeof body === 'string') {
      return body.length > 0 ? body : null;
    }

    if (Buffer.isBuffer(body)) {
      // Try to decode as UTF-8 text first
      try {
        const text = body.toString('utf8');
        return text.length > 0 ? text : null;
      } catch (_error) {
        // If UTF-8 decoding fails, encode as base64 for binary data
        return `[BINARY:base64]${body.toString('base64')}`;
      }
    }

    // For any other type, convert to JSON string
    try {
      const jsonString = JSON.stringify(body);
      return jsonString.length > 0 ? jsonString : null;
    } catch (_error) {
      const stringValue = String(body);
      return stringValue.length > 0 ? stringValue : null;
    }
  }

  /**
   * Convert empty strings to null for cleaner database storage
   */
  private emptyStringToNull(value: string | undefined | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    return typeof value === 'string' && value.trim().length === 0 ? null : value;
  }
}
