# Troubleshooting Guide

Comprehensive solutions to common issues with Network Capture MCP.

## Quick Diagnostics

### Health Check Commands
```bash
# Check proxy status
# Ask your AI agent: "What's the proxy status?"

# Check system health
# Ask your AI agent: "What's the health status?"

# Validate configuration
npm start -- --help

# Test basic functionality
curl --proxy http://localhost:8080 https://httpbin.org/get
```

### Common Quick Fixes
```bash
# Restart the proxy
# Ask your AI agent: "Restart the proxy server"

# Use different port
npm start -- --port 9090

# Reset to defaults
# Ask your AI agent: "Reset configuration to defaults"

# Clear old data
# Ask your AI agent: "Clear all logs older than 1 day"
```

## Installation & Setup Issues

### "tsx not found"

**Problem**: Error when starting the MCP server
```
Error: tsx not found
```

**Solutions**:
```bash
# Option 1: Install tsx globally (recommended)
npm install -g tsx

# Option 2: Use npx (always works)
npx tsx src/index.ts

# Option 3: Update your MCP configuration to use npx
{
  "command": "npx",
  "args": ["tsx", "/path/to/network-capture-mcp/src/index.ts"]
}
```

### Node.js Version Issues

**Problem**: Compatibility errors or unexpected behavior

**Check version**:
```bash
node --version  # Should be 18.0.0 or higher
```

