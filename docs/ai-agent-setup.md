# AI Agent Setup Guide

This guide covers setting up Network Capture MCP with various AI agents and MCP clients, with detailed configuration examples and usage patterns.

## Claude Desktop Setup

### Finding Your Configuration File

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

### Basic Configuration

Create or edit your `claude_desktop_config.json`:

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

**Important Notes:**
- Use **absolute paths** only (not relative paths like `./` or `../`)
- Replace `/full/path/to/network-capture-mcp` with your actual project path
- Restart Claude Desktop after making changes

### Custom Configuration

```json
{
  "mcpServers": {
    "netcap": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/network-capture-mcp/src/index.ts",
        "--port", "9090",
        "--db-path", "./custom-traffic.db",
        "--max-body-size", "2097152"
      ]
    }
  }
}
```

### Development Configuration

For development work with frequent restarts:

```json
{
  "mcpServers": {
    "netcap-dev": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/network-capture-mcp/src/index.ts",
        "--port", "8080",
        "--db-path", "./dev-traffic.db",
        "--insecure",
        "--health-check-interval", "10"
      ]
    }
  }
}
```

## Combined MCP Server Configurations

### With Playwright MCP

Network Capture MCP works excellently with Playwright for web testing:

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

This setup allows you to:
- Capture all network traffic from Playwright browser automation
- Analyze API calls made by web applications during testing
- Debug network issues in automated tests

### With File System MCP

For comprehensive development workflows:

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
    "filesystem": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-filesystem",
        "/path/to/your/project"
      ]
    }
  }
}
```

### With Database MCP

For full-stack development analysis:

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
    "postgres": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-postgres",
        "postgresql://user:password@localhost:5432/database"
      ]
    }
  }
}
```

## Configuration by Use Case

### Web Development & API Testing

```json
{
  "mcpServers": {
    "netcap-web": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/network-capture-mcp/src/index.ts",
        "--port", "8080",
        "--max-body-size", "2097152",
        "--db-path", "./web-dev-traffic.db"
      ]
    }
  }
}
```

**Usage patterns:**
```
"Show me all API requests from my React app"
"Find slow loading endpoints in my application"
"Analyze authentication flows in my web app"
"Show me all failed requests to external APIs"
```

### Performance Testing

```json
{
  "mcpServers": {
    "netcap-perf": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/network-capture-mcp/src/index.ts",
        "--port", "8080",
        "--no-capture-body",
        "--health-check-interval", "10",
        "--db-path", "./perf-test-traffic.db"
      ]
    }
  }
}
```

**Usage patterns:**
```
"What's the average response time for all endpoints?"
"Find the slowest 10 requests in the last hour"
"Show me response time trends over time"
"Identify performance bottlenecks in my API"
```

### Security Testing

```json
{
  "mcpServers": {
    "netcap-security": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/network-capture-mcp/src/index.ts",
        "--port", "8080",
        "--https-port", "8443",
        "--max-body-size", "5242880",
        "--db-path", "./security-test-traffic.db"
      ]
    }
  }
}
```

**Usage patterns:**
```
"Find requests with authentication headers"
"Show me all requests with sensitive data"
"Analyze unusual traffic patterns"
"Find requests from suspicious user agents"
```

### Mobile App Testing

```json
{
  "mcpServers": {
    "netcap-mobile": {
      "command": "npx",
      "args": [
        "tsx",
        "/path/to/network-capture-mcp/src/index.ts",
        "--port", "8080",
        "--https-port", "8443",
        "--insecure",
        "--db-path", "./mobile-app-traffic.db"
      ]
    }
  }
}
```

**Usage patterns:**
```
"Show me all requests from my mobile app"
"Compare mobile vs web API usage patterns"
"Find API calls that fail only on mobile"
"Analyze mobile app network behavior"
```

## AI Agent Usage Patterns

### Getting Started Queries

Once your AI agent is connected, try these basic queries:

```
"What's the proxy status?"
"Show me all traffic from the last 5 minutes"
"How many requests have been captured?"
```

For comprehensive usage examples including traffic analysis, performance monitoring, debugging queries, and WebSocket analysis, see **[Usage Examples](examples.md)**.

## Troubleshooting AI Agent Setup

### Quick AI Agent Issues

**Common problems:**
- **MCP server not found**: Use absolute paths in configuration (not relative paths like `./`)
- **Connection failures**: Ensure Node.js 18+ is installed and restart your AI agent after config changes
- **Port conflicts**: Use `--port 9090` to change the default port

### Need More Help?

For comprehensive troubleshooting including detailed setup verification, advanced debugging, and SSL certificate issues, see the **[Troubleshooting Guide](troubleshooting.md)**.

## Best Practices

### Configuration Management

1. **Use descriptive names** for different configurations:
   ```json
   {
     "mcpServers": {
       "netcap-dev": { /* development config */ },
       "netcap-test": { /* testing config */ },
       "netcap-perf": { /* performance testing config */ }
     }
   }
   ```

2. **Keep separate databases** for different use cases:
   ```bash
   --db-path ./dev-traffic.db      # Development
   --db-path ./test-traffic.db     # Testing
   --db-path ./perf-traffic.db     # Performance testing
   ```

3. **Document your configurations** with comments (where supported):
   ```json
   {
     "mcpServers": {
       "netcap": {
         "command": "npx",
         "args": [
           "tsx",
           "/path/to/network-capture-mcp/src/index.ts",
           "--port", "8080",
           "--db-path", "./production-traffic.db"
         ]
       }
     }
   }
   ```

### Security Considerations

1. **Use separate databases** for different projects
2. **Regularly clean up** captured traffic data
3. **Be careful with sensitive data** in request/response bodies
4. **Use `--no-capture-body`** when dealing with sensitive information

### Performance Optimization

1. **Disable unnecessary features** for performance testing:
   ```bash
   --no-capture-body --no-capture-headers
   ```

2. **Adjust health check intervals** based on usage:
   ```bash
   --health-check-interval 60  # Less frequent for stable setups
   ```

3. **Use appropriate body size limits**:
   ```bash
   --max-body-size 512000  # 500KB limit for better performance
   ```

## See Also

- **[Getting Started](getting-started.md)** - Initial setup and installation
- **[Usage Examples](examples.md)** - Real-world usage examples and queries
- **[Troubleshooting](troubleshooting.md)** - Solving setup and connection problems
