# Getting Started with Network Capture MCP

This guide will walk you through setting up Network Capture MCP from scratch, configuring your applications, and capturing your first network traffic.

## Prerequisites

### Required Software
- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **npm** - Included with Node.js
- **AI Agent with MCP Support** - Such as Claude Desktop, or custom MCP client

### System Compatibility
- **Operating Systems**: macOS, Linux, Windows
- **AI Agents**: Claude Desktop, custom MCP clients
- **Applications**: Any app that can use HTTP/HTTPS proxy (most web apps, APIs, mobile apps)

### What You'll Need
- **Applications to Monitor** - The apps/services you want to capture traffic from
- **Basic command line knowledge** - For running npm commands
- **Text editor** - For editing configuration files

## Installation

### 1. Clone and Install
```bash
git clone https://github.com/theinfinitereality/network-capture-mcp
cd network-capture-mcp
npm install
```

### 2. Verify Installation
```bash
# Check Node.js version
node --version  # Should be 18.0.0 or higher

# Test the server
npm start -- --help
```

### 3. Generate SSL Certificates (Automatic)
SSL certificates are automatically generated during `npm install`. If you need to regenerate them:
```bash
npm run generate-certs
```

## AI Agent Configuration

### Claude Desktop Setup

1. **Find your config file**:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

2. **Add the MCP server**:
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

3. **Important**: Use the **absolute path** to your project directory, not a relative path.

4. **Restart Claude Desktop** for changes to take effect.

### Custom Configuration Options
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

## Configuring Applications

### Method 1: Environment Variables (Easiest)
```bash
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080
your-application
```

### Method 2: Application-Specific Configuration

#### Node.js/JavaScript Applications
```javascript
// For axios
const axios = require('axios');
axios.defaults.proxy = { host: 'localhost', port: 8080 };

// For fetch with proxy-agent
const { ProxyAgent } = require('proxy-agent');
const agent = new ProxyAgent('http://localhost:8080');
fetch(url, { agent });

// For Node.js 18+ native fetch
fetch(url, {
  dispatcher: new ProxyAgent('http://localhost:8080')
});
```

#### Python Applications
```python
import requests

# Configure proxy for requests
proxies = {
    'http': 'http://localhost:8080',
    'https': 'http://localhost:8080'
}
response = requests.get('https://api.example.com', proxies=proxies)
```

#### Command Line Tools
```bash
# curl
curl --proxy http://localhost:8080 https://api.example.com

# wget
wget --proxy=on --http-proxy=localhost:8080 --https-proxy=localhost:8080 https://api.example.com
```

#### React Development Server
Add to your `package.json`:
```json
{
  "name": "my-react-app",
  "proxy": "http://localhost:8080"
}
```

### Method 3: Browser Development
For browser-based applications during development:

1. **Configure development server proxy** (recommended)
2. **Use browser proxy settings** for testing
3. **Browser extensions** for selective proxying

## First Usage

### 1. Start the MCP Server
```bash
npm start
```

You should see output like:
```
MCP Server starting...
Proxy server started on port 8080
Database initialized: ./traffic.db
Health monitoring enabled
Ready for connections
```

### 2. Test the Proxy
```bash
# In a new terminal
curl --proxy http://localhost:8080 https://httpbin.org/get
```

### 3. Verify Traffic Capture
Ask your AI agent:
```
"Show me all traffic from the last 5 minutes"
"What's the proxy status?"
"How many requests have been captured?"
```

### 4. Generate More Traffic
Run your application normally - all HTTP/HTTPS traffic will be captured automatically.

## Common Setup Issues

### Quick Fixes for Setup Problems
If you encounter issues during setup, try these quick solutions:

- **Port conflicts**: `npm start -- --port 9090`
- **Permission errors**: `npm start -- --db-path ~/traffic.db`
- **tsx not found**: Use `npx tsx src/index.ts` instead

### Need More Help?
For comprehensive troubleshooting including AI agent connection issues, HTTPS problems, and traffic capture issues, see the **[Troubleshooting Guide](troubleshooting.md)**.

## Next Steps

Once you have traffic being captured successfully:

1. **Explore AI queries**: Try different questions about your traffic
2. **Review configuration options**: See [Configuration Guide](configuration.md)
3. **Learn about available tools**: Check [API Reference](api-reference.md)
4. **Set up advanced features**: Review [Architecture Overview](architecture.md)

## Verification Checklist

- [ ] Node.js 18+ installed
- [ ] Project cloned and dependencies installed
- [ ] AI agent configured with absolute path
- [ ] AI agent restarted
- [ ] MCP server starts without errors
- [ ] Test curl request works through proxy
- [ ] AI agent can query traffic data
- [ ] Your application is configured to use proxy
- [ ] Traffic appears when using your application





## Understanding the Output

### Traffic Data Structure
When you ask your AI agent about traffic, you'll see data like:
```json
{
  "id": "uuid",
  "timestamp": "2023-12-01T10:00:00Z",
  "url": "https://api.example.com/users",
  "method": "GET",
  "statusCode": 200,
  "responseTime": 150,
  "host": "api.example.com",
  "protocol": "https"
}
```

### Common AI Queries to Try
```
"Show me all traffic from the last hour"
"Find all POST requests that failed"
"What's the average response time for API calls?"
"Find the slowest endpoints"
```

For more comprehensive examples and real-world usage patterns, see **[Usage Examples](examples.md)**.

## Getting Help

- **Setup Problems**: [Troubleshooting Guide](troubleshooting.md)
- **AI Agent Configuration**: [AI Agent Setup](ai-agent-setup.md)
- **Advanced Configuration**: [Configuration Guide](configuration.md)
- **Usage Examples**: [Examples Guide](examples.md)
