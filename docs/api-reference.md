# API Reference

Complete reference for all Network Capture MCP tools, parameters, and response formats.

## Overview

Network Capture MCP provides tools organized into these categories:

- **[Proxy Management](#proxy-management)** - Start, stop, and configure the proxy server
- **[Traffic Querying](#traffic-querying)** - Query and search captured traffic data
- **[Auto-Start & Health Management](#auto-start--health-management)** - Configure automatic startup and health monitoring
- **[Data Management](#data-management)** - Clear, export, and manage captured data
- **[Analysis & Insights](#analysis--insights)** - Analyze traffic patterns and generate reports

## Response Format

All tools return responses in this standard format:

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

## Common Parameters

Most tools support these common parameters:

- **`limit`** (number) - Maximum results to return (1-1000, default: 100)
- **`offset`** (number) - Number of results to skip for pagination (default: 0)
- **`sortBy`** (string) - Field to sort by: timestamp, method, url, status, responseTime
- **`sortOrder`** (string) - Sort order: asc (oldest first) or desc (newest first)

## Filter Parameters

Traffic querying tools support these filters:

- **`protocol`** (string) - Filter by protocol: http, https, ws, wss
- **`host`** (string) - Filter by hostname (e.g., "api.example.com")
- **`method`** (string) - HTTP method filter (e.g., "GET", "POST")
- **`statusCode`** (number) - HTTP status code filter (e.g., 200, 404, 500)
- **`startDate`** (string) - Start time filter (ISO 8601 format)
- **`endDate`** (string) - End time filter (ISO 8601 format)

## Proxy Management

### get_proxy_status

Get current proxy server status and health information.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "running",
    "port": 8080,
    "httpsPort": 8443,
    "uptime": "2h 15m",
    "requestsProcessed": 1250,
    "activeConnections": 5,
    "memoryUsage": "45MB",
    "lastHealthCheck": "2024-01-15T10:30:00Z"
  }
}
```

### start_proxy

Start the proxy server with configuration options.

**Parameters:**
- **`port`** (number, optional) - HTTP proxy port (1-65535, default: 8080)
- **`httpsPort`** (number, optional) - HTTPS proxy port (enables HTTPS when set)
- **`enableWebSockets`** (boolean, optional) - Enable WebSocket capture (default: true)
- **`enableHTTPS`** (boolean, optional) - Enable HTTPS proxy (default: true)
- **`ignoreHostHttpsErrors`** (boolean, optional) - Ignore SSL certificate errors (default: false)
- **`captureOptions`** (object, optional) - Capture configuration:
  - **`captureHeaders`** (boolean) - Capture headers (default: true)
  - **`captureBody`** (boolean) - Capture body content (default: true)
  - **`maxBodySize`** (number) - Maximum body size in bytes (default: 1MB)
  - **`captureWebSocketMessages`** (boolean) - Capture WebSocket messages (default: true)

**Example:**
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

### stop_proxy

Stop the proxy server.

**Parameters:** None

### restart_proxy

Restart proxy with optional configuration changes.

**Parameters:**
- **`config`** (object, optional) - Configuration changes
- **`preserveData`** (boolean, optional) - Preserve existing traffic data (default: true)

## Traffic Querying

### query_traffic

Query HTTP and WebSocket traffic with filters and pagination.

**Parameters:**
- **`filters`** (object, optional) - Filter criteria:
  - **`protocol`** (string) - http, https, ws, wss
  - **`host`** (string) - Hostname filter
  - **`method`** (string) - HTTP method
  - **`statusCode`** (number) - HTTP status code
  - **`startDate`** (string) - ISO 8601 date-time
  - **`endDate`** (string) - ISO 8601 date-time
- **`limit`** (number, optional) - Max results (1-1000, default: 100)
- **`offset`** (number, optional) - Skip results for pagination (default: 0)
- **`sortBy`** (string, optional) - Sort field (default: timestamp)
- **`sortOrder`** (string, optional) - asc or desc (default: desc)
- **`includeBody`** (boolean, optional) - Include request/response bodies (default: false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "timestamp": "2023-12-01T10:00:00Z",
      "url": "https://api.example.com/users",
      "host": "api.example.com",
      "protocol": "https",
      "method": "GET",
      "path": "/users",
      "statusCode": 200,
      "responseTime": 150,
      "requestSize": 1024,
      "responseSize": 2048,
      "contentType": "application/json",
      "userAgent": "Mozilla/5.0..."
    }
  ],
  "pagination": {
    "total": 1500,
    "hasMore": true,
    "nextOffset": 100
  }
}
```

### get_request_details

Get detailed information about a specific request.

**Parameters:**
- **`requestId`** (string, required) - Request ID from query_traffic results

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "timestamp": "2023-12-01T10:00:00Z",
    "url": "https://api.example.com/users",
    "method": "GET",
    "statusCode": 200,
    "responseTime": 150,
    "requestHeaders": {
      "Authorization": "Bearer token",
      "Content-Type": "application/json"
    },
    "responseHeaders": {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache"
    },
    "requestBody": "request payload",
    "responseBody": "response payload"
  }
}
```

### search_traffic

Search through traffic content using full-text search.

**Parameters:**
- **`query`** (string, required) - Search term or pattern
- **`searchIn`** (array, optional) - Fields to search: url, headers, body, response (default: ["url", "body"])
- **`caseSensitive`** (boolean, optional) - Case-sensitive search (default: false)
- **`regex`** (boolean, optional) - Treat query as regular expression (default: false)
- **`limit`** (number, optional) - Max results (1-1000, default: 100)

**Example:**
```json
{
  "query": "authentication",
  "searchIn": ["headers", "body"],
  "caseSensitive": false,
  "limit": 50
}
```

### get_websocket_messages

Get messages for a specific WebSocket connection.

**Parameters:**
- **`connectionId`** (string, required) - WebSocket connection ID
- **`includeData`** (boolean, optional) - Include message content (default: true)
- **`limit`** (number, optional) - Max messages (1-1000, default: 100)
- **`offset`** (number, optional) - Skip messages for pagination (default: 0)

### get_traffic_stats

Get comprehensive traffic statistics and analytics.

**Parameters:**
- **`timeRange`** (object, optional) - Time range filter:
  - **`start`** (string) - ISO 8601 date-time
  - **`end`** (string) - ISO 8601 date-time

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRequests": 15420,
      "totalWebSocketConnections": 85,
      "totalWebSocketMessages": 2535,
      "uniqueHosts": 12,
      "errorRate": 3.2,
      "averageResponseTime": 245
    },
    "byMethod": {
      "GET": 8500,
      "POST": 4200,
      "PUT": 1800,
      "DELETE": 920
    },
    "byStatus": {
      "2xx": 14200,
      "4xx": 800,
      "5xx": 420
    },
    "topHosts": [
      {
        "host": "api.example.com",
        "count": 5000,
        "averageResponseTime": 180
      }
    ]
  }
}
```

## Auto-Start & Health Management

### configure_auto_start

Configure automatic proxy startup settings.

**Parameters:**
- **`enabled`** (boolean, required) - Enable or disable auto-start
- **`config`** (object, optional) - Default configuration for auto-started proxy

### get_auto_start_status

Check auto-start configuration.

**Parameters:** None

### get_health_status

Get detailed health metrics and status.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "proxyResponsive": true,
    "portAvailable": true,
    "databaseConnected": true,
    "memoryUsage": "45MB",
    "uptime": "2h 15m",
    "lastHealthCheck": "2024-01-15T10:30:00Z",
    "healthScore": 100
  }
}
```

### validate_config

Validate proxy configuration before applying.

**Parameters:**
- **`config`** (object, required) - Configuration to validate

### reset_to_defaults

Reset configuration to safe defaults.

**Parameters:** None

### get_ca_certificate

Get CA certificate for HTTPS interception.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "certificate": "-----BEGIN CERTIFICATE-----\n...",
    "fingerprint": "SHA256:...",
    "validFrom": "2024-01-01T00:00:00Z",
    "validTo": "2026-01-01T00:00:00Z"
  }
}
```

