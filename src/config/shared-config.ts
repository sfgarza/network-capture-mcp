import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Shared configuration for the MCP Proxy Traffic Server
 * This ensures all components use consistent paths regardless of working directory
 */
export class SharedConfig {
  private static instance?: SharedConfig;
  private _projectRoot: string;
  private _defaultDbPath: string;

  private constructor() {
    // Get the project root directory (where package.json is located)
    // This works regardless of where the MCP server is executed from
    const currentFile = fileURLToPath(import.meta.url);
    const currentDir = dirname(currentFile);
    
    // Navigate up from src/config/ to project root
    this._projectRoot = resolve(currentDir, '..', '..');
    
    // Set default database path relative to project root
    this._defaultDbPath = resolve(this._projectRoot, 'traffic.db');
  }

  static getInstance(): SharedConfig {
    if (!SharedConfig.instance) {
      SharedConfig.instance = new SharedConfig();
    }
    return SharedConfig.instance;
  }

  /**
   * Get the project root directory
   */
  get projectRoot(): string {
    return this._projectRoot;
  }

  /**
   * Get the default database path (absolute)
   */
  get defaultDbPath(): string {
    return this._defaultDbPath;
  }

  /**
   * Resolve a database path - if relative, make it relative to project root
   * If absolute, use as-is
   */
  resolveDbPath(dbPath: string): string {
    if (dbPath.startsWith('/') || dbPath.includes(':')) {
      // Absolute path (Unix or Windows)
      return dbPath;
    }
    
    // Relative path - resolve relative to project root
    return resolve(this._projectRoot, dbPath);
  }

  /**
   * Get database path for tools - uses default if not specified
   */
  getDbPath(customPath?: string): string {
    if (customPath) {
      return this.resolveDbPath(customPath);
    }
    return this._defaultDbPath;
  }
}
