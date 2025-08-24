# Architecture Overview

This document provides a comprehensive technical overview of Network Capture MCP's architecture, data flow, and internal systems.

## System Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  AI Agent   │───▶│ MCP Server  │───▶│   SQLite    │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
                   ┌─────────────┐    ┌─────────────┐
                   │   Mockttp   │───▶│   Target    │
                   │   Proxy     │    │   Servers   │
                   └─────────────┘    └─────────────┘
                           ▲
                           │
                   ┌─────────────┐
                   │   Client    │
                   │ Applications│
                   └─────────────┘
```

### Components

- **AI Agent**: AI assistant that analyzes traffic using natural language queries
- **MCP Server**: Core orchestrator providing tools for proxy management and traffic analysis
- **SQLite Database**: Local persistent storage for all captured traffic data
- **Mockttp Proxy**: Traffic interception engine that captures HTTP/HTTPS and WebSocket traffic
- **Client Applications**: Your apps/services that generate the traffic to be analyzed
- **Target Servers**: The real APIs, services, and endpoints your applications communicate with

## How It Works

### Normal Traffic Flow (Without Proxy)
```
Your App ────────────▶ api.example.com
Your App ────────────▶ websocket.service.com
Your App ────────────▶ localhost:3000/api
```

### With Proxy Traffic Flow
```
Your App ──▶ Mockttp Proxy ──▶ api.example.com (Target Server)
Your App ──▶ Mockttp Proxy ──▶ websocket.service.com (Target Server)
Your App ──▶ Mockttp Proxy ──▶ localhost:3000/api (Target Server)
                │
                ▼
            SQLite Database
```

### Data Flow Steps

1. **Configure** your application to use the proxy (e.g., `http://localhost:8080`)
2. **Application makes request** through the proxy
3. **Proxy captures** request details (headers, body, timing)
4. **Proxy forwards** request to the actual target server
5. **Target server responds** normally
6. **Proxy captures** response details
7. **Proxy stores** traffic data in SQLite
8. **Proxy returns** response to your application
9. **AI Agent queries** captured data for analysis

## What Gets Captured

### HTTP/HTTPS Traffic
- **Request/Response Headers** - Complete header information
- **Request/Response Bodies** - Full payload data (configurable size limits)
- **Response Times** - Performance metrics for each request
- **Error Conditions** - Failed requests and error responses
- **Connection Metadata** - Client IPs, user agents, protocols
- **Performance Timing** - DNS lookup, TCP connect, TLS handshake times

### WebSocket Traffic
- **Connection Metadata** - Establishment, close events, protocols
- **Message Content** - Real-time message data and timing
- **Connection Lifecycle** - Open, close, error events
- **Message Types** - Text, binary, ping, pong messages

## Storage Architecture

### Database File Creation

The SQLite database files are **automatically created** when the application runs:

```
traffic.db      # Main SQLite database file
traffic.db-shm  # Shared memory file (WAL mode)
traffic.db-wal  # Write-ahead log file (WAL mode)
```

**Key Points:**
- **Auto-creation** - Database files are created on first run
- **WAL Mode** - Uses Write-Ahead Logging for better concurrency
- **Git Ignored** - Database files are excluded from version control
- **Configurable Path** - Use `--db-path` to specify custom location

### Database Schema

#### HTTP Traffic Storage
```sql
CREATE TABLE http_traffic (
    -- Basic request info
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    method TEXT NOT NULL,        -- GET, POST, PUT, DELETE, etc.
    url TEXT NOT NULL,
    host TEXT NOT NULL,
    path TEXT NOT NULL,
    query_string TEXT,           -- Raw query string
    protocol TEXT NOT NULL,      -- 'http' or 'https'

    -- Request data
    request_headers TEXT,        -- Complete headers (JSON)
    request_raw_headers TEXT,    -- Raw headers array (JSON)
    request_body TEXT,           -- Request payload as text
    request_size INTEGER,
    content_type TEXT,           -- Request MIME type
    user_agent TEXT,             -- User-Agent header

    -- Response data
    status_code INTEGER,         -- HTTP status (200, 404, 500, etc.)
    status_message TEXT,         -- Status message (OK, Not Found, etc.)
    response_headers TEXT,       -- Complete response headers (JSON)
    response_raw_headers TEXT,   -- Raw response headers array (JSON)
    response_body TEXT,          -- Response payload as text
    response_size INTEGER,
    response_time INTEGER,       -- Total response time (milliseconds)

    -- Metadata
    client_ip TEXT,              -- Client IP address
    destination TEXT,            -- Target server
    error_message TEXT,          -- Error description

    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);
```

