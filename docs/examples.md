# Usage Examples

Real-world examples and integration patterns for Network Capture MCP.

## Web Development Examples

### React Application Debugging

**Scenario**: Debug API calls in a React application during development.

**Setup**:
```bash
# Start Network Capture MCP
npm start -- --port 8080

# Configure React development server
# Add to package.json:
{
  "name": "my-react-app",
  "proxy": "http://localhost:8080"
}

# Start React app
cd my-react-app
npm start
```

**Usage**:
```javascript
// Your React component makes API calls normally
const fetchUserData = async () => {
  const response = await fetch('/api/users');
  const data = await response.json();
  return data;
};
```

**AI Analysis Queries**:
```
"Show me all API requests from my React app in the last 10 minutes"
"Find any failed requests to /api endpoints"
"What's the average response time for user data requests?"
"Show me requests with authentication errors"
"Analyze the request/response flow for user login"
```

**Expected Results**:
- All `/api/*` requests captured and analyzed
- Performance metrics for each endpoint
- Error analysis for failed requests
- Authentication flow debugging

### Node.js API Development

**Scenario**: Monitor and debug a Node.js Express API calling external services.

**Setup**:
```javascript
// Configure your Node.js app to use proxy
const axios = require('axios');

// Set proxy for all axios requests
axios.defaults.proxy = {
  host: 'localhost',
  port: 8080
};

// Or configure per request
const response = await axios.get('https://api.github.com/users/octocat', {
  proxy: {
    host: 'localhost',
    port: 8080
  }
});
```

**AI Analysis Queries**:
```
"Show me all requests to external APIs from my Node.js app"
"Find slow requests to the GitHub API"
"Analyze rate limiting responses from external services"
"Show me all POST requests with their payloads"
"Generate a report of API usage patterns"
```

**Use Cases**:
- Debug third-party API integrations
- Monitor rate limiting and quotas
- Analyze request/response patterns
- Optimize API call performance

## API Integration Testing

### Stripe Payment Integration

**Scenario**: Debug Stripe payment processing in your application.

**Setup**:
```bash
# Start with body capture for payment data analysis
npm start -- --port 8080 --max-body-size 2097152
```

**Application Configuration**:
```javascript
// Configure Stripe SDK to use proxy
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  httpAgent: new require('https').Agent({
    proxy: 'http://localhost:8080'
  })
});
```

**AI Analysis Queries**:
```
"Show me all requests to Stripe APIs"
"Find any failed payment processing requests"
"Analyze webhook delivery attempts from Stripe"
"Show me payment intent creation requests with details"
"Find requests with authentication errors to Stripe"
```

**Benefits**:
- Debug payment flow issues
- Monitor webhook deliveries
- Analyze failed transactions
- Verify API integration correctness

### AWS SDK Integration

**Scenario**: Monitor AWS API calls from your application.

**Setup**:
```javascript
// Configure AWS SDK to use proxy
const AWS = require('aws-sdk');

AWS.config.update({
  httpOptions: {
    agent: new require('https').Agent({
      proxy: 'http://localhost:8080'
    })
  }
});

const s3 = new AWS.S3();
```

**AI Analysis Queries**:
```
"Show me all AWS API requests from my application"
"Find S3 operations that are taking longer than 5 seconds"
"Analyze AWS authentication and authorization flows"
"Show me all failed AWS API calls with error details"
"Generate a report of AWS service usage"
```

## Performance Testing Examples

### Load Testing Analysis

**Scenario**: Analyze application performance under load.

**Setup**:
```bash
# Configure for performance testing (minimal capture)
npm start -- --port 8080 --no-capture-body --health-check-interval 10
```

**Load Testing Script**:
```javascript
// Using artillery.js or similar tool
// Configure to use proxy
module.exports = {
  config: {
    target: 'https://your-api.com',
    phases: [
      { duration: 60, arrivalRate: 10 }
    ],
    http: {
      proxy: 'http://localhost:8080'
    }
  },
  scenarios: [
    {
      name: 'API Load Test',
      requests: [
        { get: { url: '/api/users' } },
        { post: { url: '/api/users', json: { name: 'Test User' } } }
      ]
    }
  ]
};
```

