/**
 * Type definitions for external libraries and APIs
 * This file contains type definitions for libraries that don't have proper TypeScript types
 * or where we need to define specific interfaces for our use cases.
 */

// Mockttp Request/Response Types
export interface MockttpRequest {
  id?: string;
  method: string;
  url: string;
  headers: Record<string, string | string[]>;
  body?: Buffer | string;
  remoteIpAddress?: string;
  remoteAddress?: string;
  connection?: {
    remoteAddress?: string;
  };
  timingEvents?: {
    startTime?: number;
  };
  // Internal proxy tracking
  _proxyRequestId?: string;
  _proxyTimestamp?: number;
}

export interface MockttpResponse {
  id?: string;
  statusCode: number;
  statusMessage: string;
  headers: Record<string, string | string[]>;
  body?: {
    buffer?: Buffer;
    text?: string;
  } | Buffer | string;
  request?: MockttpRequest;
}

export interface MockttpWebSocketMessage {
  streamId?: string;
  content?: Buffer | Uint8Array;
  isBinary?: boolean;
  timingEvents?: {
    startTime?: number;
  };
}

export interface MockttpWebSocketCloseEvent {
  streamId?: string;
  closeCode?: number;
  closeReason?: string;
}

// HTTPS Configuration Types
export interface MockttpHTTPSConfig {
  cert?: string;
  key?: string;
  keyPath?: string;
  certPath?: string;
  [key: string]: unknown; // Allow additional properties for mockttp compatibility
}

// Database Row Types
export interface HttpTrafficRow {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  host: string;
  path: string;
  query_string: string | null;
  protocol: 'http' | 'https';
  request_headers: string | null;
  request_raw_headers: string | null;
  request_body: string | null;
  request_size: number;
  content_type: string | null;
  user_agent: string | null;
  status_code: number | null;
  status_message: string | null;
  response_headers: string | null;
  response_raw_headers: string | null;
  response_body: string | null;
  response_size: number | null;
  response_time: number | null;
  client_ip: string | null;
  destination: string | null;
  error_message: string | null;
}

export interface WebSocketTrafficRow {
  id: string;
  timestamp: string;
  url: string;
  host: string;
  protocol: string;
  headers: string;
  raw_headers: string;
  established: string;
  closed: string | null;
  close_code: number | null;
  close_reason: string | null;
  client_ip: string | null;
  destination: string | null;
}

export interface WebSocketMessageRow {
  id: string;
  connection_id: string;
  timestamp: string;
  direction: string;
  message_type: string;
  data: string | null;
  size: number;
}

// Node.js Server Error Types
export interface NodeServerError extends Error {
  code?: string;
  errno?: number;
  syscall?: string;
  address?: string;
  port?: number;
}

// SQLite Statement Types
export interface SQLiteStatement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number };
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
  finalize(): void;
}

// Generic Database Query Result
export interface DatabaseQueryResult {
  [key: string]: unknown;
}

// Specific Database Query Result Interfaces
export interface CountQueryResult {
  count: number;
}

export interface TimeRangeQueryResult {
  earliest: number | null;
  latest: number | null;
}

export interface MethodCountResult {
  method: string;
  count: number;
}

export interface StatusCountResult {
  status_code: number;
  count: number;
}

export interface HostCountResult {
  host: string;
  count: number;
}

export interface ResponseStatsResult {
  avgResponseTime: number | null;
  errorCount: number;
  totalCount: number;
}

export interface ProtocolCountResult {
  protocol: string;
  count: number;
}

export interface WebSocketEntryQueryResult {
  id: string;
  timestamp: number;
  url: string;
  host: string;
  protocol: string;
  headers: string | null;
  raw_headers: string | null;
  response_status_code: number | null;
  response_headers: string | null;
  established_at: number | null;
  closed_at: number | null;
  close_code: number | null;
  close_reason: string | null;
  client_ip: string | null;
  destination: string | null;
  message_ids: string | null;
  message_timestamps: string | null;
  message_directions: string | null;
  message_types: string | null;
  message_sizes: string | null;
}

// Filter Types for Database Queries
export interface TrafficFilters {
  host?: string;
  method?: string;
  protocol?: 'http' | 'https' | 'ws' | 'wss';
  statusCode?: number;
  startDate?: string;
  endDate?: string;
}

// Search Parameters
export interface SearchParams {
  query: string;
  searchIn?: ('url' | 'headers' | 'body' | 'response')[];
  caseSensitive?: boolean;
  regex?: boolean;
  limit?: number;
}

// Export Format Types
export interface ExportOptions {
  format: 'json' | 'csv' | 'har';
  includeHeaders?: boolean;
  includeBody?: boolean;
  maxEntries?: number;
  outputPath?: string;
  filters?: TrafficFilters;
}