#### WebSocket Traffic Storage
```sql
-- Stores WebSocket connection metadata
CREATE TABLE websocket_connections (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    url TEXT NOT NULL,
    host TEXT NOT NULL,
    protocol TEXT NOT NULL,      -- 'ws' or 'wss'

    -- Request headers
    headers TEXT,                -- Connection upgrade headers (JSON)
    raw_headers TEXT,            -- Raw headers array (JSON)

    -- Response data
    response_status_code INTEGER,
    response_headers TEXT,       -- Server response headers (JSON)

    -- Connection data
    established_at INTEGER,
    closed_at INTEGER,
    close_code INTEGER,
    close_reason TEXT,

    -- Metadata
    client_ip TEXT,
    destination TEXT,

    created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Stores individual WebSocket messages
CREATE TABLE websocket_messages (
    id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    direction TEXT NOT NULL,     -- 'inbound' or 'outbound'
    message_type TEXT NOT NULL,  -- 'text', 'binary', 'ping', 'pong'
    data TEXT,                   -- Message data as text
    size INTEGER,

    FOREIGN KEY (connection_id) REFERENCES websocket_connections(id)
);
```

### Benefits of Separate Tables

**Optimized Schema Design:**
- **HTTP-specific fields**: `method`, `status_code`, `response_time`
- **WebSocket-specific fields**: `connection_id`, `direction`, `message_type`
- **No unused columns** or null values
- **Appropriate data types** for each traffic type

**Efficient Querying:**
- **Targeted queries**: Query only the traffic type you need
- **Optimized indexes**: Separate indexes for HTTP methods vs WebSocket directions
- **Type-specific analytics**: HTTP response times vs WebSocket message rates
- **Filtered operations**: Clear only HTTP logs or only WebSocket logs

## SSL Certificate Management

### Auto-Generated Certificates

SSL certificates are **automatically generated** during `npm install`:

```
certs/
├── ca-cert.pem  # Auto-generated CA certificate
└── ca-key.pem   # Auto-generated private key
```

**Certificate Details:**
- **Type**: Self-signed CA certificate for development
- **Validity**: 2 years from generation date
- **Algorithm**: RSA 2048-bit encryption
- **Usage**: HTTPS proxy interception and WebSocket secure connections

### Certificate Trust Setup

To avoid SSL warnings in browsers:

1. **Chrome**: Settings → Privacy & Security → Security → Manage Certificates → Authorities → Import
2. **Firefox**: Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import
3. **Safari**: Double-click certificate file → Keychain Access → Trust → Always Trust

### Custom Certificates

Use your own certificates with command line options:
```bash
npm start -- --cert-path ./my-cert.pem --key-path ./my-key.pem
```

## Auto-Start & Health Monitoring

### Auto-Start Features

The proxy server **starts automatically** when the MCP server initializes:

```typescript
// Default behavior - proxy starts automatically
const mcpServer = new ProxyTrafficMcpServer();
// Proxy is now running on default port 8080
```

**Benefits:**
- **Zero configuration** - Works out of the box
- **Immediate capture** - No manual setup required
- **Consistent behavior** - Always ready when MCP server starts
- **Configurable** - Can be disabled or customized

### Health Monitoring

Continuous monitoring ensures the proxy server stays healthy and responsive:

```typescript
// Health checks run automatically every 30 seconds
{
  "proxyResponsive": true,
  "portAvailable": true,
  "databaseConnected": true,
  "memoryUsage": "45MB",
  "uptime": "2h 15m",
  "lastHealthCheck": "2024-01-15T10:30:00Z"
}
```

**Health Check Features:**
- **Proxy Responsiveness** - Ensures proxy server is accepting connections
- **Port Availability** - Monitors if configured ports are accessible
- **Database Connectivity** - Verifies SQLite database is writable
- **Memory Usage** - Tracks memory consumption and prevents leaks
- **Auto-Restart** - Automatically restarts proxy on failure
- **Health Metrics** - Provides detailed health status and history

### Auto-Restart on Failure

When health checks detect issues, the system automatically attempts recovery:

```typescript
// Failure detection and recovery
1. Health check fails (e.g., proxy becomes unresponsive)
2. System logs the failure and attempts diagnosis
3. Automatic restart with current configuration
4. Validation of restart success
5. Notification to AI agent about recovery status
```

**Recovery Scenarios:**
- **Port conflicts** - Automatically finds alternative ports
- **Proxy crashes** - Restarts with last known good configuration
- **Database issues** - Attempts database repair and reconnection
- **Memory leaks** - Restarts to clear memory and restore performance
- **Configuration errors** - Falls back to default configuration

### Configuration Validation

All proxy configurations are validated before application:

```typescript
// Validation checks
Port ranges (1-65535) and availability
File paths and write permissions
Memory limits and system resources
SSL certificate validity
Network interface availability
Database file accessibility
Configuration value ranges
```

