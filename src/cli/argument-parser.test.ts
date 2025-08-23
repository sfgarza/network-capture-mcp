import { describe, it, expect } from 'vitest';
import { ArgumentParser, CommandLineArgs } from './argument-parser.js';

describe('ArgumentParser', () => {
  describe('parse', () => {
    it('should parse basic port argument', () => {
      const argv = ['node', 'script.js', '--port', '9090'];
      const result = ArgumentParser.parse(argv);

      expect(result.port).toBe(9090);
    });

    it('should parse HTTPS port argument', () => {
      const argv = ['node', 'script.js', '--https-port', '8443'];
      const result = ArgumentParser.parse(argv);

      expect(result.httpsPort).toBe(8443);
    });

    it('should parse boolean flags', () => {
      const argv = ['node', 'script.js', '--help'];
      const result = ArgumentParser.parse(argv);

      expect(result.help).toBe(true);
    });

    it('should parse negative boolean flags', () => {
      const argv = ['node', 'script.js', '--no-websockets', '--no-https'];
      const result = ArgumentParser.parse(argv);

      expect(result.enableWebsockets).toBe(false);
      expect(result.enableHttps).toBe(false);
    });

    it('should parse string arguments', () => {
      const argv = ['node', 'script.js', '--db-path', './test.db', '--cert-path', './cert.pem'];
      const result = ArgumentParser.parse(argv);

      expect(result.dbPath).toBe('./test.db');
      expect(result.certPath).toBe('./cert.pem');
    });

    it('should parse numeric arguments', () => {
      const argv = ['node', 'script.js', '--port', '9090', '--max-body-size', '2048'];
      const result = ArgumentParser.parse(argv);

      expect(result.port).toBe(9090);
      expect(result.maxBodySize).toBe(2048);
    });

    it('should handle help and version flags', () => {
      const helpArgv = ['node', 'script.js', '--help'];
      const versionArgv = ['node', 'script.js', '--version'];

      const helpResult = ArgumentParser.parse(helpArgv);
      const versionResult = ArgumentParser.parse(versionArgv);

      expect(helpResult.help).toBe(true);
      expect(versionResult.version).toBe(true);
    });

    it('should handle short flags', () => {
      const argv = ['node', 'script.js', '-h', '-v'];
      const result = ArgumentParser.parse(argv);

      expect(result.help).toBe(true);
      expect(result.version).toBe(true);
    });

    it('should throw error for unknown arguments', () => {
      const argv = ['node', 'script.js', '--unknown-flag'];

      expect(() => ArgumentParser.parse(argv)).toThrow('Unknown argument: --unknown-flag');
    });

    it('should throw error for removed flags', () => {
      const argv1 = ['node', 'script.js', '--enable-websockets'];
      const argv2 = ['node', 'script.js', '--enable-https'];
      const argv3 = ['node', 'script.js', '--capture-body'];
      const argv4 = ['node', 'script.js', '--verbose'];
      const argv5 = ['node', 'script.js', '--quiet'];
      const argv6 = ['node', 'script.js', '--max-entries'];
      const argv7 = ['node', 'script.js', '--retention-days'];
      const argv8 = ['node', 'script.js', '--max-websocket-messages'];

      expect(() => ArgumentParser.parse(argv1)).toThrow('Unknown argument: --enable-websockets');
      expect(() => ArgumentParser.parse(argv2)).toThrow('Unknown argument: --enable-https');
      expect(() => ArgumentParser.parse(argv3)).toThrow('Unknown argument: --capture-body');
      expect(() => ArgumentParser.parse(argv4)).toThrow('Unknown argument: --verbose');
      expect(() => ArgumentParser.parse(argv5)).toThrow('Unknown argument: --quiet');
      expect(() => ArgumentParser.parse(argv6)).toThrow('Unknown argument: --max-entries');
      expect(() => ArgumentParser.parse(argv7)).toThrow('Unknown argument: --retention-days');
      expect(() => ArgumentParser.parse(argv8)).toThrow('Unknown argument: --max-websocket-messages');
    });

    it('should throw error for missing numeric values', () => {
      const argv = ['node', 'script.js', '--port'];

      expect(() => ArgumentParser.parse(argv)).toThrow('Missing value for --port');
    });

    it('should throw error for invalid numeric values', () => {
      const argv = ['node', 'script.js', '--port', 'invalid'];

      expect(() => ArgumentParser.parse(argv)).toThrow('Invalid number for --port: invalid');
    });

    it('should return empty object for no arguments', () => {
      const argv = ['node', 'script.js'];
      const result = ArgumentParser.parse(argv);

      expect(result).toEqual({});
    });

    it('should parse complex argument combinations', () => {
      const argv = [
        'node', 'script.js',
        '--port', '9090',
        '--https-port', '8443',
        '--no-websockets',
        '--no-capture-body',
        '--db-path', './custom.db',
      ];

      const result = ArgumentParser.parse(argv);

      expect(result).toEqual({
        port: 9090,
        httpsPort: 8443,
        enableWebsockets: false,
        captureBody: false,
        dbPath: './custom.db',
      });
    });
  });

  describe('generateHelp', () => {
    it('should generate help text', () => {
      const help = ArgumentParser.generateHelp();

      expect(help).toContain('MCP Proxy Traffic Server');
      expect(help).toContain('USAGE:');
      expect(help).toContain('--port');
      expect(help).toContain('--help');
      expect(help).toContain('EXAMPLES:');
    });

    it('should include all major option categories', () => {
      const help = ArgumentParser.generateHelp();

      expect(help).toContain('PROXY OPTIONS:');
      expect(help).toContain('STORAGE OPTIONS:');
      expect(help).toContain('CAPTURE OPTIONS:');
      expect(help).toContain('GENERAL OPTIONS:');
    });
  });
});
