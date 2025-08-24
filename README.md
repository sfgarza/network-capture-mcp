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

## Documentation

### Getting Started
- **[Getting Started Guide](docs/getting-started.md)** - Comprehensive setup instructions, prerequisites, and first-time configuration
- **[Application Configuration](docs/getting-started.md#configuring-applications)** - How to configure different applications and frameworks to use the proxy

### Configuration
- **[Configuration Guide](docs/configuration.md)** - Complete configuration options, CLI parameters, and examples
- **[AI Agent Setup](docs/ai-agent-setup.md)** - Setting up Claude Desktop and other MCP clients

### Usage & Reference
- **[API Reference](docs/api-reference.md)** - Complete MCP tools documentation with parameters and examples
- **[Usage Examples](docs/examples.md)** - Real-world examples and integration patterns
- **[Architecture Overview](docs/architecture.md)** - How the system works and technical details

### Support
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues, solutions, and debugging tips
- **[Development Guide](docs/development.md)** - Contributing, testing, and development setup

## Common Issues

### "Port 8080 already in use"
```bash
npm start -- --port 9090
```

### "tsx not found"
```bash
npm install -g tsx
# Or use npx (recommended)
npx tsx src/index.ts
```

### AI Agent can't connect
1. Check the path in your MCP config is absolute (not relative)
2. Ensure Node.js 18+ is installed: `node --version`
3. Check console output for error details

### No traffic being captured
1. Verify proxy configuration: `curl --proxy http://localhost:8080 https://httpbin.org/get`
2. Ask AI agent: "What's the proxy status?"
3. Check application proxy settings

## Requirements

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **AI Agent with MCP Support** - Such as Claude Desktop
- **Applications to Monitor** - The apps/services you want to capture traffic from

## Key Features

- **HTTP/HTTPS Traffic Capture** - Complete request/response data with headers and bodies
- **WebSocket Support** - Real-time message capture and analysis
- **AI-Powered Analysis** - Natural language queries for traffic analysis
- **Performance Monitoring** - Response time tracking and bottleneck detection
- **Pattern Detection** - Automatic anomaly and error spike detection
- **Multiple Export Formats** - JSON, CSV, and HAR format support
- **Auto-Start & Health Monitoring** - Automatic proxy startup and failure recovery

## Real-World Use Cases

- **API Integration Debugging** - Debug third-party API issues (Stripe, GitHub, AWS, etc.)
- **Performance Testing** - Analyze response times and identify bottlenecks
- **Security Auditing** - Monitor for unusual traffic patterns and potential threats
- **Development Workflow** - Capture and analyze traffic during development and testing

## Performance

- **Memory Usage**: ~20-50MB for typical usage (1000-10000 requests)
- **CPU Impact**: Minimal (<1% for most applications)
- **Network Latency**: <5ms additional latency per request
- **Storage**: ~1MB per 1000 HTTP requests

> **Important**: This tool is designed for development and testing only. Do not use in production environments.

## License

MIT

---

## Need Help?

- **Quick Issues**: Check [Troubleshooting](docs/troubleshooting.md)
- **Setup Help**: See [Getting Started Guide](docs/getting-started.md)
- **Configuration**: Review [Configuration Guide](docs/configuration.md)
- **API Questions**: Check [API Reference](docs/api-reference.md)

For more detailed information, see the complete documentation in the `docs/` directory.
