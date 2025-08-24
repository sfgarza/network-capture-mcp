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

### "Port 8080 already in use"
**Solution**: Use a different port
```bash
npm start -- --port 9090
```
Then update your application proxy settings to use port 9090.

### "Permission denied" when writing database
**Solution**: Check directory permissions
```bash
chmod 755 .
# Or use a different location
npm start -- --db-path ~/traffic.db
```

### "tsx not found"
**Solution**: Install tsx globally or use npx
```bash
# Option 1: Install globally
npm install -g tsx

# Option 2: Use npx (recommended)
npx tsx src/index.ts
```

### AI Agent can't connect to MCP server
**Solutions**:
1. **Check the path** in your MCP config is absolute (not relative)
2. **Ensure Node.js 18+** is installed: `node --version`
3. **Check console output** for error details when the MCP server starts
4. **Check file permissions** on the project directory
5. **Restart your AI agent** after configuration changes

### No traffic being captured
**Solutions**:
1. **Verify proxy configuration**: Test with curl as shown above
2. **Check proxy status**: Ask AI agent "What's the proxy status?"
3. **Verify application settings**: Ensure your app is using `http://localhost:8080`
4. **Check for HTTPS issues**: Some apps need certificate trust setup

### HTTPS/SSL Certificate Issues
**Solutions**:
```bash
# Regenerate certificates
npm run generate-certs

# Or disable HTTPS temporarily for testing
npm start -- --no-https

# Or ignore SSL errors (development only)
npm start -- --insecure
```

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

## Performance Considerations

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
You can manage storage through AI agent queries:
```
"How much storage is the traffic database using?"
"Clear netcap logs older than 3 days"
"Optimize the netcap database"
```

## Real-World Examples

### API Integration Testing
```bash
# Start capturing
npm start

# Configure your app to use proxy
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080

# Run your application that calls external APIs
node my-app.js

# Ask AI to analyze
# "Show me all failed API requests"
# "Which API endpoints are slowest?"
# "Find requests with authentication errors"
```

### Web Development Debugging
```bash
# For React development
npm start -- --port 8080

# In your React project, add to package.json:
# "proxy": "http://localhost:8080"

# Start your React app
npm start

# Ask AI to analyze frontend API calls
# "Show me all requests to /api endpoints"
# "Find slow loading resources"
# "Analyze error patterns in my app"
```

### Mobile App Testing
```bash
# Start proxy
npm start

# Configure mobile device to use your computer as proxy
# Device WiFi settings: Manual proxy, IP: your-computer-ip, Port: 8080

# Use your mobile app normally

# Ask AI to analyze mobile traffic
# "Show me all requests from my mobile app"
# "Find API calls that are failing on mobile"
# "Compare mobile vs web traffic patterns"
```

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
"Show me requests with authentication headers"
"Find the slowest endpoints"
"Analyze error patterns in my traffic"
"Export traffic data to CSV format"
"Generate a traffic report for today"
```

## Getting Help

- **Configuration issues**: See [Configuration Guide](configuration.md)
- **AI agent setup**: See [AI Agent Setup](ai-agent-setup.md)
- **Technical problems**: See [Troubleshooting](troubleshooting.md)
- **Advanced usage**: See [API Reference](api-reference.md)