**AI Analysis Queries**:
```
"What's the average response time for all requests in the last hour?"
"Find the slowest 10 requests and show their details"
"Analyze response time trends over the test period"
"Show me error rates by endpoint during load testing"
"Generate a performance report for the load test"
```

### Database Performance Analysis

**Scenario**: Monitor database query performance through API calls.

**Setup**:
```bash
# Start with timing capture
npm start -- --port 8080 --max-body-size 1048576
```

**AI Analysis Queries**:
```
"Show me requests to database-heavy endpoints sorted by response time"
"Find API calls that consistently take longer than 2 seconds"
"Analyze query patterns that might indicate N+1 problems"
"Show me endpoints with high error rates that might indicate database issues"
"Compare response times before and after database optimization"
```

## Mobile App Testing

### iOS App Network Analysis

**Scenario**: Analyze network traffic from an iOS app during development.

**Setup**:
```bash
# Start with HTTPS support for mobile testing
npm start -- --port 8080 --https-port 8443 --insecure
```

**Mobile Configuration**:
1. **Configure iOS Simulator/Device**:
   - Settings → Wi-Fi → Configure Proxy
   - Manual proxy: Your computer's IP, Port: 8080
   - Install certificate from `http://your-computer-ip:8080/ca-cert.pem`

2. **Test Connection**:
   ```bash
   # Verify mobile traffic is being captured
   # Use your app, then ask AI:
   ```

**AI Analysis Queries**:
```
"Show me all requests from my mobile app in the last 30 minutes"
"Find API calls that are failing only on mobile"
"Compare mobile vs web traffic patterns for the same endpoints"
"Analyze image and asset loading performance on mobile"
"Show me requests with mobile-specific user agents"
```

### Android App Testing

**Scenario**: Debug Android app network behavior.

**Setup**:
```bash
# Configure for Android testing
npm start -- --port 8080 --https-port 8443 --max-body-size 5242880
```

**AI Analysis Queries**:
```
"Show me all network requests from Android devices"
"Find requests that timeout on mobile but work on desktop"
"Analyze data usage patterns for mobile optimization"
"Show me background sync requests from the mobile app"
"Find API calls with large response payloads that could be optimized"
```

## Security Testing Examples

### API Security Analysis

**Scenario**: Analyze API security and authentication flows.

**Setup**:
```bash
# Capture headers and bodies for security analysis
npm start -- --port 8080 --max-body-size 2097152
```

**AI Analysis Queries**:
```
"Show me all requests with authentication headers"
"Find requests that might contain sensitive data in URLs"
"Analyze authentication token usage patterns"
"Show me requests with suspicious user agents"
"Find API calls that return sensitive information"
```

### Penetration Testing Support

**Scenario**: Support security testing with traffic analysis.

**Setup**:
```bash
# Configure for security testing
npm start -- --port 8080 --https-port 8443 --db-path ./security-test-traffic.db
```

**AI Analysis Queries**:
```
"Show me all requests with SQL injection attempt patterns"
"Find requests with unusual parameter values"
"Analyze failed authentication attempts"
"Show me requests that returned unexpected error codes"
"Generate a security analysis report"
```

## WebSocket Application Examples

### Real-time Chat Application

**Scenario**: Debug WebSocket connections in a chat application.

**Setup**:
```bash
# Enable WebSocket message capture
npm start -- --port 8080 --https-port 8443
```

**Application Configuration**:
```javascript
// Configure WebSocket to use proxy
const WebSocket = require('ws');
const HttpsProxyAgent = require('https-proxy-agent');

const ws = new WebSocket('wss://chat.example.com', {
  agent: new HttpsProxyAgent('http://localhost:8080')
});
```

**AI Analysis Queries**:
```
"Show me all WebSocket connections from the last hour"
"Find WebSocket connections that disconnected unexpectedly"
"Analyze message patterns in the chat application"
"Show me WebSocket connections with high message rates"
"Find connections with authentication or authorization issues"
```

### Real-time Trading Application

**Scenario**: Monitor WebSocket data feeds in a trading application.

**AI Analysis Queries**:
```
"Show me WebSocket connections to trading data feeds"
"Find message bursts that might indicate market events"
"Analyze connection stability for critical data feeds"
"Show me WebSocket reconnection patterns"
"Find data feed connections with unusual message sizes"
```

## Microservices Architecture

### Service-to-Service Communication

