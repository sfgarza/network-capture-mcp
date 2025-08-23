export interface CommandLineArgs {
  // Proxy Configuration
  port?: number;
  httpsPort?: number;
  enableWebsockets?: boolean;
  enableHttps?: boolean;
  certPath?: string;
  keyPath?: string;
  insecure?: boolean;

  // Storage Configuration
  dbPath?: string;
  enableFts?: boolean;

  // Capture Configuration
  captureHeaders?: boolean;
  captureBody?: boolean;
  maxBodySize?: number;
  captureWebsocketMessages?: boolean;

  // Auto-start & Health Configuration
  autoStart?: boolean;
  autoRestart?: boolean;
  healthCheckInterval?: number;

  // General Options
  help?: boolean;
  version?: boolean;
}

export class ArgumentParser {
  static parse(argv: string[]): CommandLineArgs {
    const args: CommandLineArgs = {};

    for (let i = 2; i < argv.length; i++) {
      const arg = argv[i];
      const nextArg = argv[i + 1];

      switch (arg) {
      // Proxy Configuration
      case '--port':
        args.port = this.parseNumber(nextArg, 'port');
        i++;
        break;
      case '--https-port':
        args.httpsPort = this.parseNumber(nextArg, 'https-port');
        i++;
        break;
      case '--no-websockets':
        args.enableWebsockets = false;
        break;
      case '--no-https':
        args.enableHttps = false;
        break;
      case '--cert-path':
        args.certPath = nextArg;
        i++;
        break;
      case '--key-path':
        args.keyPath = nextArg;
        i++;
        break;
      case '--insecure':
        args.insecure = true;
        break;

        // Storage Configuration
      case '--db-path':
        args.dbPath = nextArg;
        i++;
        break;

      case '--no-fts':
        args.enableFts = false;
        break;

        // Capture Configuration
      case '--no-capture-headers':
        args.captureHeaders = false;
        break;
      case '--no-capture-body':
        args.captureBody = false;
        break;
      case '--max-body-size':
        args.maxBodySize = this.parseNumber(nextArg, 'max-body-size');
        i++;
        break;
      case '--no-capture-websocket-messages':
        args.captureWebsocketMessages = false;
        break;

        // Auto-start & Health Configuration
      case '--no-auto-start':
        args.autoStart = false;
        break;
      case '--no-auto-restart':
        args.autoRestart = false;
        break;
      case '--health-check-interval':
        args.healthCheckInterval = this.parseNumber(nextArg, 'health-check-interval');
        i++;
        break;

        // General Options
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--version':
      case '-v':
        args.version = true;
        break;

      default:
        if (arg.startsWith('--')) {
          throw new Error(`Unknown argument: ${arg}`);
        }
        break;
      }
    }

    return args;
  }

  private static parseNumber(value: string, argName: string): number {
    if (!value) {
      throw new Error(`Missing value for --${argName}`);
    }

    const num = parseInt(value, 10);
    if (isNaN(num)) {
      throw new Error(`Invalid number for --${argName}: ${value}`);
    }

    return num;
  }

  static generateHelp(): string {
    return `
MCP Proxy Traffic Server

USAGE:
  npm start -- [OPTIONS]

PROXY OPTIONS:
  --port <number>              HTTP proxy port (default: 8080)
  --https-port <number>        HTTPS proxy port (enables HTTPS when set)
  --no-websockets              Disable WebSocket capture (default: enabled)
  --no-https                   Disable HTTPS proxy (default: enabled)
  --cert-path <path>           SSL certificate path (default: ./certs/ca-cert.pem)
  --key-path <path>            SSL private key path (default: ./certs/ca-key.pem)
  --insecure                   Ignore HTTPS certificate errors (default: false)

STORAGE OPTIONS:
  --db-path <path>             SQLite database path (default: ./traffic.db)
  --no-fts                     Disable full-text search (default: enabled)

CAPTURE OPTIONS:
  --no-capture-headers         Don't capture headers (default: enabled)
  --no-capture-body            Don't capture bodies (default: enabled)
  --max-body-size <bytes>      Maximum body size to capture (default: 1048576)
  --no-capture-websocket-messages Don't capture WebSocket messages (default: enabled)

AUTO-START & HEALTH OPTIONS:
  --no-auto-start              Don't auto-start proxy (default: enabled)
  --no-auto-restart            Don't auto-restart on failure (default: enabled)
  --health-check-interval <s>  Health check interval in seconds (default: 30)

GENERAL OPTIONS:
  --help, -h                   Show this help message
  --version, -v                Show version information

EXAMPLES:
  npm start                                    # Use all defaults
  npm start -- --port 9090                    # Custom port
  npm start -- --no-auto-start                # Manual start
  npm start -- --db-path ./test.db            # Test configuration
  npm start -- --no-capture-body              # Minimal capture
  npm start -- --https-port 8443 --cert-path ./cert.pem --key-path ./key.pem  # HTTPS setup
  npm start -- --no-websockets --no-https     # HTTP only, no WebSockets
  npm start -- --insecure                     # Ignore SSL certificate errors
`;
  }
}