## Data Management

### clear_all_logs

Clear all captured traffic data.

**Parameters:**
- **`confirm`** (boolean, required) - Must be true to confirm deletion
- **`preserveSchema`** (boolean, optional) - Keep database schema intact (default: true)

**Example:**
```json
{
  "confirm": true,
  "preserveSchema": true
}
```

### clear_logs_by_timerange

Clear logs within a specific time range.

**Parameters:**
- **`startDate`** (string, required) - ISO 8601 date-time
- **`endDate`** (string, required) - ISO 8601 date-time
- **`confirm`** (boolean, optional) - Confirm deletion (default: false)

**Example:**
```json
{
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-01-07T23:59:59Z",
  "confirm": true
}
```

### clear_logs_by_filter

Clear logs matching specific criteria.

**Parameters:**
- **`filters`** (object, required) - Filter criteria:
  - **`host`** (string, optional) - Hostname filter
  - **`method`** (string, optional) - HTTP method filter
  - **`protocol`** (string, optional) - Protocol filter
  - **`statusCode`** (number, optional) - Status code filter
- **`confirm`** (boolean, optional) - Confirm deletion (default: false)

**Example:**
```json
{
  "filters": {
    "host": "api.example.com",
    "method": "POST",
    "statusCode": 500
  },
  "confirm": true
}
```

### cleanup_old_logs

Clean up old logs by retention days.

**Parameters:**
- **`retentionDays`** (number, required) - Keep logs newer than this many days
- **`dryRun`** (boolean, optional) - Preview only, don't delete (default: false)

**Example:**
```json
{
  "retentionDays": 7,
  "dryRun": false
}
```

### vacuum_database

