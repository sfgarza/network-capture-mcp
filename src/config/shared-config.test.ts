import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SharedConfig } from './shared-config.js';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Mock path and url modules
vi.mock('path', () => ({
  resolve: vi.fn((...args) => args.join('/')),
  dirname: vi.fn((path) => path.split('/').slice(0, -1).join('/')),
}));

vi.mock('url', () => ({
  fileURLToPath: vi.fn((url) => url.replace('file://', '')),
}));

describe('SharedConfig', () => {
  beforeEach(() => {
    // Reset singleton instance
    (SharedConfig as any).instance = undefined;
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = SharedConfig.getInstance();
      const instance2 = SharedConfig.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create instance only once', () => {
      const instance1 = SharedConfig.getInstance();
      const instance2 = SharedConfig.getInstance();
      const instance3 = SharedConfig.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance2).toBe(instance3);
    });
  });

  describe('projectRoot', () => {
    it('should return project root path', () => {
      vi.mocked(fileURLToPath).mockReturnValue('/path/to/src/config/shared-config.js');
      vi.mocked(dirname).mockReturnValue('/path/to/src/config');
      vi.mocked(resolve).mockReturnValue('/path/to');
      
      const config = SharedConfig.getInstance();
      const projectRoot = config.projectRoot;
      
      expect(resolve).toHaveBeenCalledWith('/path/to/src/config', '..', '..');
      expect(projectRoot).toBe('/path/to');
    });
  });

  describe('defaultDbPath', () => {
    it('should return default database path', () => {
      vi.mocked(fileURLToPath).mockReturnValue('/path/to/src/config/shared-config.js');
      vi.mocked(dirname).mockReturnValue('/path/to/src/config');
      vi.mocked(resolve)
        .mockReturnValueOnce('/path/to') // for project root
        .mockReturnValueOnce('/path/to/traffic.db'); // for db path
      
      const config = SharedConfig.getInstance();
      const dbPath = config.defaultDbPath;
      
      expect(resolve).toHaveBeenCalledWith('/path/to', 'traffic.db');
      expect(dbPath).toBe('/path/to/traffic.db');
    });
  });

  describe('resolveDbPath', () => {
    it('should return absolute path as-is for Unix paths', () => {
      const config = SharedConfig.getInstance();
      const absolutePath = '/absolute/path/to/db.sqlite';
      
      const result = config.resolveDbPath(absolutePath);
      
      expect(result).toBe(absolutePath);
    });

    it('should return absolute path as-is for Windows paths', () => {
      const config = SharedConfig.getInstance();
      const windowsPath = 'C:\\absolute\\path\\to\\db.sqlite';
      
      const result = config.resolveDbPath(windowsPath);
      
      expect(result).toBe(windowsPath);
    });

    it('should resolve relative paths relative to project root', () => {
      vi.mocked(fileURLToPath).mockReturnValue('/path/to/src/config/shared-config.js');
      vi.mocked(dirname).mockReturnValue('/path/to/src/config');
      vi.mocked(resolve)
        .mockReturnValueOnce('/path/to') // for project root
        .mockReturnValueOnce('/path/to/traffic.db') // for default db path
        .mockReturnValueOnce('/path/to/custom.db'); // for resolved path
      
      const config = SharedConfig.getInstance();
      const relativePath = './custom.db';
      
      const result = config.resolveDbPath(relativePath);
      
      expect(resolve).toHaveBeenCalledWith('/path/to', relativePath);
      expect(result).toBe('/path/to/custom.db');
    });

    it('should handle relative paths without leading dot', () => {
      vi.mocked(fileURLToPath).mockReturnValue('/path/to/src/config/shared-config.js');
      vi.mocked(dirname).mockReturnValue('/path/to/src/config');
      vi.mocked(resolve)
        .mockReturnValueOnce('/path/to') // for project root
        .mockReturnValueOnce('/path/to/traffic.db') // for default db path
        .mockReturnValueOnce('/path/to/data/custom.db'); // for resolved path
      
      const config = SharedConfig.getInstance();
      const relativePath = 'data/custom.db';
      
      const result = config.resolveDbPath(relativePath);
      
      expect(resolve).toHaveBeenCalledWith('/path/to', relativePath);
      expect(result).toBe('/path/to/data/custom.db');
    });
  });

  describe('getDbPath', () => {
    it('should return default db path when no custom path provided', () => {
      vi.mocked(fileURLToPath).mockReturnValue('/path/to/src/config/shared-config.js');
      vi.mocked(dirname).mockReturnValue('/path/to/src/config');
      vi.mocked(resolve)
        .mockReturnValueOnce('/path/to') // for project root
        .mockReturnValueOnce('/path/to/traffic.db'); // for default db path
      
      const config = SharedConfig.getInstance();
      const result = config.getDbPath();
      
      expect(result).toBe('/path/to/traffic.db');
    });

    it('should resolve custom path when provided', () => {
      vi.mocked(fileURLToPath).mockReturnValue('/path/to/src/config/shared-config.js');
      vi.mocked(dirname).mockReturnValue('/path/to/src/config');
      vi.mocked(resolve)
        .mockReturnValueOnce('/path/to') // for project root
        .mockReturnValueOnce('/path/to/traffic.db') // for default db path
        .mockReturnValueOnce('/path/to/custom.db'); // for resolved custom path
      
      const config = SharedConfig.getInstance();
      const customPath = './custom.db';
      const result = config.getDbPath(customPath);
      
      expect(result).toBe('/path/to/custom.db');
    });

    it('should handle absolute custom paths', () => {
      const config = SharedConfig.getInstance();
      const absolutePath = '/absolute/custom.db';
      const result = config.getDbPath(absolutePath);
      
      expect(result).toBe(absolutePath);
    });

    it('should handle empty string as custom path', () => {
      vi.mocked(fileURLToPath).mockReturnValue('/path/to/src/config/shared-config.js');
      vi.mocked(dirname).mockReturnValue('/path/to/src/config');
      vi.mocked(resolve)
        .mockReturnValueOnce('/path/to') // for project root
        .mockReturnValueOnce('/path/to/traffic.db'); // for default db path
      
      const config = SharedConfig.getInstance();
      const result = config.getDbPath('');
      
      expect(result).toBe('/path/to/traffic.db');
    });
  });
});