**Validation Features:**
- **Pre-flight checks** - Validates configuration before starting
- **Security validation** - Ensures safe file paths and permissions
- **Network validation** - Checks port availability and conflicts
- **File system validation** - Verifies database and certificate paths
- **Performance validation** - Warns about resource-intensive settings
- **Auto-correction** - Suggests fixes for invalid configurations

## Performance Characteristics

### System Impact
- **Memory Usage**: ~20-50MB for typical usage (1000-10000 requests)
- **CPU Impact**: Minimal (<1% for most applications)
- **Disk Space**: ~1MB per 1000 HTTP requests (configurable retention)
- **Network Latency**: <5ms additional latency per request

### Scalability Limits
- **Development**: No limits needed - capture everything
- **Testing**: Up to 100,000 requests (default limit)
- **Database Size**: Efficiently handles databases up to several GB
- **Concurrent Connections**: Supports hundreds of simultaneous connections

### Performance Optimization

**High-Performance Configuration:**
```bash
npm start -- \
  --no-capture-body \
  --no-capture-headers \
  --health-check-interval 60 \
  --no-fts
```

**Memory-Optimized Configuration:**
```bash
npm start -- \
  --max-body-size 100000 \
  --no-capture-websocket-messages \
  --health-check-interval 60
```

**Storage-Optimized Configuration:**
```bash
npm start -- \
  --no-capture-body \
  --max-body-size 10000 \
  --db-path ./minimal-traffic.db
```

### Database Performance

**Write-Ahead Logging (WAL) Mode:**
- **Better concurrency** - Readers don't block writers
- **Improved performance** - Faster writes and queries
- **Crash recovery** - Automatic recovery from unexpected shutdowns
- **Reduced lock contention** - Multiple readers can access simultaneously

**Full-Text Search (FTS):**
- **Fast content search** - Indexed search across request/response bodies
- **Configurable** - Can be disabled for better write performance
- **Memory efficient** - Uses SQLite's built-in FTS5 engine
- **Real-time indexing** - New content is immediately searchable

## Security Considerations

### Development vs Production

**This tool is designed for development and testing only:**
- **Not for production** - Should never be used in production environments
- **Local development** - Intended for localhost and development networks
- **Testing environments** - Safe for staging and test environments
- **Security testing** - Appropriate for security research and penetration testing

### Data Security

**Sensitive Data Handling:**
- **Request/response bodies** may contain sensitive information
- **Authentication headers** are captured and stored
- **Personal data** in API payloads is stored in local database
- **SSL/TLS traffic** is decrypted and stored in plaintext

**Security Best Practices:**
1. **Use separate databases** for different projects
2. **Regularly clean up** captured traffic data
3. **Be careful with sensitive data** in request/response bodies
4. **Use `--no-capture-body`** when dealing with sensitive information
5. **Secure database files** with appropriate file permissions
6. **Don't commit database files** to version control

### Network Security

**SSL Certificate Handling:**
- **Self-signed certificates** are generated for HTTPS interception
- **Certificate trust** must be manually configured in browsers
- **Man-in-the-middle** - The proxy performs legitimate MITM for analysis
- **Certificate validation** can be disabled with `--insecure` flag

**Network Isolation:**
- **Localhost binding** - Proxy binds to localhost by default
- **No external access** - Not accessible from other machines by default
- **Firewall friendly** - Uses standard HTTP proxy ports
- **No data transmission** - All data stays local

## Troubleshooting Architecture Issues

### Common Architecture Problems

**Database Lock Issues:**
```bash
# Check for database locks
lsof traffic.db*

# Kill processes holding locks
kill -9 <pid>

# Restart with clean database
rm traffic.db* && npm start
```

**Memory Leaks:**
```bash
# Monitor memory usage
# Ask AI: "What's the current memory usage?"

# Restart to clear memory
# Ask AI: "Restart the proxy server"

# Use memory-optimized configuration
npm start -- --max-body-size 100000 --no-capture-websocket-messages
```

**Port Conflicts:**
```bash
# Check what's using the port
lsof -i :8080

# Use different port
npm start -- --port 9090

# Check proxy status
# Ask AI: "What's the proxy status?"
```

### Performance Debugging

**Slow Database Queries:**
```bash
# Optimize database
# Ask AI: "Optimize the netcap database"

# Check database size
# Ask AI: "How much storage is the traffic database using?"

# Clean up old data
# Ask AI: "Clear netcap logs older than 3 days"
```

**High Memory Usage:**
```bash
# Check current usage
# Ask AI: "What's the memory usage?"

# Reduce capture size
npm start -- --max-body-size 50000

# Disable body capture
npm start -- --no-capture-body
```

## See Also

- **[Configuration](configuration.md)** - Complete configuration options
- **[API Reference](api-reference.md)** - MCP tools and parameters
- **[Development](development.md)** - Development and contributing guide
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
