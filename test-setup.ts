import { vi, beforeEach, afterEach } from 'vitest';
import { mkdirSync, existsSync } from 'fs';
import { dirname } from 'path';

// Mock file system operations for testing
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    statSync: vi.fn(),
  };
});

// Mock better-sqlite3 for testing
vi.mock('better-sqlite3', () => {
  const mockStatement = {
    run: vi.fn(() => ({ changes: 1, lastInsertRowid: 1 })),
    get: vi.fn(() => null),
    all: vi.fn(() => []),
    bind: vi.fn(),
    finalize: vi.fn(),
  };

  const mockDb = {
    exec: vi.fn(),
    prepare: vi.fn(() => mockStatement),
    close: vi.fn(),
    pragma: vi.fn(() => [{ freelist_count: 0, page_count: 100, page_size: 4096 }]),
    transaction: vi.fn((fn) => fn),
  };

  return {
    default: vi.fn(() => mockDb),
    __esModule: true,
  };
});

// Mock mockttp for testing
vi.mock('mockttp', () => ({
  getLocal: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    forAnyRequest: vi.fn(() => ({
      thenPassThrough: vi.fn(),
    })),
    forAnyWebSocket: vi.fn(() => ({
      thenPassThrough: vi.fn(),
    })),
    on: vi.fn(),
    port: 8080,
    url: 'http://localhost:8080',
    enableDebug: vi.fn(),
    addRequestRules: vi.fn(),
    addWebSocketRules: vi.fn(),
  })),
  generateCACertificate: vi.fn(() => ({
    cert: 'mock-cert',
    key: 'mock-key',
  })),
}));

// Mock uuid for consistent testing
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid-1234'),
}));

// Mock network operations
vi.mock('net', () => ({
  createConnection: vi.fn(),
  createServer: vi.fn(() => ({
    listen: vi.fn((port, callback) => callback && callback()),
    close: vi.fn((callback) => callback && callback()),
    on: vi.fn(),
  })),
}));

// Mock DNS operations
vi.mock('dns', () => ({
  lookup: vi.fn((hostname, callback) => {
    callback(null, '127.0.0.1', 4);
  }),
}));

// Mock storage classes
vi.mock('./src/storage/sqlite-storage.js', () => ({
  SQLiteTrafficStorage: vi.fn().mockImplementation(() => ({
    storeHttpTraffic: vi.fn(),
    storeWebSocketTraffic: vi.fn(),
    queryHttpTraffic: vi.fn(() => []),
    queryWebSocketTraffic: vi.fn(() => []),
    getTrafficById: vi.fn(),
    searchTraffic: vi.fn(() => []),
    getTrafficStats: vi.fn(() => ({})),
    deleteTrafficBefore: vi.fn(() => 0),
    deleteAllTraffic: vi.fn(() => 0),
    vacuum: vi.fn(() => ({ freedBytes: 0 })),
    close: vi.fn(),
  })),
}));

// Mock proxy classes
vi.mock('./src/proxy/mockttp-proxy.js', () => ({
  MockttpProxyServer: vi.fn().mockImplementation(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    restart: vi.fn(),
    getStatus: vi.fn(() => ({ isRunning: false, httpPort: 8080 })),
    getCACertificate: vi.fn(),
  })),
}));

// Setup test environment
beforeEach(() => {
  vi.clearAllMocks();

  // Reset console methods
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});
