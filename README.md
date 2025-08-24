# Network Capture MCP

An MCP (Model Context Protocol) server that provides HTTP(S) and WebSocket network capture and analysis tools using mockttp.

> **What is MCP?** The Model Context Protocol (MCP) is a standard that allows AI agents to access external tools and data sources. This server provides AI agents with the ability to capture, analyze, and query network traffic from your applications using natural language.

## Why Use This?

- **AI-Assisted Debugging**: Let AI analyze request/response patterns, headers, and payloads to identify root causes
- **Natural Language Queries**: Ask your AI "What API calls failed today?" or "Which endpoints are slowest?"
- **Performance Analysis**: AI finds slow endpoints and provides optimization recommendations
- **Automated Monitoring**: AI detects traffic patterns and anomalies automatically

## Quick Start

### 1. Install and Setup
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

### 3. Configure Your Application
Point your application to use the proxy:
```bash
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080
your-application
```

### 4. Start Capturing
```bash
npm start
```

### 5. Ask Your AI Agent
```
"Show me all API requests from the last 10 minutes"
"Analyze traffic patterns and find any issues"
"What endpoints are responding slowly?"
```

**That's it!** Your AI agent can now analyze your application's network traffic.

## Next Steps

1. **[Complete Setup Guide](docs/getting-started.md)** - Detailed installation, configuration, and first usage
2. **[AI Agent Setup](docs/ai-agent-setup.md)** - Configure Claude Desktop and other MCP clients
3. **[Usage Examples](docs/examples.md)** - Real-world examples and integration patterns
4. **[Configuration Reference](docs/configuration.md)** - Complete configuration options and CLI parameters

## Documentation

- **[API Reference](docs/api-reference.md)** - Complete MCP tools documentation with parameters and examples
- **[Architecture Overview](docs/architecture.md)** - Technical architecture and system design
- **[Development Guide](docs/development.md)** - Contributing, testing, and development setup

## Need Help?

**Quick Issues**: See [Troubleshooting Guide](docs/troubleshooting.md) for solutions to common problems like port conflicts, setup issues, and connection problems.

## Requirements

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **AI Agent with MCP Support** - Such as Claude Desktop
- **Applications to Monitor** - The apps/services you want to capture traffic from

## Key Features

- **HTTP/HTTPS & WebSocket Traffic Capture** with complete request/response data
- **AI-Powered Analysis** using natural language queries
- **Performance Monitoring** with response time tracking and bottleneck detection
- **Multiple Export Formats** (JSON, CSV, HAR) with automatic health monitoring

> **Important**: This tool is designed for development and testing only. Do not use in production environments.

## License

MIT