Optimize database storage and reclaim space.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "message": "Database optimized. Reclaimed 12.3 MB of space.",
  "data": {
    "spaceBefore": "45.2 MB",
    "spaceAfter": "32.9 MB",
    "spaceReclaimed": "12.3 MB"
  }
}
```

### get_storage_info

Get database storage information and statistics.

**Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "databaseSize": "45.2 MB",
    "totalEntries": 15420,
    "httpRequests": 12800,
    "webSocketConnections": 85,
    "webSocketMessages": 2535,
    "oldestEntry": "2024-01-01T08:30:00Z",
    "newestEntry": "2024-01-15T14:22:00Z",
    "storageLocation": "./traffic.db"
  }
}
```

### export_traffic_logs

Export traffic data in various formats.

**Parameters:**
- **`format`** (string, required) - Export format: json, csv, har
- **`filters`** (object, optional) - Filter criteria (same as query_traffic)
- **`includeBody`** (boolean, optional) - Include request/response bodies (default: false)
- **`includeHeaders`** (boolean, optional) - Include headers (default: true)
- **`maxEntries`** (number, optional) - Max entries to export (1-100,000, default: 10,000)
- **`outputPath`** (string, optional) - Directory path for exported files (default: ./exports)

**Example:**
```json
{
  "format": "csv",
  "filters": {
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-01-02T00:00:00Z"
  },
  "includeBody": false,
  "maxEntries": 5000
}
```

## Analysis & Insights

### analyze_traffic_patterns

Analyze traffic patterns and detect anomalies.

**Parameters:**
- **`timeRange`** (object, optional) - Time range for analysis:
  - **`start`** (string) - ISO 8601 date-time
  - **`end`** (string) - ISO 8601 date-time

**Response:**
```json
{
  "success": true,
  "data": {
    "patterns": [
      {
        "type": "frequent_endpoint",
        "description": "Endpoint GET /api/popular received 500 requests (32.4% of total traffic)",
        "severity": "high",
        "count": 500,
        "endpoint": "/api/popular",
        "percentage": 32.4
      },
      {
        "type": "error_spike",
        "description": "Error rate spike detected: 15% errors between 10:30-10:35",
        "severity": "medium",
        "timeRange": {
          "start": "2024-01-15T10:30:00Z",
          "end": "2024-01-15T10:35:00Z"
        },
        "errorRate": 15.0
      },
      {
        "type": "slow_response",
        "description": "Endpoint /api/slow has 25% of requests exceeding 2s response time",
        "severity": "medium",
        "endpoint": "/api/slow",
        "slowRequestPercentage": 25.0,
        "threshold": 2000
      }
    ],
    "summary": {
      "totalPatterns": 3,
      "highSeverity": 1,
      "mediumSeverity": 2,
      "lowSeverity": 0
    }
  }
}
```

### generate_traffic_report

Generate comprehensive traffic analysis reports.

**Parameters:**
- **`timeRange`** (object, optional) - Time range for report:
  - **`start`** (string) - ISO 8601 date-time
  - **`end`** (string) - ISO 8601 date-time

**Response:**
```json
{
  "success": true,
  "data": {
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
        "description": "High traffic endpoint detected",
        "severity": "high"
      }
    ],
    "recommendations": [
      "High error rate detected. Consider investigating failing endpoints.",
      "2 high-severity patterns detected. Immediate attention recommended."
    ]
  }
}
```

## Traffic Entry Format

Traffic entries returned by query tools include:

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
  "queryString": "param=value",
  "statusCode": 200,
  "statusMessage": "OK",
  "responseTime": 150,
  "requestSize": 1024,
  "responseSize": 2048,
  "contentType": "application/json",
  "userAgent": "Mozilla/5.0...",
  "clientIp": "192.168.1.100",
  "requestHeaders": {
    "Authorization": "Bearer token",
    "Content-Type": "application/json"
  },
  "responseHeaders": {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache"
  },
  "requestBody": "request payload (if includeBody=true)",
  "responseBody": "response payload (if includeBody=true)"
}
```

## Error Handling

All tools return error responses in this format:

```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "additionalInfo": "value"
  }
}
```

Common error codes:
- **`PROXY_NOT_RUNNING`** - Proxy server is not started
- **`INVALID_REQUEST_ID`** - Request ID not found
- **`INVALID_PARAMETERS`** - Invalid or missing parameters
- **`DATABASE_ERROR`** - Database operation failed
- **`EXPORT_ERROR`** - Export operation failed

## Usage Examples

### Basic Traffic Query
```
"Show me all GET requests from the last hour"
```
Uses: `query_traffic` with filters: `{method: "GET", startDate: "1 hour ago"}`

### Performance Analysis
```
"Find requests slower than 2 seconds"
```
Uses: `query_traffic` with custom filtering on responseTime

### Error Investigation
```
"Show me details for request ID abc-123"
```
Uses: `get_request_details` with requestId: "abc-123"

### Data Cleanup
```
"Clear all logs older than 7 days"
```
Uses: `cleanup_old_logs` with retentionDays: 7

### Traffic Report
```
"Generate a comprehensive report for yesterday"
```
Uses: `generate_traffic_report` with appropriate timeRange

## See Also

- **[Getting Started](getting-started.md)** - Basic setup and first usage
- **[AI Agent Setup](ai-agent-setup.md)** - MCP client configuration
- **[Examples](examples.md)** - Real-world usage examples
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
