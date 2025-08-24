# Configuration Guide

This guide covers all configuration options for Network Capture MCP, from basic usage to advanced customization.

## Basic Configuration

**Most users can start with defaults:**
```bash
npm start  # Uses port 8080, auto-starts proxy, stores in ./traffic.db
```

**Common customizations:**
```bash
npm start -- --port 9090                    # Different port
npm start -- --db-path ./my-traffic.db      # Custom database location
npm start -- --no-auto-start               # Don't start proxy automatically
```

## Command Line Options

### Proxy Configuration
```bash
--port <number>              # HTTP proxy port (default: 8080)
--https-port <number>        # HTTPS proxy port (optional, enables HTTPS when set)
--no-websockets              # Disable WebSocket capture (default: enabled)
--no-https                   # Disable HTTPS proxy (default: enabled)
--cert-path <path>           # SSL certificate path (default: ./certs/ca-cert.pem)
--key-path <path>            # SSL private key path (default: ./certs/ca-key.pem)
--insecure                   # Ignore HTTPS certificate errors (default: false)
```

### Storage Configuration
```bash
--db-path <path>             # SQLite database path (default: ./traffic.db)
--no-fts                     # Disable full-text search (default: enabled)
```

### Capture Configuration
```bash
--no-capture-headers         # Don't capture headers (default: enabled)
--no-capture-body            # Don't capture bodies (default: enabled)
--max-body-size <bytes>      # Maximum body size to capture (default: 1048576)
--no-capture-websocket-messages # Don't capture WebSocket messages (default: enabled)
```

### Auto-Start & Health Configuration
```bash
--no-auto-start              # Don't auto-start proxy (default: enabled)
--no-auto-restart            # Don't auto-restart on failure (default: enabled)
--health-check-interval <s>  # Health check interval in seconds (default: 30)
```

### General Options
```bash
--help, -h                   # Show help message
--version, -v                # Show version information
```

## Configuration Examples

### Development Setup
```bash
# Basic development
npm start -- --port 8080

# Development with custom database
npm start -- --port 8080 --db-path ./dev-traffic.db

# Development with self-signed certificates (ignore SSL errors)
npm start -- --port 8080 --insecure

# Performance testing setup
npm start -- --no-capture-body --no-capture-websocket-messages
```

### HTTPS Testing Setup
```bash
# HTTPS testing with specific ports
npm start -- --port 8080 --https-port 8443

# HTTPS with custom certificates
npm start -- --port 8080 --https-port 8443 --cert-path ./my-cert.pem --key-path ./my-key.pem

# High-performance testing
npm start -- --max-body-size 512000 --health-check-interval 60
```

### Minimal Capture for Performance Testing
```bash
# Minimal capture for load testing
npm start -- --no-capture-body --no-capture-headers

# HTTP only, no WebSockets
npm start -- --no-websockets --no-https

# Custom health check interval
npm start -- --health-check-interval 10
```

### Testing Setup
```bash
# Testing with isolated database
npm start -- --db-path ./test-traffic.db --no-auto-start

# Custom database location with full-text search disabled
npm start -- --db-path ./data/traffic.db --no-fts
```

## Advanced Configuration

### Complete Configuration Example
```bash
npm start -- \
  --port 8080 \
  --https-port 8443 \
  --db-path ./traffic.db \
  --max-body-size 1048576 \
  --health-check-interval 30 \
  --cert-path ./certs/custom-cert.pem \
  --key-path ./certs/custom-key.pem
```

### Configuration Validation

The server validates all configuration before starting:

- **Port ranges** (1-65535) and availability
- **File paths** and write permissions
- **Memory limits** and system resources
- **SSL certificate** validity
- **Network interface** availability
- **Database file** accessibility

Invalid configurations will show helpful error messages with suggested fixes.

## MCP Client Configuration

For detailed AI agent setup including Claude Desktop configuration, combined MCP server setups, and use case-specific configurations, see **[AI Agent Setup Guide](ai-agent-setup.md)**.

## Configuration by Use Case

### Web Development & API Testing
```bash
npm start -- \
  --port 8080 \
  --max-body-size 2097152 \
  --health-check-interval 30
```

### Performance Testing
```bash
npm start -- \
  --port 8080 \
  --no-capture-body \
  --health-check-interval 10
```

### Security Testing
```bash
npm start -- \
  --port 8080 \
  --https-port 8443 \
  --max-body-size 5242880 \
  --db-path ./security-test-traffic.db
```

For MCP client configuration examples for these use cases, see **[AI Agent Setup Guide](ai-agent-setup.md)**.

## SSL Certificate Configuration

### Auto-Generated Certificates (Default)
Certificates are automatically generated during `npm install`:
```
certs/
├── ca-cert.pem  # Auto-generated CA certificate
└── ca-key.pem   # Auto-generated private key
```

### Custom Certificates
```bash
# Use your own certificates
npm start -- --cert-path ./my-cert.pem --key-path ./my-key.pem

# Generate new certificates
npm run generate-certs
```

### Certificate Trust Setup
To avoid SSL warnings in browsers:

1. **Chrome**: Settings → Privacy & Security → Security → Manage Certificates → Authorities → Import
2. **Firefox**: Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import
3. **Safari**: Double-click certificate file → Keychain Access → Trust → Always Trust

### Development SSL Options
```bash
# Ignore SSL certificate errors (development only)
npm start -- --insecure

# Disable HTTPS temporarily
npm start -- --no-https

# Regenerate certificates if needed
npm run generate-certs
```

## Database Configuration

### Default Database
```bash
# Uses ./traffic.db by default
npm start
```

### Custom Database Location
```bash
# Custom path
npm start -- --db-path ./data/traffic.db

# Temporary database
npm start -- --db-path ./temp-traffic.db

# User home directory
npm start -- --db-path ~/traffic-data/traffic.db
```

### Database Features
```bash
# Enable full-text search (default)
npm start

# Disable full-text search for performance
npm start -- --no-fts
```

## Performance Tuning

### High-Performance Configuration
```bash
npm start -- \
  --no-capture-body \
  --no-capture-headers \
  --health-check-interval 60 \
  --no-fts
```

### Memory-Optimized Configuration
```bash
npm start -- \
  --max-body-size 100000 \
  --no-capture-websocket-messages \
  --health-check-interval 60
```

### Storage-Optimized Configuration
```bash
npm start -- \
  --no-capture-body \
  --max-body-size 10000 \
  --db-path ./minimal-traffic.db
```

## Troubleshooting Configuration

### Validation Errors
```bash
# Get help with configuration
npm start -- --help

# Validate configuration without starting
npm start -- --validate-only  # (if implemented)
```

### Common Configuration Issues

**Port already in use:**
```bash
# Check what's using the port
lsof -i :8080

# Use different port
npm start -- --port 9090
```

**Permission denied:**
```bash
# Check directory permissions
ls -la .

# Use different database location
npm start -- --db-path ~/traffic.db
```

**Certificate issues:**
```bash
# Regenerate certificates
npm run generate-certs

# Use insecure mode for testing
npm start -- --insecure
```

## See Also

- **[Getting Started](getting-started.md)** - Basic setup and installation
- **[AI Agent Setup](ai-agent-setup.md)** - MCP client configuration details
- **[Troubleshooting](troubleshooting.md)** - Solving configuration problems
- **[Architecture](architecture.md)** - Understanding how configuration affects system behavior
