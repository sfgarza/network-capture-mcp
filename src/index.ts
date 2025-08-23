#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ProxyTools } from './tools/proxy-tools.js';
import { QueryTools } from './tools/query-tools.js';
import { LogManagementTools } from './tools/log-management-tools.js';
import { AnalysisTools } from './tools/analysis-tools.js';
import { ExportTools } from './tools/export-tools.js';
import { ArgumentParser } from './cli/argument-parser.js';
import { ConfigBuilder } from './cli/config-builder.js';
import { ProxyConfig } from './types/traffic.js';

/**
 * NetCap MCP Server
 *
 * Provides HTTP and WebSocket network capture and analysis tools using mockttp.
 * Auto-starts proxy server by default with health monitoring and auto-restart.
 */
class NetCapMcpServer {
  private server: McpServer;
  private proxyTools: ProxyTools;
  private queryTools: QueryTools;
  private logTools: LogManagementTools;
  private analysisTools: AnalysisTools;
  private exportTools: ExportTools;

  constructor(autoStart: boolean = true, config?: ProxyConfig) {
    this.server = new McpServer({
      name: 'netcap-mcp',
      version: '1.0.0',
    });

    // Initialize tool classes
    this.proxyTools = new ProxyTools(autoStart, config);
    this.queryTools = new QueryTools();
    this.logTools = new LogManagementTools();
    this.analysisTools = new AnalysisTools();
    this.exportTools = new ExportTools();

    this.setupTools();
    this.setupResources();
    console.error('NetCap MCP Server initialized');
  }

