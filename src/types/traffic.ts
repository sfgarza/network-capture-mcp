export interface HttpTrafficEntry {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  host: string;
  path: string;
  queryString?: string | null;
  protocol: 'http' | 'https';

  // Request data
  headers: Record<string, string | string[]>;
  rawHeaders: Array<[string, string]>;
  body?: string | null;
  requestSize: number;
  contentType?: string | null;
  userAgent?: string | null;

  // Response data
  response?: {
    statusCode: number;
    statusMessage: string;
    headers: Record<string, string | string[]>;
    rawHeaders: Array<[string, string]>;
    body?: string | null;
    responseSize: number;
    responseTime: number; // milliseconds
  };

  // Metadata
  metadata: {
    clientIP: string;
    destination?: string | null;
    errorMessage?: string | null;
  };
}

export interface WebSocketMessage {
  id: string;
  timestamp: Date;
  direction: 'inbound' | 'outbound';
  type: 'text' | 'binary' | 'ping' | 'pong' | 'close';
  data: string;
  size: number;
}

export interface WebSocketTrafficEntry {
  id: string;
  timestamp: Date;
  url: string;
  host: string;
  protocol: 'ws' | 'wss';

  // Connection data
  headers: Record<string, string | string[]>;
  rawHeaders: Array<[string, string]>;

  // Response data (upgrade response)
  response?: {
    statusCode: number;
    headers: Record<string, string | string[]>;
    rawHeaders: Array<[string, string]>;
  };

  // Connection lifecycle
  connection: {
    established?: Date;
    closed?: Date;
    closeCode?: number;
    closeReason?: string | null;
  };

  // Messages
  messages: WebSocketMessage[];

  // Metadata
  metadata: {
    clientIP: string;
    destination?: string | null;
    subprotocols?: string[];
    extensions?: string[];
  };
}

export type TrafficEntry = HttpTrafficEntry | WebSocketTrafficEntry;

export interface TrafficFilters {
  // Common filters
  host?: string;
  timeRange?: {
    start: string; // ISO date string
    end: string;   // ISO date string
  };

  // HTTP-specific filters
  method?: string;
  path?: string;
  statusCode?: number;
  minResponseTime?: number;
  maxResponseTime?: number;

  // WebSocket-specific filters
  protocol?: 'http' | 'https' | 'ws' | 'wss';
  connectionStatus?: 'active' | 'closed';

  // Pagination and sorting
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'url' | 'method' | 'status' | 'responseTime';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchQuery {
  query: string;
  searchIn: Array<'url' | 'headers' | 'body' | 'response'>;
  caseSensitive?: boolean;
  regex?: boolean;
}

export interface TrafficStats {
  totalRequests: number;
  totalWebSocketConnections: number;
  totalWebSocketMessages: number;
  timeRange: {
    earliest: Date;
    latest: Date;
  };

  // HTTP stats
  httpStats: {
    methodCounts: Record<string, number>;
    statusCounts: Record<number, number>;
    hostCounts: Record<string, number>;
    averageResponseTime: number;
    errorRate: number;
  };

  // WebSocket stats
  webSocketStats: {
    activeConnections: number;
    totalMessages: number;
    averageMessagesPerConnection: number;
    protocolCounts: Record<string, number>;
  };
}

export interface TrafficStorage {
  // Store traffic
  storeHttpTraffic(entry: HttpTrafficEntry): Promise<void>;
  storeWebSocketTraffic(entry: WebSocketTrafficEntry): Promise<void>;
  updateHttpTrafficResponse(id: string, responseData: Partial<HttpTrafficEntry['response']>): Promise<void>;
  updateWebSocketConnection(id: string, updates: Partial<WebSocketTrafficEntry>): Promise<void>;
  addWebSocketMessage(connectionId: string, message: WebSocketMessage): Promise<void>;

  // Query traffic
  queryHttpTraffic(filters: TrafficFilters): Promise<HttpTrafficEntry[]>;
  queryWebSocketTraffic(filters: TrafficFilters): Promise<WebSocketTrafficEntry[]>;
  getTrafficById(id: string): Promise<TrafficEntry | null>;

  // Search
  searchTraffic(query: SearchQuery): Promise<TrafficEntry[]>;

  // Analytics
  getTrafficStats(timeRange?: { start: Date; end: Date }): Promise<TrafficStats>;

  // Maintenance
  deleteTrafficBefore(date: Date): Promise<number>;
  vacuum(): Promise<void>;
  close(): Promise<void>;
}

export interface ProxyConfig {
  proxy: {
    httpPort: number;
    httpsPort?: number;
    enableWebSockets: boolean;
    enableHTTPS: boolean;
    certPath?: string;
    keyPath?: string;
    ignoreHostHttpsErrors: boolean;
  };

  capture: {
    captureHeaders: boolean;
    captureBody: boolean;
    maxBodySize: number;
    captureWebSocketMessages: boolean;
  };

  storage: {
    dbPath: string;
    maxEntries: number;
    retentionDays: number;
    enableFTS: boolean;
  };
}

export interface ProxyStatus {
  isRunning: boolean;
  httpPort?: number;
  httpsPort?: number;
  startTime?: Date;
  config: ProxyConfig;
  stats: {
    totalRequests: number;
    totalWebSocketConnections: number;
    activeConnections: number;
  };
}