**Solutions**:
- **Update Node.js**: Visit [nodejs.org](https://nodejs.org/) for latest version
- **Use Node Version Manager**: `nvm install 18` and `nvm use 18`
- **Check PATH**: Ensure correct Node.js version is in PATH

### Permission Denied Errors

**Problem**: Cannot write database or access files
```
Error: EACCES: permission denied, open './traffic.db'
```

**Solutions**:
```bash
# Check directory permissions
ls -la .

# Fix permissions
chmod 755 .
chmod 644 package.json

# Use different database location
npm start -- --db-path ~/traffic.db

# Check file ownership
sudo chown -R $USER:$USER .
```

## Proxy Server Issues

### "Port 8080 already in use"

**Problem**: Cannot start proxy on default port

**Diagnosis**:
```bash
# Check what's using the port
lsof -i :8080
netstat -tulpn | grep :8080
```

**Solutions**:
```bash
# Use different port
npm start -- --port 9090

# Kill process using the port (if safe)
kill -9 <pid>

# Find available port automatically
npm start -- --port 0  # Uses random available port
```

### Proxy Not Responding

**Problem**: Proxy server starts but doesn't capture traffic

**Diagnosis**:
```bash
# Test proxy connectivity
curl --proxy http://localhost:8080 https://httpbin.org/get

# Check proxy status
# Ask AI: "What's the proxy status?"

# Verify configuration
npm start -- --help
```

**Solutions**:
```bash
# Restart proxy
# Ask AI: "Restart the proxy server"

# Check health status
# Ask AI: "What's the health status?"

# Use insecure mode for testing
npm start -- --insecure

# Disable auto-start and start manually
npm start -- --no-auto-start
# Then ask AI: "Start the proxy server"
```

### No Traffic Being Captured

**Problem**: Applications run but no traffic appears in queries

**Diagnosis Steps**:
1. **Verify proxy configuration** in your application
2. **Test with curl** to confirm proxy works
3. **Check application proxy settings**
4. **Verify AI agent can query data**

**Solutions**:

#### Application Configuration Issues
```bash
# Test different proxy configuration methods

# Method 1: Environment variables
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080
your-application

# Method 2: Application-specific settings
# See getting-started.md for language-specific examples

# Method 3: System proxy settings (macOS/Windows)
# Configure in system network settings
```

#### Proxy Server Issues
```bash
# Check if proxy is actually running
# Ask AI: "What's the proxy status?"

# Restart with verbose logging
DEBUG=netcap:* npm start

# Test with simple request
curl -v --proxy http://localhost:8080 https://httpbin.org/get
```

#### Database Issues
```bash
# Check database connectivity
# Ask AI: "What's the storage info?"

# Verify database permissions
ls -la traffic.db*

# Reset database
rm traffic.db* && npm start
```

## SSL/HTTPS Issues

### SSL Certificate Errors

**Problem**: HTTPS requests fail with certificate errors
```
Error: self signed certificate
Error: certificate verify failed
```

**Solutions**:

#### Quick Fix (Development)
```bash
# Ignore SSL errors (development only)
npm start -- --insecure
```

#### Proper Certificate Setup
```bash
# Regenerate certificates
npm run generate-certs

# Install certificate in browser
# Chrome: Settings → Privacy & Security → Security → Manage Certificates → Authorities → Import
# Firefox: Settings → Privacy & Security → Certificates → View Certificates → Authorities → Import
# Safari: Double-click certificate file → Keychain Access → Trust → Always Trust
```

#### Application-Specific SSL Configuration
```javascript
// Node.js - Disable SSL verification (development only)
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

// Python requests - Disable SSL verification
import requests
requests.packages.urllib3.disable_warnings()
response = requests.get(url, verify=False, proxies=proxies)
```

### HTTPS Proxy Not Working

**Problem**: HTTP traffic works but HTTPS doesn't

**Solutions**:
```bash
# Enable HTTPS proxy explicitly
npm start -- --https-port 8443

# Check certificate installation
npm run generate-certs

# Test HTTPS proxy
curl -k --proxy http://localhost:8080 https://httpbin.org/get

# Use insecure mode for testing
npm start -- --insecure
```

## AI Agent Connection Issues

### MCP Server Not Found

**Problem**: AI agent cannot connect to MCP server

**Common Causes & Solutions**:

#### Incorrect Path Configuration
```json
// ❌ Wrong - relative path
{
  "command": "tsx",
  "args": ["./src/index.ts"]
}

// ✅ Correct - absolute path
{
  "command": "npx",
  "args": ["tsx", "/full/path/to/network-capture-mcp/src/index.ts"]
}
```

#### Missing Dependencies
```bash
# Ensure tsx is available
npm install -g tsx

# Or use npx in configuration
{
  "command": "npx",
  "args": ["tsx", "/path/to/network-capture-mcp/src/index.ts"]
}
```

#### File Permissions
```bash
# Check file permissions
ls -la /path/to/network-capture-mcp/src/index.ts

# Fix permissions if needed
chmod +x /path/to/network-capture-mcp/src/index.ts
```

### MCP Server Crashes on Startup

**Problem**: Server starts but immediately crashes

**Diagnosis**:
```bash
# Run manually to see error messages
cd /path/to/network-capture-mcp
npm start

# Check for port conflicts
lsof -i :8080

# Validate configuration
npm start -- --help
```

**Solutions**:
```bash
# Use different port
npm start -- --port 9090

# Disable auto-start for debugging
npm start -- --no-auto-start

# Use minimal configuration
npm start -- --no-capture-body --no-websockets

# Check database permissions
npm start -- --db-path ~/debug-traffic.db
```

### AI Agent Cannot Query Data

**Problem**: MCP server runs but AI agent gets no results

**Diagnosis**:
```bash
# Check if data exists
# Ask AI: "How many requests have been captured?"

# Verify proxy is capturing
curl --proxy http://localhost:8080 https://httpbin.org/get
# Then ask AI: "Show me traffic from the last minute"

# Check database
# Ask AI: "What's the storage info?"
```

**Solutions**:
```bash
# Generate test traffic
curl --proxy http://localhost:8080 https://httpbin.org/get
curl --proxy http://localhost:8080 https://httpbin.org/post -d '{"test": true}'

# Check proxy status
# Ask AI: "What's the proxy status?"

# Restart MCP server
# Restart your AI agent (Claude Desktop)
```

## Performance Issues

### High Memory Usage

**Problem**: Memory usage grows over time

**Diagnosis**:
```bash
# Check current memory usage
# Ask AI: "What's the memory usage?"

# Check database size
# Ask AI: "What's the storage info?"
```

**Solutions**:
```bash
# Reduce capture size
npm start -- --max-body-size 100000

# Disable body capture
npm start -- --no-capture-body

# Clean up old data
# Ask AI: "Clear logs older than 3 days"

# Restart to clear memory
# Ask AI: "Restart the proxy server"
```

### Slow Database Queries

**Problem**: AI queries take a long time to respond

**Solutions**:
```bash
# Optimize database
# Ask AI: "Optimize the netcap database"

# Clean up old data
# Ask AI: "Clear logs older than 7 days"

# Disable full-text search if not needed
npm start -- --no-fts

# Use smaller result limits
# Ask AI: "Show me the last 50 requests" (instead of default 100)
```

### High CPU Usage

**Problem**: Proxy server uses too much CPU

**Solutions**:
```bash
# Reduce capture features
npm start -- --no-capture-body --no-capture-headers

# Increase health check interval
npm start -- --health-check-interval 120

# Disable WebSocket capture if not needed
npm start -- --no-websockets
```

## Database Issues

### Database Corruption

**Problem**: Database errors or inconsistent data

**Symptoms**:
- "Database is locked" errors
- Inconsistent query results
- Crashes during database operations

**Solutions**:
```bash
# Check database integrity
sqlite3 traffic.db "PRAGMA integrity_check;"

# Backup and recreate database
cp traffic.db traffic.db.backup
rm traffic.db* && npm start

# Vacuum database to fix minor issues
# Ask AI: "Optimize the netcap database"
```

### Database Lock Issues

**Problem**: "Database is locked" errors

**Solutions**:
```bash
# Check for processes holding locks
lsof traffic.db*

# Kill processes if safe
kill -9 <pid>

# Restart with clean database
rm traffic.db-shm traffic.db-wal
npm start

# Use different database location
npm start -- --db-path ./new-traffic.db
```

## Network Issues

### Proxy Timeout Issues

**Problem**: Requests timeout through proxy

**Solutions**:
```bash
# Increase timeout values (if configurable)
# Check target server connectivity directly
curl https://target-server.com

# Test with different target
curl --proxy http://localhost:8080 https://httpbin.org/get

# Check proxy logs
DEBUG=netcap:* npm start
```

### DNS Resolution Issues

**Problem**: Cannot resolve hostnames through proxy

**Solutions**:
```bash
# Test DNS resolution
nslookup target-server.com

# Use IP addresses instead of hostnames
curl --proxy http://localhost:8080 https://1.1.1.1

# Check system DNS settings
cat /etc/resolv.conf  # Linux/macOS
```

## Getting Help

### Debug Information to Collect

When reporting issues, include:

1. **System Information**:
   ```bash
   node --version
   npm --version
   uname -a  # Linux/macOS
   ```

2. **Configuration**:
   ```bash
   npm start -- --help
   # Your MCP configuration (redacted)
   ```

3. **Error Messages**:
   - Complete error output
   - Console logs from MCP server
   - AI agent error messages

4. **Test Results**:
   ```bash
   curl --proxy http://localhost:8080 https://httpbin.org/get
   # Ask AI: "What's the proxy status?"
   ```

### Escalation Path

1. **Check this troubleshooting guide** first
2. **Search existing issues** on GitHub
3. **Run diagnostic commands** and collect information
4. **Create detailed issue report** with debug information
5. **Include reproduction steps** if possible

### Emergency Recovery

If everything is broken:

```bash
# Nuclear option - complete reset
rm -rf node_modules traffic.db* certs/
npm install
npm run generate-certs
npm start

# Test basic functionality
curl --proxy http://localhost:8080 https://httpbin.org/get
```

## See Also

- **[Getting Started](getting-started.md)** - Initial setup help
- **[Configuration](configuration.md)** - Configuration options
- **[AI Agent Setup](ai-agent-setup.md)** - MCP client issues
- **[Architecture](architecture.md)** - Understanding system behavior
- **[Development](development.md)** - Development-specific issues