  private setupTools(): void {
    // Proxy Management Tools
    this.server.tool(
      'get_proxy_status',
      {},
      async () => {
        const result = await this.proxyTools.getProxyStatus();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'start_proxy',
      {
        port: z.number().int().min(1).max(65535).default(8080)
          .describe('HTTP proxy port (1-65535, default: 8080). Configure your applications to use this port.'),
        httpsPort: z.number().int().min(1).max(65535).optional()
          .describe('HTTPS proxy port (optional). Enables HTTPS traffic interception when set.'),
        enableWebSockets: z.boolean().default(true)
          .describe('Enable WebSocket traffic capture (default: true). Set to false to improve performance if not needed.'),
        enableHTTPS: z.boolean().default(true)
          .describe('Enable HTTPS proxy with SSL certificate generation (default: true). Required for HTTPS traffic.'),
        ignoreHostHttpsErrors: z.boolean().default(false)
          .describe('Ignore HTTPS certificate errors when proxying requests (default: false). Set to true to bypass SSL certificate validation.'),
        captureOptions: z.object({
          captureHeaders: z.boolean().default(true)
            .describe('Capture request/response headers (default: true). Disable to reduce storage usage.'),
          captureBody: z.boolean().default(true)
            .describe('Capture request/response body content (default: true). Disable for performance/privacy.'),
          maxBodySize: z.number().int().min(0).default(1048576)
            .describe('Maximum body size to capture in bytes (default: 1MB). Larger bodies are truncated.'),
          captureWebSocketMessages: z.boolean().default(true)
            .describe('Capture WebSocket message content (default: true). Disable to reduce storage for high-volume connections.'),
        }).optional().describe('Optional capture configuration. Use defaults for most cases.'),
      },
      async (params) => {
        const result = await this.proxyTools.startProxy(params);

        // Add setup guidance to response
        if (result.success && result.data) {
          const enhancedResult = {
            ...result,
            setup: {
              proxyConfiguration: {
                http: `Configure applications to use HTTP proxy: localhost:${params.port}`,
                https: params.httpsPort ? `Configure applications to use HTTPS proxy: localhost:${params.httpsPort}` : 'HTTPS proxy not configured',
                certificate: 'Use get_ca_certificate to get the CA certificate for HTTPS interception',
              },
              nextSteps: [
                'Configure your applications to use the proxy',
                'Install CA certificate for HTTPS traffic (use get_ca_certificate)',
                'Use query_traffic to view captured traffic',
                'Use get_proxy_status to monitor proxy health',
              ],
              relatedTools: {
                'get_ca_certificate': 'Get CA certificate for HTTPS interception',
                'get_proxy_status': 'Check proxy status and configuration',
                'query_traffic': 'View captured traffic data',
                'stop_proxy': 'Stop the proxy when done',
              },
            },
          };

          return {
            content: [{ type: 'text', text: JSON.stringify(enhancedResult, null, 2) }],
            isError: false,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'stop_proxy',
      {},
      async () => {
        const result = await this.proxyTools.stopProxy();

        // Add cleanup guidance to response
        if (result.success) {
          const enhancedResult = {
            ...result,
            cleanup: {
              status: 'Proxy stopped successfully',
              dataRetention: 'Traffic data is preserved in database',
              nextSteps: [
                'Traffic data remains available for analysis',
                'Use export_traffic_logs to save data before clearing',
                'Use start_proxy to restart traffic capture',
                'Use clear_all_logs if you want to remove all data',
              ],
              relatedTools: {
                'export_traffic_logs': 'Export captured data before clearing',
                'get_storage_info': 'Check database size and entry count',
                'start_proxy': 'Restart proxy with same or different configuration',
                'clear_all_logs': 'Remove all captured traffic data',
              },
            },
          };

          return {
            content: [{ type: 'text', text: JSON.stringify(enhancedResult, null, 2) }],
            isError: false,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'restart_proxy',
      {
        preserveData: z.boolean().default(true)
          .describe('Whether to preserve existing traffic data (default: true). Set to false to clear all data on restart.'),
        config: z.object({
          port: z.number().int().min(1).max(65535).optional()
            .describe('New HTTP proxy port (optional). Keep current port if not specified.'),
          httpsPort: z.number().int().min(1).max(65535).optional()
            .describe('New HTTPS proxy port (optional). Keep current setting if not specified.'),
          enableWebSockets: z.boolean().optional()
            .describe('Enable/disable WebSocket capture (optional). Keep current setting if not specified.'),
          enableHTTPS: z.boolean().optional()
            .describe('Enable/disable HTTPS proxy (optional). Keep current setting if not specified.'),
          captureHeaders: z.boolean().optional()
            .describe('Enable/disable header capture (optional). Keep current setting if not specified.'),
          captureBody: z.boolean().optional()
            .describe('Enable/disable body capture (optional). Keep current setting if not specified.'),
          maxBodySize: z.number().int().min(0).optional()
            .describe('Maximum body size in bytes (optional). Keep current setting if not specified.'),
        }).optional().describe('Optional configuration changes. Omit to restart with current settings.'),
      },
      async (params) => {
        const result = await this.proxyTools.restartProxy(params);

        // Add restart guidance to response
        if (result.success && result.data) {
          const enhancedResult = {
            ...result,
            restart: {
              status: 'Proxy restarted successfully',
              dataPreservation: params.preserveData ? 'Existing traffic data preserved' : 'All traffic data cleared',
              configurationChanges: params.config ? 'Configuration updated' : 'Using previous configuration',
              nextSteps: [
                'Proxy is ready to capture traffic',
                'Reconfigure applications if ports changed',
                'Use get_proxy_status to verify new configuration',
                'Use query_traffic to view captured data',
              ],
              relatedTools: {
                'get_proxy_status': 'Verify new proxy configuration',
                'get_ca_certificate': 'Get CA certificate if HTTPS enabled',
                'query_traffic': 'View captured traffic data',
                'get_storage_info': 'Check data preservation status',
              },
            },
          };

          return {
            content: [{ type: 'text', text: JSON.stringify(enhancedResult, null, 2) }],
            isError: false,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    // Auto-Start & Health Management Tools
    this.server.tool(
      'configure_auto_start',
      {
        enabled: z.boolean()
          .describe('Enable or disable automatic proxy startup when MCP server starts'),
        config: z.object({
          port: z.number().int().min(1).max(65535).optional()
            .describe('Default HTTP proxy port for auto-start (optional)'),
          enableWebSockets: z.boolean().optional()
            .describe('Enable WebSocket capture on auto-start (optional)'),
          enableHTTPS: z.boolean().optional()
            .describe('Enable HTTPS proxy on auto-start (optional)'),
          captureHeaders: z.boolean().optional()
            .describe('Enable header capture on auto-start (optional)'),
          captureBody: z.boolean().optional()
            .describe('Enable body capture on auto-start (optional)'),
        }).optional().describe('Default configuration for auto-started proxy (optional)'),
      },
      async (params) => {
        const result = await this.proxyTools.configureAutoStart(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'get_auto_start_status',
      {},
      async () => {
        const result = await this.proxyTools.getAutoStartStatus();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'get_health_status',
      {},
      async () => {
        const result = await this.proxyTools.getHealthStatus();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'validate_config',
      {
        config: z.object({
          proxy: z.object({
            httpPort: z.number().int().min(1).max(65535),
            httpsPort: z.number().int().min(1).max(65535).optional(),
            enableWebSockets: z.boolean().default(true),
            enableHTTPS: z.boolean().default(true),
            ignoreHostHttpsErrors: z.boolean().default(false),
          }),
          capture: z.object({
            captureHeaders: z.boolean().default(true),
            captureBody: z.boolean().default(true),
            maxBodySize: z.number().int().min(0).default(1048576),
            captureWebSocketMessages: z.boolean().default(true),
            maxWebSocketMessages: z.number().int().min(0).default(1000),
          }).optional(),
          storage: z.object({
            dbPath: z.string().default('./traffic.db'),
            maxEntries: z.number().int().min(0).default(100000),
            retentionDays: z.number().int().min(1).default(7),
            enableFTS: z.boolean().default(true),
          }).optional(),
        }),
      },
      async (params) => {
        const result = await this.proxyTools.validateConfig(params.config);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'reset_to_defaults',
      {},
      async () => {
        const result = await this.proxyTools.resetToDefaults();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'get_ca_certificate',
      {},
      async () => {
        const result = await this.proxyTools.getCACertificate();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    // Traffic Querying Tools
    this.server.tool(
      'query_traffic',
      {
        filters: z.object({
          host: z.string().optional().describe('Filter by hostname (e.g., "api.example.com")'),
          method: z.string().optional().describe('HTTP method filter (e.g., "GET", "POST")'),
          statusCode: z.number().int().optional().describe('HTTP status code filter (e.g., 200, 404, 500)'),
          protocol: z.enum(['http', 'https', 'ws', 'wss']).optional().describe('Protocol filter'),
          startDate: z.string().optional().describe('Start time filter - ISO 8601 date-time string (e.g., 2023-12-01T10:00:00Z)'),
          endDate: z.string().optional().describe('End time filter - ISO 8601 date-time string (e.g., 2023-12-01T23:59:59Z)'),
        }).optional().describe('Optional filters to narrow down results'),
        limit: z.number().int().min(1).max(1000).default(100).describe('Maximum number of results to return (1-1000, default: 100). Use multiple calls with offset for pagination.'),
        offset: z.number().int().min(0).default(0).describe('Number of results to skip for pagination. Use with limit to get all results.'),
        sortBy: z.enum(['timestamp', 'method', 'url', 'status', 'responseTime']).default('timestamp').describe('Field to sort results by'),
        sortOrder: z.enum(['asc', 'desc']).default('desc').describe('Sort order: "desc" for newest first, "asc" for oldest first'),
        includeBody: z.boolean().default(false).describe('Whether to include request/response body content (increases response size)'),
      },
      async (params) => {
        const result = await this.queryTools.queryTraffic(params);

        // Add pagination and usage guidance to response
        if (result.success && result.data) {
          const enhancedResult = {
            ...result,
            data: {
              ...result.data,
              pagination: {
                ...result.data.pagination,
                guidance: result.data.pagination.hasMore
                  ? `More results available - call again with offset: ${params.offset + params.limit}`
                  : 'All matching results returned',
              },
            },
            usage: {
              nextSteps: [
                'Use get_request_details with specific request IDs for full information',
                'Use search_traffic for content-based filtering',
                'Use analyze_traffic_patterns for insights on this data',
              ],
              relatedTools: {
                'get_request_details': 'Get full details for a specific request ID',
                'search_traffic': 'Search within request/response content',
                'get_traffic_stats': 'Get summary statistics',
                'analyze_traffic_patterns': 'Analyze patterns and anomalies',
              },
            },
          };

          return {
            content: [{ type: 'text', text: JSON.stringify(enhancedResult, null, 2) }],
            isError: false,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'get_request_details',
      {
        requestId: z.string().min(1)
          .describe('Request ID from query_traffic results (UUID format, e.g., 123e4567-e89b-12d3-a456-426614174000)'),
      },
      async (params) => {
        const result = await this.queryTools.getRequestDetails(params);

        // Add analysis guidance to response
        if (result.success && result.data) {
          const enhancedResult = {
            ...result,
            analysis: {
              summary: 'Full request/response details retrieved',
              nextSteps: [
                'Examine headers for authentication, content-type, and custom headers',
                'Check request/response body for data patterns',
                'Review timing information for performance analysis',
                'Use search_traffic to find similar requests',
              ],
              relatedTools: {
                'search_traffic': 'Find similar requests by content or headers',
                'query_traffic': 'Get related requests from same host or time period',
                'get_websocket_messages': 'Get WebSocket messages if this is a WebSocket connection',
                'analyze_traffic_patterns': 'Analyze patterns across multiple requests',
              },
            },
          };

          return {
            content: [{ type: 'text', text: JSON.stringify(enhancedResult, null, 2) }],
            isError: false,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'search_traffic',
      {
        query: z.string().min(1).describe('Search term or pattern to find in traffic data'),
        searchIn: z.array(z.enum(['url', 'headers', 'body', 'response'])).default(['url', 'body']).describe('Fields to search in: url, headers, body (request), response (response body)'),
        caseSensitive: z.boolean().default(false).describe('Whether search should be case-sensitive'),
        regex: z.boolean().default(false).describe('Whether to treat query as a regular expression'),
        limit: z.number().int().min(1).max(1000).default(100).describe('Maximum results to return. Use multiple calls if you need more than 1000 results.'),
      },
      async (params) => {
        const result = await this.queryTools.searchTraffic(params);

        // Add search guidance to response
        if (result.success && result.data) {
          const enhancedResult = {
            ...result,
            searchContext: {
              query: params.query,
              searchedFields: params.searchIn,
              caseSensitive: params.caseSensitive,
              regex: params.regex,
              matchCount: result.data.results.length,
              suggestions: result.data.results.length === 0 ? [
                'Try a broader search term',
                'Check spelling and case sensitivity',
                'Use regex: false for literal string matching',
                'Try searching in different fields (url, headers, body, response)',
              ] : result.data.results.length === params.limit ? [
                'More results may be available',
                'Consider adding filters to narrow results',
                'Use get_request_details for specific matches',
              ] : [
                'Use get_request_details for full information on specific matches',
                'Use query_traffic with filters to get related requests',
              ],
              relatedTools: {
                'get_request_details': 'Get full details for specific search results',
                'query_traffic': 'Get related requests with filters',
                'analyze_traffic_patterns': 'Analyze patterns in search results',
              },
            },
          };

          return {
            content: [{ type: 'text', text: JSON.stringify(enhancedResult, null, 2) }],
            isError: false,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'get_traffic_stats',
      {
        timeRange: z.object({
          start: z.string().describe('Start time - ISO 8601 date-time string (e.g., 2023-12-01T10:00:00Z)'),
          end: z.string().describe('End time - ISO 8601 date-time string (e.g., 2023-12-01T23:59:59Z)'),
        }).optional().describe('Optional time range filter. Omit to get stats for all captured traffic.'),
      },
      async (params) => {
        const result = await this.queryTools.getTrafficStats(params.timeRange);

        // Add analysis guidance to response
        if (result.success && result.data) {
          const enhancedResult = {
            ...result,
            insights: {
              summary: 'Traffic statistics and performance metrics retrieved',
              keyMetrics: {
                totalRequests: result.data.summary.totalRequests,
                errorRate: result.data.http.errorRate,
                avgResponseTime: result.data.http.averageResponseTime,
                activeWebSockets: result.data.websocket.activeConnections,
              },
              nextSteps: [
                'Review error rate and investigate high-error endpoints',
                'Check average response time for performance issues',
                'Examine method and status distributions for patterns',
                'Use query_traffic to investigate specific issues',
              ],
              relatedTools: {
                'query_traffic': 'Get detailed data for specific time periods or hosts',
                'analyze_traffic_patterns': 'Get deeper analysis and anomaly detection',
                'search_traffic': 'Find specific error patterns or slow requests',
                'generate_traffic_report': 'Create comprehensive traffic report',
              },
            },
          };

          return {
            content: [{ type: 'text', text: JSON.stringify(enhancedResult, null, 2) }],
            isError: false,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'get_websocket_messages',
      {
        connectionId: z.string().min(1)
          .describe('WebSocket connection ID from query_traffic results (UUID format)'),
        limit: z.number().int().min(1).max(1000).default(100)
          .describe('Maximum messages to return (1-1000, default: 100). Use multiple calls with offset for pagination.'),
        offset: z.number().int().min(0).default(0)
          .describe('Number of messages to skip for pagination. Use with limit to get all messages.'),
        includeData: z.boolean().default(true)
          .describe('Include message content (default: true). Set to false for just metadata if messages are large.'),
      },
      async (params) => {
        const result = await this.queryTools.getWebSocketMessages(params);

        // Add pagination and analysis guidance to response
        if (result.success && result.data) {
          const enhancedResult = {
            ...result,
            pagination: {
              returned: result.data.messages.length,
              hasMore: result.data.messages.length === params.limit,
              nextOffset: params.offset + params.limit,
              totalMessages: result.data.totalMessages,
              guidance: result.data.messages.length === params.limit
                ? `More messages available - call again with offset: ${params.offset + params.limit}`
                : 'All messages for this connection returned',
            },
            analysis: {
              summary: `Retrieved ${result.data.messages.length} WebSocket messages`,
              connectionStatus: result.data.connection.isActive ? 'Active connection' : 'Closed connection',
              nextSteps: [
                'Examine message content for data patterns',
                'Check message timestamps for communication frequency',
                'Review message directions (sent/received) for flow analysis',
                'Use search_traffic to find related HTTP requests',
              ],
              relatedTools: {
                'query_traffic': 'Find the initial WebSocket handshake request',
                'search_traffic': 'Search for related HTTP requests or WebSocket patterns',
                'get_request_details': 'Get full details of the WebSocket handshake',
              },
            },
          };

          return {
            content: [{ type: 'text', text: JSON.stringify(enhancedResult, null, 2) }],
            isError: false,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    // Log Management Tools
    this.server.tool(
      'clear_all_logs',
      {
        confirm: z.boolean()
          .describe('REQUIRED: Must be true to confirm deletion of ALL traffic data. This action cannot be undone.'),
        preserveSchema: z.boolean().default(true)
          .describe('Keep database schema intact (default: true). Set to false to completely reset database.'),
      },
      async (params) => {
        const result = await this.logTools.clearAllLogs(params);

        // Add safety guidance to response
        if (result.success) {
          const enhancedResult = {
            ...result,
            safety: {
              action: 'All traffic data cleared',
              irreversible: 'This action cannot be undone',
              schemaPreserved: params.preserveSchema,
              nextSteps: [
                'Database is now empty and ready for new traffic capture',
                'Use start_proxy to begin capturing new traffic',
                'Consider export_traffic_logs before clearing in the future',
                'Use get_storage_info to verify cleanup',
              ],
              relatedTools: {
                'start_proxy': 'Begin capturing new traffic data',
                'get_storage_info': 'Verify database is empty',
                'export_traffic_logs': 'Export data before clearing (for future use)',
              },
            },
          };

          return {
            content: [{ type: 'text', text: JSON.stringify(enhancedResult, null, 2) }],
            isError: false,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'clear_logs_by_timerange',
      {
        startDate: z.string().describe('ISO 8601 date-time string (e.g., 2023-12-01T10:00:00Z)'),
        endDate: z.string().describe('ISO 8601 date-time string (e.g., 2023-12-01T23:59:59Z)'),
        confirm: z.boolean().default(false),
      },
      async (params) => {
        const result = await this.logTools.clearLogsByTimerange(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'clear_logs_by_filter',
      {
        filters: z.object({
          host: z.string().optional(),
          method: z.string().optional(),
          statusCode: z.number().int().optional(),
          protocol: z.enum(['http', 'https', 'ws', 'wss']).optional(),
        }),
        confirm: z.boolean().default(false),
      },
      async (params) => {
        const result = await this.logTools.clearLogsByFilter(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'get_storage_info',
      {},
      async () => {
        const result = await this.logTools.getStorageInfo();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'cleanup_old_logs',
      {
        retentionDays: z.number().int().min(1),
        dryRun: z.boolean().default(false),
      },
      async (params) => {
        const result = await this.logTools.cleanupOldLogs(params);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'vacuum_database',
      {},
      async () => {
        const result = await this.logTools.vacuumDatabase();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    // Analysis Tools
    this.server.tool(
      'analyze_traffic_patterns',
      {
        timeRange: z.object({
          start: z.string().describe('ISO 8601 date-time string (e.g., 2023-12-01T10:00:00Z)'),
          end: z.string().describe('ISO 8601 date-time string (e.g., 2023-12-01T23:59:59Z)'),
        }).optional(),
      },
      async (params) => {
        const result = await this.analysisTools.analyzeTrafficPatterns(params.timeRange);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    this.server.tool(
      'generate_traffic_report',
      {
        timeRange: z.object({
          start: z.string().describe('ISO 8601 date-time string (e.g., 2023-12-01T10:00:00Z)'),
          end: z.string().describe('ISO 8601 date-time string (e.g., 2023-12-01T23:59:59Z)'),
        }).optional(),
      },
      async (params) => {
        const result = await this.analysisTools.generateTrafficReport(params.timeRange);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );

    // Export Tools
    this.server.tool(
      'export_traffic_logs',
      {
        format: z.enum(['json', 'csv', 'har'])
          .describe('Export format: json (structured data), csv (spreadsheet), har (HTTP Archive for browser tools)'),
        filters: z.object({
          host: z.string().optional()
            .describe('Filter by hostname (e.g., "api.example.com")'),
          method: z.string().optional()
            .describe('HTTP method filter (e.g., "GET", "POST")'),
          statusCode: z.number().int().optional()
            .describe('HTTP status code filter (e.g., 200, 404, 500)'),
          protocol: z.enum(['http', 'https', 'ws', 'wss']).optional()
            .describe('Protocol filter'),
          startDate: z.string().optional()
            .describe('Start time filter - ISO 8601 date-time string (e.g., 2023-12-01T10:00:00Z)'),
          endDate: z.string().optional()
            .describe('End time filter - ISO 8601 date-time string (e.g., 2023-12-01T23:59:59Z)'),
        }).optional().describe('Optional filters to limit exported data'),
        includeBody: z.boolean().default(false)
          .describe('Include request/response body content (significantly increases file size)'),
        includeHeaders: z.boolean().default(true)
          .describe('Include request/response headers in export'),
        maxEntries: z.number().int().min(1).max(100000).default(10000)
          .describe('Maximum number of entries to export (1-100,000, default: 10,000)'),
        outputPath: z.string().default('./exports')
          .describe('Directory path for exported files (default: ./exports)'),
      },
      async (params) => {
        const result = await this.exportTools.exportTrafficLogs(params);

        // Add export guidance to response
        if (result.success && result.data) {
          const enhancedResult = {
            ...result,
            export: {
              format: params.format,
              filePath: result.data.path,
              entriesExported: result.data.entriesExported.total,
              fileSize: result.data.fileSize,
              nextSteps: [
                'File exported successfully to specified location',
                'Use external tools to analyze exported data',
                'Import HAR files into browser dev tools for analysis',
                'Open CSV files in spreadsheet applications',
              ],
              formatGuidance: {
                json: 'Structured data format, good for programmatic analysis',
                csv: 'Spreadsheet format, good for Excel/Google Sheets analysis',
                har: 'HTTP Archive format, import into browser dev tools',
              },
              relatedTools: {
                'get_storage_info': 'Check remaining data in database',
                'clear_logs_by_filter': 'Clear exported data if no longer needed',
                'query_traffic': 'Verify what data was exported',
              },
            },
          };

          return {
            content: [{ type: 'text', text: JSON.stringify(enhancedResult, null, 2) }],
            isError: false,
          };
        }

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.success,
        };
      },
    );
  }

  private setupResources(): void {
    // Proxy status resource
    this.server.resource(
      'proxy-status',
      'proxy://status',
      async () => {
        const result = await this.proxyTools.getProxyStatus();
        return {
          contents: [{
            uri: 'proxy://status',
            text: JSON.stringify(result.data, null, 2),
            mimeType: 'application/json',
          }],
        };
      },
    );

    // Auto-start status resource
    this.server.resource(
      'auto-start-status',
      'proxy://auto-start',
      async () => {
        const result = await this.proxyTools.getAutoStartStatus();
        return {
          contents: [{
            uri: 'proxy://auto-start',
            text: JSON.stringify(result.data, null, 2),
            mimeType: 'application/json',
          }],
        };
      },
    );

    // Health status resource
    this.server.resource(
      'health-status',
      'proxy://health',
      async () => {
        const result = await this.proxyTools.getHealthStatus();
        return {
          contents: [{
            uri: 'proxy://health',
            text: JSON.stringify(result.data, null, 2),
            mimeType: 'application/json',
          }],
        };
      },
    );

    // Storage info resource
    this.server.resource(
      'storage-info',
      'storage://info',
      async () => {
        const result = await this.logTools.getStorageInfo();
        return {
          contents: [{
            uri: 'storage://info',
            text: JSON.stringify(result.data, null, 2),
            mimeType: 'application/json',
          }],
        };
      },
    );

    // Traffic stats resource
    this.server.resource(
      'traffic-stats',
      'traffic://stats',
      async () => {
        const result = await this.queryTools.getTrafficStats();
        return {
          contents: [{
            uri: 'traffic://stats',
            text: JSON.stringify(result.data, null, 2),
            mimeType: 'application/json',
          }],
        };
      },
    );
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);

    console.error('MCP Proxy Traffic Server started');
  }

  async cleanup(): Promise<void> {
    // Stop proxy server if running
    if (this.proxyTools) {
      try {
        await this.proxyTools.stopProxy();
      } catch (error) {
        console.error('Error stopping proxy during cleanup:', error);
      }
    }

    // Cleanup tool resources
    try {
      await Promise.all([
        this.logTools?.cleanup(),
        this.analysisTools?.cleanup(),
        this.exportTools?.cleanup(),
      ]);
    } catch (error) {
      console.error('Error cleaning up tools:', error);
    }

    // Close server connection
    if (this.server) {
      try {
        await this.server.close();
      } catch (error) {
        console.error('Error closing server during cleanup:', error);
      }
    }
  }
}

// Main execution
async function main(): Promise<void> {
  try {
    // Parse command line arguments
    const args = ArgumentParser.parse(process.argv);

    if (args.help) {
      console.log(ArgumentParser.generateHelp());
      process.exit(0);
    }

    if (args.version) {
      console.log('netcap-mcp v1.0.0');
      process.exit(0);
    }

    // Build configuration from arguments
    const config = ConfigBuilder.buildFromArgs(args);

    // Validate configuration
    const validation = ConfigBuilder.validateConfiguration(config);
    if (!validation.valid) {
      console.error(`Configuration error: ${validation.error}`);
      process.exit(1);
    }

    // Create and start MCP server
    const autoStart = args.autoStart !== false; // Default to true unless explicitly set to false
    const server = new NetCapMcpServer(autoStart, config);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.error('Shutting down...');
      await server.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.error('Shutting down...');
      await server.cleanup();
      process.exit(0);
    });

    // Start the server
    await server.start();

  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { NetCapMcpServer };
