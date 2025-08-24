# Network Capture MCP

An MCP (Model Context Protocol) server that provides HTTP(S) and WebSocket network capture and analysis tools using mockttp.

> **What is MCP?** The Model Context Protocol (MCP) is a standard that allows AI agents to access external tools and data sources. This server provides AI agents with the ability to capture, analyze, and query network traffic from your applications using natural language.

## Table of Contents

### Getting Started
- [Why Use This?](#why-use-this)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)

### Configuration & Setup
- [How to Configure Your Applications](#how-to-configure-your-applications)
- [Adding to AI Agents](#adding-to-ai-agents)
- [Basic Configuration](#basic-configuration)
- [Advanced Configuration Options](#advanced-configuration-options)

### Usage & Examples
- [Real-World Examples](#real-world-examples)
- [Common Issues & Solutions](#common-issues--solutions)
- [Performance & Resource Usage](#performance--resource-usage)

### API Reference
- [Available MCP Tools](#available-mcp-tools)
- [Tool Parameters](#tool-parameters)
- [Response Formats](#response-formats)

### Development
- [Development Setup](#development-setup)
- [Testing](#testing)
- [Contributing](#contributing)

### Reference
- [CLI Options](#cli-options)
- [Configuration Examples](#configuration-examples)
- [Troubleshooting](#troubleshooting)

## Why Use This?

### For AI-Assisted Development & Debugging
- **Natural Language Queries**: Ask your AI "What API calls failed today?" or "Which endpoints are slowest?"
- **AI-Assisted Debugging**: Let AI analyze request/response patterns, headers, and payloads to identify root causes of bugs and integration issues
- **Performance Analysis**: AI finds slow endpoints and provides optimization recommendations
- **Error Investigation**: AI analyzes failed requests and error patterns with detailed context
- **Automated Analysis**: AI detects traffic patterns and anomalies automatically
- **Smart Recommendations**: Get actionable insights about your traffic and performance issues
- **Usage Analytics**: AI helps you understand how your app uses external APIs and services
- **Continuous Monitoring**: AI watches your traffic and alerts you to problems

### Real-World Use Cases
- **API Integration**: Debug third-party API issues (Stripe, GitHub, AWS, etc.)
- **Performance Testing**: Analyze response times, bottlenecks, and optimization opportunities
- **Security Auditing**: Detect potential security threats

## Prerequisites

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **npm** - Included with Node.js
- **AI Agent with MCP Support** - Such as Claude Desktop, or custom MCP client
- **Applications to Monitor** - The apps/services you want to capture traffic from

### Compatibility
- **Operating Systems**: macOS, Linux, Windows
- **AI Agents**: Claude Desktop, custom MCP clients
- **Applications**: Any app that can use HTTP/HTTPS proxy (most web apps, APIs, mobile apps)

## Quick Start

### 1. Install and Start
```bash
git clone https://github.com/theinfinitereality/network-capture-mcp
cd network-capture-mcp
npm install
```

### 2. Configure Your AI Agent
Add to your Claude Desktop config (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "netcap": {
      "command": "npx",
      "args": ["tsx", "/full/path/to/network-capture-mcp/src/index.ts"]
    }
  }
}
```

### 3. Configure Your App
Point your application to use proxy: `http://localhost:8080`

### 4. Generate Traffic
Use your application normally - all traffic is now captured!

### 5. Ask Your AI Agent
```
"Show me all the API requests from the last 10 minutes"
"Analyze traffic patterns and find any issues"
"What endpoints are responding slowly?"
```

**That's it!** Your AI agent can now analyze your application's network traffic.

## How to Configure Your Applications

### Method 1: Environment Variables (Easiest)
```bash
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080
your-application
```

### Method 2: Application-Specific Configuration

#### Node.js/JavaScript
```javascript
// For axios
const axios = require('axios');
axios.defaults.proxy = { host: 'localhost', port: 8080 };

// For fetch (Node.js with proxy-agent)
const { ProxyAgent } = require('proxy-agent');
const agent = new ProxyAgent('http://localhost:8080');
fetch(url, { agent });

// For native fetch in Node.js 18+
fetch(url, {
  dispatcher: new ProxyAgent('http://localhost:8080')
});
```

#### Python
```python
import requests

# Configure proxy for requests
proxies = {
    'http': 'http://localhost:8080',
    'https': 'http://localhost:8080'
}
response = requests.get('https://api.example.com', proxies=proxies)
```

#### curl
```bash
curl --proxy http://localhost:8080 https://api.example.com
```

#### React Development Server
```json
// package.json
{
  "name": "my-react-app",
  "proxy": "http://localhost:8080"
}
```

### Method 3: Browser Development
For browser-based applications, configure your development server proxy settings or use browser proxy configuration for testing.

## Common Issues & Solutions

### "Port 8080 already in use"
```bash
# Use a different port
npm start -- --port 9090
```

### "Permission denied" when writing database
```bash
# Check directory permissions
chmod 755 .
# Or use a different location
npm start -- --db-path ~/traffic.db
```

### "tsx not found"
```bash
# Install tsx globally
npm install -g tsx
# Or use npx (recommended)
npx tsx src/index.ts
```

### AI Agent can't connect to MCP server
1. **Check the path** in your MCP config is absolute (not relative)
2. **Ensure Node.js 18+** is installed: `node --version`
3. **Check console output** for error details when the MCP server starts
4. **Check file permissions** on the project directory

### No traffic being captured
1. **Verify proxy configuration**: Ensure your app is using `http://localhost:8080`
2. **Check proxy status**: Ask AI agent "What's the proxy status?"
3. **Test with curl**: `curl --proxy http://localhost:8080 https://httpbin.org/get`
4. **Check for HTTPS issues**: Some apps need certificate trust setup

### HTTPS/SSL Certificate Issues
```bash
# Regenerate certificates if needed
npm run generate-certs

# Or disable HTTPS temporarily for testing
npm start -- --no-https
```

## Performance & Resource Usage

### System Impact
- **Memory Usage**: ~20-50MB for typical usage (1000-10000 requests)
- **CPU Impact**: Minimal (<1% for most applications)
- **Disk Space**: ~1MB per 1000 HTTP requests (configurable retention)
- **Network Latency**: <5ms additional latency per request

### Recommended Limits
- **Development**: No limits needed - capture everything
- **Testing**: Up to 100,000 requests (default limit)

> **Important**: This tool is designed for development and testing only. Do not use in production environments.

### Storage Management
```bash
# Check current storage usage
# Ask your AI: "How much storage is the traffic database using?"

# Clean up old data
# Ask your AI: "Clear netcap logs older than 3 days"

# Optimize database
# Ask your AI: "Optimize the netcap database"
```

## Installation

```bash
npm install
```

## Usage

```bash
# Start the MCP server
npm start

# Or run in development mode
npm run dev
```

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

<details>
<summary><strong>Advanced Configuration Options</strong></summary>

### Complete Configuration Example

```bash
npm start -- \
  --port 8080 \
  --https-port 8443 \
  --db-path ./traffic.db \
  --max-body-size 1048576 \
  --health-check-interval 30
```

### Available Arguments

#### Proxy Configuration
```bash
--port <number>              # HTTP proxy port (default: 8080)
--https-port <number>        # HTTPS proxy port (optional)
--no-websockets              # Disable WebSocket capture (default: enabled)
--no-https                   # Disable HTTPS proxy (default: enabled)
--cert-path <path>           # SSL certificate path
--key-path <path>            # SSL private key path
```

#### Storage Configuration
```bash
--db-path <path>             # SQLite database path (default: ./traffic.db)
--no-fts                     # Disable full-text search (default: enabled)
```

#### Capture Configuration
```bash
--no-capture-headers         # Don't capture headers (default: enabled)
--no-capture-body            # Don't capture bodies (default: enabled)
--max-body-size <bytes>      # Maximum body size to capture (default: 1048576)
--no-capture-websocket-messages # Don't capture WebSocket messages (default: enabled)
```

#### Auto-Start & Health Configuration
```bash
--no-auto-start              # Don't auto-start proxy (default: enabled)
--no-auto-restart            # Don't auto-restart on failure (default: enabled)
--health-check-interval <s>  # Health check interval in seconds (default: 30)
```

#### General Options
```bash
--help                       # Show help message
--version                    # Show version information
```

### Configuration Examples

```bash
# Development setup
npm start -- --port 8080

# HTTPS setup for development
npm start -- --port 8080 --https-port 8443 --cert-path ./certs/cert.pem --key-path ./certs/key.pem

# Minimal capture for performance testing
npm start -- --no-capture-body --no-capture-websocket-messages

# Testing setup with custom database
npm start -- --db-path ./test-traffic.db --no-auto-start --health-check-interval 10
```

### Help System

```bash
# Get complete help information
npm start -- --help

# Get version information
npm start -- --version
```

### Available CLI Options

The proxy server uses a simplified CLI interface with sensible defaults. Most features are enabled by default and can be disabled with `--no-` flags:

#### **Proxy Options**
- `--port <number>` - HTTP proxy port (default: 8080)
- `--https-port <number>` - HTTPS proxy port (enables HTTPS when set)
- `--no-websockets` - Disable WebSocket capture (default: enabled)
- `--no-https` - Disable HTTPS proxy (default: enabled)
- `--cert-path <path>` - SSL certificate path (default: ./certs/ca-cert.pem)
- `--key-path <path>` - SSL private key path (default: ./certs/ca-key.pem)

#### **Storage Options**
- `--db-path <path>` - SQLite database path (default: ./traffic.db)
- `--no-fts` - Disable full-text search (default: enabled)

#### **Capture Options**
- `--no-capture-headers` - Don't capture headers (default: enabled)
- `--no-capture-body` - Don't capture bodies (default: enabled)
- `--max-body-size <bytes>` - Maximum body size to capture (default: 1MB)
- `--no-capture-websocket-messages` - Don't capture WebSocket messages (default: enabled)

#### **Auto-Start & Health Options**
- `--no-auto-start` - Don't auto-start proxy (default: enabled)
- `--no-auto-restart` - Don't auto-restart on failure (default: enabled)
- `--health-check-interval <seconds>` - Health check interval (default: 30)

#### **General Options**
- `--help`, `-h` - Show help message
- `--version`, `-v` - Show version information

#### **Examples**
```bash
# Use all defaults
npm start

# Custom port
npm start -- --port 9090

# Minimal capture for performance testing
npm start -- --no-capture-body

# HTTP only, no WebSockets
npm start -- --no-websockets --no-https

# Custom database location
npm start -- --db-path ./data/traffic.db
```

</details>

## Adding to AI Agents

To use this MCP server with AI agents, add it to your agent's MCP configuration:

### Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "netcap": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/network-capture-mcp/src/index.ts"
      ]
    }
  }
}
```

### With Custom Configuration

```json
{
  "mcpServers": {
    "netcap": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/network-capture-mcp/src/index.ts",
        "--port", "9090",
        "--db-path", "./custom-traffic.db"
      ]
    }
  }
}
```

### Combined with Other MCP Servers

Example showing how to use the proxy server alongside other MCP servers like Playwright:

```json
{
  "mcpServers": {
    "netcap": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/network-capture-mcp/src/index.ts",
        "--port", "8080"
      ]
    },
    "playwright": {
      "command": "npx",
      "args": [
        "@playwright/mcp@latest",
        "--vision",
        "--ignore-https-errors",
        "--proxy-server",
        "localhost:8080"
      ]
    }
  }
}
```

### Development Setup

For development, you can use the TypeScript source directly:

```json
{
  "mcpServers": {
    "netcap-dev": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/network-capture-mcp/src/index.ts",
        "--port", "8080",
        "--db-path", "./dev-traffic.db"
      ]
    }
  }
}
```

### Configuration Examples by Use Case

#### Web Development & API Testing
```json
{
  "mcpServers": {
    "proxy-traffic": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/network-capture-mcp/src/index.ts",
        "--port", "8080",
        "--max-body-size", "2097152"
      ]
    }
  }
}
```

#### Performance Testing
```json
{
  "mcpServers": {
    "proxy-traffic": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/network-capture-mcp/src/index.ts",
        "--port", "8080",
        "--no-capture-body",
        "--health-check-interval", "10"
      ]
    }
  }
}
```

### Using with the Proxy

Once configured, the AI agent will have access to all MCP tools. The proxy server starts automatically, so you can immediately:

1. **Configure your applications** to use `localhost:8080` as proxy
2. **Generate traffic** by using your applications normally
3. **Ask the AI agent** to analyze the captured traffic:

```
"Show me all failed API requests from the last hour"
"What's the average response time for requests to api.example.com?"
"Find all requests that contain authentication headers"
"Analyze traffic patterns and show me any anomalies"
"Generate a comprehensive traffic report for the last 24 hours"
"Export all traffic logs to CSV format"
"Clear all traffic logs older than 2 days"
"Show me WebSocket connections with high message rates"
"Find endpoints with slow response times"
"Detect any unusual user agents or bot traffic"
```

<details>
<summary><strong>Technical Architecture & Advanced Features</strong></summary>

## Architecture

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

The proxy server acts as a **transparent middleman** between your applications and their target servers:

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

- **Request/Response Headers** - Complete header information
- **Request/Response Bodies** - Full payload data (configurable size limits)
- **Response Times** - Performance metrics for each request
- **Error Conditions** - Failed requests and error responses
- **WebSocket Messages** - Real-time message content and timing
- **Connection Metadata** - Client IPs, user agents, protocols

## Storage Architecture

### Database File Creation

The SQLite database files are **automatically created** when the application runs - they are not included in the source code repository:

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

**Default Location:**
- Database files are created in the project root directory
- Use `--db-path ./data/traffic.db` to store in a custom location
- Directory is automatically created if it doesn't exist

### SSL Certificate Auto-Generation

SSL certificates are **automatically generated** on install and excluded from git commits for security:

```
certs/
├── ca-cert.pem  # Auto-generated CA certificate
└── ca-key.pem   # Auto-generated private key
```

**Key Points:**
- **Auto-generation** - Certificates created during `npm install`
- **Security** - Certificates are excluded from version control
- **Development Ready** - Works out-of-the-box for HTTPS proxy
- **Regeneration** - Run `npm run generate-certs` to create new certificates

**Certificate Details:**
- **Type**: Self-signed CA certificate for development
- **Validity**: 2 years from generation date
- **Algorithm**: RSA 2048-bit encryption
- **Usage**: HTTPS proxy interception and WebSocket secure connections

**Browser Trust Setup:**
To avoid SSL warnings in your browser, import the generated certificate:

1. **Chrome**: Settings → Privacy & Security → Security → Manage Certificates → Authorities → Import
2. **Firefox**: Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import
3. **Safari**: Double-click certificate file → Keychain Access → Trust → Always Trust

**Custom Certificates:**
Use your own certificates with command line options:
```bash
npm start -- --cert-path ./my-cert.pem --key-path ./my-key.pem
```

### Separate Tables for HTTP and WebSocket Traffic

HTTP and WebSocket traffic are stored in **separate database tables**, optimized for their different data structures and query patterns:

#### HTTP Traffic Storage
```sql
-- Stores comprehensive HTTP/HTTPS request and response data
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

    -- Request headers and payload
    request_headers TEXT,        -- Complete headers (JSON)
    request_raw_headers TEXT,    -- Raw headers array (JSON)
    request_body TEXT,           -- Request payload as text (UTF-8 or base64 for binary)
    request_size INTEGER,

    -- Parsed request data
    content_type TEXT,           -- Request MIME type (Content-Type)
    content_length INTEGER,      -- Request Content-Length
    user_agent TEXT,             -- User-Agent header
    referer TEXT,                -- Referer header
    origin TEXT,                 -- Origin header
    authorization_type TEXT,     -- Auth type (Basic, Bearer, etc.)
    query_params TEXT,           -- Parsed query parameters (JSON)
    form_data TEXT,              -- Parsed form data (JSON)
    json_body TEXT,              -- Parsed JSON body (JSON)
    request_cookies TEXT,        -- Request cookies (JSON)

    -- Response data
    status_code INTEGER,         -- HTTP status (200, 404, 500, etc.)
    status_message TEXT,         -- Status message (OK, Not Found, etc.)
    response_headers TEXT,       -- Complete response headers (JSON)
    response_raw_headers TEXT,   -- Raw response headers array (JSON)
    response_body TEXT,          -- Response payload as text (UTF-8 or base64 for binary)
    response_size INTEGER,
    response_time INTEGER,       -- Total response time (milliseconds)

    -- Parsed response data
    response_content_type TEXT,  -- Response MIME type
    response_encoding TEXT,      -- Response encoding (gzip, deflate)
    response_cookies TEXT,       -- Set-Cookie headers (JSON)
    etag TEXT,                   -- ETag header
    last_modified TEXT,          -- Last-Modified header
    location TEXT,               -- Location header (redirects)
    cache_control TEXT,          -- Cache-Control header

    -- Network metadata
    client_ip TEXT,              -- Client IP address
    destination TEXT,            -- Target server
    server_ip TEXT,              -- Resolved server IP
    connection_reused BOOLEAN,   -- HTTP keep-alive usage
    tls_version TEXT,            -- TLS version (1.2, 1.3, etc.)
    cipher_suite TEXT,           -- TLS cipher suite

    -- Performance timing
    dns_lookup_time INTEGER,     -- DNS resolution time (ms)
    tcp_connect_time INTEGER,    -- TCP connection time (ms)
    tls_handshake_time INTEGER,  -- TLS handshake time (ms)
    first_byte_time INTEGER,     -- Time to first byte (ms)

    -- Error handling
    error_message TEXT,          -- Error description
    error_code TEXT,             -- Error code

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
    established_at INTEGER,
    closed_at INTEGER,
    close_code INTEGER,
    close_reason TEXT,
    -- ... connection-specific fields
);

-- Stores individual WebSocket messages
CREATE TABLE websocket_messages (
    id TEXT PRIMARY KEY,
    connection_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    direction TEXT NOT NULL,     -- 'inbound' or 'outbound'
    message_type TEXT NOT NULL,  -- 'text', 'binary', 'ping', 'pong'
    data TEXT,                   -- Message data as text (UTF-8 or base64 for binary)
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

**Flexible Data Models:**
- **HTTP**: Request-response pairs (1:1 relationship)
- **WebSocket**: Connection with multiple messages (1:many relationship)
- **Different lifecycles**: HTTP transactions vs persistent WebSocket connections

### Query Examples

```typescript
// Query only HTTP traffic
const httpRequests = await mcpClient.callTool("query_traffic", {
  filters: { protocol: "http" }
});

// Query only WebSocket traffic
const wsConnections = await mcpClient.callTool("query_traffic", {
  filters: { protocol: "ws" }
});

// Query both types together (when needed)
const allTraffic = await mcpClient.callTool("query_traffic", {
  // No protocol filter = both types
});
```

### Storage Management by Type

```typescript
// Clear only HTTP logs
await mcpClient.callTool("clear_logs_by_filter", {
  filters: { protocol: "http" }
});

// Clear only WebSocket logs
await mcpClient.callTool("clear_logs_by_filter", {
  filters: { protocol: "ws" }
});

// Get statistics by type
const stats = await mcpClient.callTool("get_traffic_stats");
// Returns separate counts for HTTP requests and WebSocket connections/messages
```

## Auto-Start & Health Monitoring

### Auto-Start Features

The proxy server **starts automatically** when the MCP server initializes, making it ready to capture traffic immediately:

```typescript
// Default behavior - proxy starts automatically
const mcpServer = new ProxyTrafficMcpServer();
// Proxy is now running on default port 8080

// Disable auto-start if needed
await mcpClient.callTool("disable_auto_start");
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

## Log Management & Storage

### Clear Traffic Logs

Comprehensive log management tools for privacy, storage optimization, and data lifecycle management:

```typescript
// Clear all traffic data
await mcpClient.callTool("clear_all_logs", {
  confirm: true,
  preserveSchema: true // Keep database structure
});

// Clear logs from specific time period
await mcpClient.callTool("clear_logs_by_timerange", {
  startDate: "2024-01-01T00:00:00Z",
  endDate: "2024-01-07T23:59:59Z"
});

// Clear logs matching specific criteria
await mcpClient.callTool("clear_logs_by_filter", {
  filters: {
    host: "api.example.com",
    method: "POST",
    statusCode: 500
  }
});
```

### Storage Management

Monitor and optimize database storage:

```typescript
// Get storage information
{
  "databaseSize": "45.2 MB",
  "totalEntries": 15420,
  "httpRequests": 12800,
  "webSocketConnections": 85,
  "webSocketMessages": 2535,
  "oldestEntry": "2024-01-01T08:30:00Z",
  "newestEntry": "2024-01-15T14:22:00Z",
  "storageLocation": "./traffic.db"
}

// Cleanup old logs automatically
await mcpClient.callTool("cleanup_old_logs", {
  retentionDays: 7, // Keep last 7 days
  dryRun: false     // Actually delete (true = preview only)
});
```

### Database Optimization

Keep the database performant and compact:

```typescript
// Vacuum database to reclaim space
await mcpClient.callTool("vacuum_database");
// Result: "Database optimized. Reclaimed 12.3 MB of space."

// Automatic optimization triggers
- After clearing large amounts of data
- When database size exceeds thresholds
- During scheduled maintenance windows
```

**Log Management Features:**
- **Selective Clearing** - Clear by time range, host, method, status code
- **Safety Confirmations** - Prevent accidental data loss
- **Storage Analytics** - Monitor database size and entry counts
- **Performance Optimization** - Automatic database vacuuming
- **Retention Policies** - Automatic cleanup of old data
- **Space Reclamation** - Optimize storage after deletions

**Use Cases:**
- **Privacy Compliance** - Clear sensitive data after testing
- **Storage Management** - Prevent database from growing too large
- **Performance Optimization** - Remove old data to maintain query speed
- **Development Workflow** - Clear logs between test sessions
- **Compliance Requirements** - Implement data retention policies

## MCP Tools

### Proxy Management
- `start_proxy` - Manually start the mockttp proxy server
- `stop_proxy` - Stop the proxy server
- `restart_proxy` - Restart proxy with optional configuration updates
- `get_proxy_status` - Get current proxy status and statistics

### Auto-Start & Health Management
- `configure_auto_start` - Configure automatic proxy startup settings
- `get_auto_start_status` - Check auto-start configuration
- `get_health_status` - Get detailed health metrics and status
- `validate_config` - Validate proxy configuration before applying
- `reset_to_defaults` - Reset configuration to safe defaults
- `get_ca_certificate` - Get CA certificate for HTTPS interception

### Traffic Querying
- `query_traffic` - Query HTTP and WebSocket traffic with filters
- `get_request_details` - Get detailed information about a specific request
- `search_traffic` - Search traffic by content
- `get_traffic_stats` - Get aggregated traffic statistics and analytics

### Log Management
- `clear_all_logs` - Clear all captured traffic data
- `clear_logs_by_timerange` - Clear logs within a specific time period
- `clear_logs_by_filter` - Clear logs matching specific criteria (host, method, etc.)
- `get_storage_info` - Get database size and storage statistics
- `cleanup_old_logs` - Remove logs older than specified retention period
- `vacuum_database` - Optimize database storage and reclaim space

### Analysis & Export
- `analyze_traffic_patterns` - Detect traffic anomalies and patterns (frequent endpoints, error spikes, slow responses, WebSocket bursts, unusual user agents)
- `export_traffic_logs` - Export logs in various formats (JSON, CSV, HAR)
- `generate_traffic_report` - Generate comprehensive analysis reports with statistics, top endpoints, and recommendations

## Traffic Analysis Features

### Pattern Detection

The analysis tools automatically detect various traffic patterns and anomalies:

#### **Frequent Endpoint Analysis**
- Identifies endpoints receiving unusually high traffic volumes
- Calculates thresholds based on average requests per endpoint
- Provides severity levels (low/medium/high) based on traffic volume
- Includes response time and error rate analysis for each endpoint

#### **Error Spike Detection**
- Monitors error rates in 5-minute time intervals
- Detects sudden increases in 4xx/5xx responses
- Compares against baseline error rates to identify anomalies
- Shows affected endpoints and time ranges for investigation

#### **Slow Response Analysis**
- Analyzes response times across all endpoints
- Calculates global statistics (median, P95, average)
- Identifies endpoints with consistently slow performance
- Flags endpoints where ≥10% of requests exceed performance thresholds

#### **WebSocket Burst Detection**
- Monitors message rates for WebSocket connections
- Detects burst intervals with high message frequency
- Compares against baseline message rates
- Identifies connections with abnormal communication patterns

#### **Unusual User Agent Detection**
- Analyzes user agent patterns using pattern matching
- Scores user agents based on suspicious characteristics:
  - Bot/crawler patterns
  - Automated tools and scripts
  - Non-browser user agents
  - High request volumes from single agents
  - Rapid request rates
- Reports potentially suspicious or automated traffic

### Traffic Reports

Comprehensive reports include:

```typescript
{
  "generatedAt": "2024-01-15T10:30:00Z",
  "timeRange": {
    "start": "2024-01-14T10:30:00Z",
    "end": "2024-01-15T10:30:00Z"
  },
  "summary": {
    "totalRequests": 15420,
    "totalWebSocketConnections": 85,
    "totalWebSocketMessages": 2535,
    "uniqueHosts": 12,
    "errorRate": 3.2,
    "averageResponseTime": 245
  },
  "topEndpoints": [
    {
      "url": "/api/users",
      "count": 1250,
      "averageResponseTime": 180,
      "errorRate": 1.2
    }
  ],
  "patterns": [
    {
      "type": "frequent_endpoint",
      "description": "Endpoint GET /api/popular received 500 requests (32.4% of total traffic)",
      "severity": "high",
      "count": 500
    }
  ],
  "recommendations": [
    "High error rate detected. Consider investigating failing endpoints.",
    "2 high-severity patterns detected. Immediate attention recommended."
  ]
}
```

### Export Capabilities

Export captured traffic in multiple formats:

- **JSON**: Complete traffic data with full metadata
- **CSV**: Tabular format for spreadsheet analysis
- **HAR**: HTTP Archive format for browser dev tools

</details>

<details>
<summary><strong>Development Guide</strong></summary>

## Development

```bash
# Install dependencies
npm install

# Run in development mode with auto-reload
npm run dev

# Run directly with tsx (no build required)
npm start

# Run tests
npm test

# Lint code
npm run lint
```

### No Build Process Required

This project uses **tsx** to run TypeScript directly without a build step:

- **Faster development** - No compilation wait time
- **Simpler workflow** - Edit TypeScript, run immediately
- **Auto-reload** - Use `npm run dev` for automatic restarts
- **Direct execution** - TypeScript files run natively

### Development Workflow

1. **Edit TypeScript files** in `src/`
2. **Run with tsx**: `npm start` or `npm run dev`
3. **No build step needed** - tsx handles TypeScript compilation on-the-fly

</details>

## Available MCP Tools

Network Capture MCP provides the following tools for AI agents:

### Proxy Management
- **`get_proxy_status`** - Get current proxy server status and health
- **`start_proxy`** - Start the proxy server with configuration options
- **`stop_proxy`** - Stop the proxy server
- **`restart_proxy`** - Restart proxy with optional configuration changes

### Traffic Querying
- **`query_traffic`** - Query HTTP and WebSocket traffic with filters and pagination
- **`get_request_details`** - Get detailed information for a specific request
- **`search_traffic`** - Search through traffic content using full-text search
- **`get_websocket_messages`** - Get messages for a specific WebSocket connection
- **`get_traffic_stats`** - Get comprehensive traffic statistics and analytics

### Auto-Start & Health Management
- **`configure_auto_start`** - Configure automatic proxy startup settings
- **`get_auto_start_status`** - Check auto-start configuration
- **`get_health_status`** - Get detailed health metrics and status
- **`validate_config`** - Validate proxy configuration before applying
- **`reset_to_defaults`** - Reset configuration to safe defaults
- **`get_ca_certificate`** - Get CA certificate for HTTPS interception

### Data Management
- **`clear_all_logs`** - Clear all captured traffic data
- **`clear_logs_by_timerange`** - Clear logs within a specific time range
- **`clear_logs_by_filter`** - Clear logs matching specific criteria
- **`cleanup_old_logs`** - Clean up old logs by retention days
- **`vacuum_database`** - Optimize database storage and reclaim space
- **`get_storage_info`** - Get database storage information and statistics
- **`export_traffic_logs`** - Export traffic data in various formats (JSON, CSV, HAR)

### Analysis & Insights
- **`analyze_traffic_patterns`** - Analyze traffic patterns and detect anomalies
- **`generate_traffic_report`** - Generate comprehensive traffic analysis reports

## Tool Parameters

### Proxy Management Parameters

The `start_proxy` tool supports these configuration parameters:

- **`port`** (number) - HTTP proxy port (1-65535, default: 8080)
- **`httpsPort`** (number) - HTTPS proxy port (optional, enables HTTPS when set)
- **`enableWebSockets`** (boolean) - Enable WebSocket capture (default: true)
- **`enableHTTPS`** (boolean) - Enable HTTPS proxy (default: true)
- **`ignoreHostHttpsErrors`** (boolean) - Ignore SSL certificate errors (default: false)
- **`captureOptions`** (object) - Optional capture configuration
  - **`captureHeaders`** (boolean) - Capture headers (default: true)
  - **`captureBody`** (boolean) - Capture body content (default: true)
  - **`maxBodySize`** (number) - Maximum body size in bytes (default: 1MB)
  - **`captureWebSocketMessages`** (boolean) - Capture WebSocket messages (default: true)

Example usage:
```json
{
  "port": 8080,
  "enableHTTPS": true,
  "ignoreHostHttpsErrors": true,
  "captureOptions": {
    "captureBody": true,
    "maxBodySize": 512000
  }
}
```

### Common Parameters

Most tools support these common parameters:

- **`limit`** (number) - Maximum results to return (1-1000, default: 100)
- **`offset`** (number) - Number of results to skip for pagination (default: 0)
- **`sortBy`** (string) - Field to sort by: timestamp, method, url, status, responseTime
- **`sortOrder`** (string) - Sort order: asc (oldest first) or desc (newest first)

### Filter Parameters

Traffic querying tools support these filters:

- **`protocol`** (string) - Filter by protocol: http, https, ws, wss
- **`host`** (string) - Filter by hostname (e.g., "api.example.com")
- **`method`** (string) - HTTP method filter (e.g., "GET", "POST")
- **`statusCode`** (number) - HTTP status code filter (e.g., 200, 404, 500)
- **`startDate`** (string) - Start time filter (ISO 8601 format)
- **`endDate`** (string) - End time filter (ISO 8601 format)

### Search Parameters

The `search_traffic` tool supports:

- **`query`** (string) - Search term or pattern
- **`searchIn`** (array) - Fields to search: url, headers, body, response
- **`caseSensitive`** (boolean) - Case-sensitive search (default: false)
- **`regex`** (boolean) - Treat query as regular expression (default: false)

## Response Formats

All tools return responses in this format:

```json
{
  "success": true,
  "message": "Description of the result",
  "data": {
    // Tool-specific data
  },
  "usage": {
    "nextSteps": ["Suggested next actions"],
    "relatedTools": {
      "tool_name": "Description of related tool"
    }
  }
}
```

### Traffic Entry Format

Traffic entries include comprehensive information:

```json
{
  "id": "uuid",
  "timestamp": "2023-12-01T10:00:00Z",
  "url": "https://api.example.com/endpoint",
  "host": "api.example.com",
  "protocol": "https",
  "type": "http",
  "method": "GET",
  "path": "/endpoint",
  "statusCode": 200,
  "responseTime": 150,
  "requestSize": 1024,
  "responseSize": 2048,
  "contentType": "application/json",
  "userAgent": "Mozilla/5.0...",
  "response": {
    "statusCode": 200,
    "statusMessage": "OK",
    "responseTime": 150
  }
}
```

## Testing

Network Capture MCP includes comprehensive testing tools:

### Automated Testing
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Development Validation Scripts
```bash
# Validate database and MCP tools
npm run dev-validate

# Test database functionality
npm run validate-db:all

# Test MCP tool functionality
npm run test-mcp-tools

# Test protocol filtering
npm run test-protocol-filter
```

### Manual Testing
```bash
# Start server and test with curl
npm start
curl --proxy http://localhost:8080 https://httpbin.org/get

# Test with your AI agent
# Ask: "Show me all traffic from the last 5 minutes"
```

## Contributing

We welcome contributions! Here's how to get started:

### Development Setup
1. **Fork and clone** the repository
2. **Install dependencies**: `npm install`
3. **Run tests**: `npm test`
4. **Start development server**: `npm run dev`

### Making Changes
1. **Create a feature branch**: `git checkout -b feature/your-feature`
2. **Make your changes** with tests
3. **Run validation**: `npm run dev-validate`
4. **Commit with conventional format**: `git commit -m "feat: your feature"`
5. **Push and create PR**: `git push origin feature/your-feature`

### Code Standards
- **TypeScript** for all code
- **Vitest** for testing
- **ESLint** for linting
- **Conventional commits** for commit messages
- **100% test coverage** for new features

### Areas for Contribution
- **Bug fixes** - Fix issues and improve reliability
- **Performance** - Optimize database queries and memory usage
- **Features** - Add new analysis tools and export formats
- **Documentation** - Improve guides and examples
- **Testing** - Add more test cases and validation

## CLI Options

Complete reference for command-line options:

### Proxy Configuration
```bash
--port <number>              # HTTP proxy port (default: 8080)
--https-port <number>        # HTTPS proxy port (optional)
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
--health-check-interval <s>  # Health check interval (default: 30)
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

### Performance Testing Setup
```bash
# HTTPS testing setup
npm start -- --port 8080 --https-port 8443

# High-performance testing
npm start -- --max-body-size 512000 --health-check-interval 60

# Minimal capture for load testing
npm start -- --no-capture-body --no-capture-headers
```

### Testing Setup
```bash
# Testing with isolated database
npm start -- --db-path ./test-traffic.db --no-auto-start

# Custom health check interval
npm start -- --health-check-interval 10
```

## Troubleshooting

### Common Issues

#### Server Won't Start
```bash
# Check if port is in use
lsof -i :8080

# Try different port
npm start -- --port 9090

# Check permissions
chmod +x src/index.ts
```

#### No Traffic Captured
```bash
# Verify proxy configuration
curl --proxy http://localhost:8080 https://httpbin.org/get

# Check proxy status
# Ask AI: "What's the proxy status?"

# Test with simple request
export HTTP_PROXY=http://localhost:8080
curl https://httpbin.org/get
```

#### Database Issues
```bash
# Check database permissions
ls -la traffic.db*

# Rebuild database
rm traffic.db* && npm start

# Validate database
npm run validate-db:all
```

#### HTTPS/SSL Issues
```bash
# Self-signed certificate errors (common with localhost HTTPS)
# Error: "self-signed certificate" or "certificate verify failed"
npm start -- --insecure

# Or via MCP tool:
# { "port": 8080, "ignoreHostHttpsErrors": true }

# Regenerate certificates
npm run generate-certs

# Disable HTTPS temporarily
npm start -- --no-https

# Check certificate installation
npm run generate-certs
```

#### Performance Issues
```bash
# Reduce capture size
npm start -- --max-body-size 100000

# Disable body capture
npm start -- --no-capture-body

# Check memory usage
# Ask AI: "What's the memory usage?"
```

### Getting Help

1. **Check the logs** - Look for error messages in console output
2. **Run validation** - Use `npm run dev-validate` to check system health
3. **Test with curl** - Verify proxy functionality with simple requests
4. **Check permissions** - Ensure proper file and directory permissions
5. **Update dependencies** - Run `npm update` to get latest versions

### Debug Mode

For troubleshooting, check the console output when starting the MCP server:

```bash
npm start
```

The console output provides information about:
- Proxy startup and configuration
- Certificate generation and installation
- Database operations and queries
- Health checks and auto-restart attempts
- Network traffic capture and processing

## License

MIT