**Scenario**: Monitor communication between microservices.

**Setup**:
```bash
# Configure each service to use proxy
export HTTP_PROXY=http://localhost:8080
export HTTPS_PROXY=http://localhost:8080

# Start services
docker-compose up
```

**AI Analysis Queries**:
```
"Show me all inter-service communication in the last hour"
"Find services that are making excessive requests to other services"
"Analyze service dependency patterns"
"Show me failed requests between services"
"Generate a service communication map"
```

### API Gateway Analysis

**Scenario**: Monitor traffic through an API gateway.

**AI Analysis Queries**:
```
"Show me all requests routed through the API gateway"
"Find endpoints with high latency through the gateway"
"Analyze rate limiting behavior at the gateway level"
"Show me authentication failures at the gateway"
"Compare direct service calls vs gateway-routed calls"
```

## CI/CD Integration Examples

### Automated Testing Pipeline

**Scenario**: Integrate network capture into automated testing.

**Setup**:
```bash
# In your CI/CD pipeline
npm install -g network-capture-mcp
npm start -- --port 8080 --db-path ./test-traffic.db --no-auto-start &

# Run your tests with proxy configuration
export HTTP_PROXY=http://localhost:8080
npm run test:integration

# Analyze results
# Use MCP tools to query captured traffic
```

**Analysis Script**:
```javascript
// Automated analysis after tests
const mcpClient = new MCPClient();

const results = await mcpClient.callTool("analyze_traffic_patterns", {
  timeRange: {
    start: testStartTime,
    end: testEndTime
  }
});

// Generate test report with network analysis
console.log("Network Analysis Results:", results);
```

## Advanced Usage Patterns

### Multi-Environment Comparison

**Scenario**: Compare API behavior across different environments.

**Setup**:
```bash
# Development environment
npm start -- --port 8080 --db-path ./dev-traffic.db

# Staging environment  
npm start -- --port 8081 --db-path ./staging-traffic.db
```

**AI Analysis Queries**:
```
"Compare response times between development and staging environments"
"Find endpoints that behave differently across environments"
"Analyze error rates by environment"
"Show me configuration differences reflected in API calls"
```

### A/B Testing Analysis

**Scenario**: Analyze network behavior during A/B tests.

**AI Analysis Queries**:
```
"Show me requests from users in A/B test group A vs group B"
"Analyze API usage patterns for different feature variants"
"Find performance differences between test variants"
"Show me conversion funnel API calls for each test group"
```

### Custom Integration Patterns

**Scenario**: Build custom analysis workflows.

**Example Integration**:
```javascript
// Custom analysis script
const analyzeUserJourney = async (userId) => {
  const userTraffic = await mcpClient.callTool("query_traffic", {
    filters: {
      // Custom filtering logic
      startDate: "2024-01-01T00:00:00Z"
    },
    limit: 1000
  });
  
  // Custom analysis logic
  const journey = analyzeRequestSequence(userTraffic.data);
  return journey;
};
```

## Best Practices from Examples

### Configuration Recommendations

1. **Development**: Full capture with body data
   ```bash
   npm start -- --port 8080 --max-body-size 2097152
   ```

2. **Performance Testing**: Minimal capture for speed
   ```bash
   npm start -- --port 8080 --no-capture-body --health-check-interval 60
   ```

3. **Security Testing**: Full capture with HTTPS
   ```bash
   npm start -- --port 8080 --https-port 8443 --max-body-size 5242880
   ```

### Query Patterns

1. **Start broad, then narrow**: Begin with general queries, then drill down
2. **Use time ranges**: Focus on specific time periods for relevant data
3. **Combine filters**: Use multiple filters for precise results
4. **Export for analysis**: Use export tools for detailed offline analysis

### Integration Tips

1. **Environment separation**: Use different databases for different environments
2. **Automated cleanup**: Regularly clean old data to maintain performance
3. **Security awareness**: Be careful with sensitive data in captured traffic
4. **Performance monitoring**: Monitor proxy performance impact on applications

## See Also

- **[Getting Started](getting-started.md)** - Basic setup and configuration
- **[AI Agent Setup](ai-agent-setup.md)** - MCP client configuration
- **[API Reference](api-reference.md)** - Complete tool documentation
- **[Configuration](configuration.md)** - Advanced configuration options
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
