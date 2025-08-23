# MCP Tool Context Guide

This guide explains how to add rich context to MCP server tools to help AI agents understand how to use them effectively.

## Key Strategies for Tool Context

### 1. **Enhanced Parameter Descriptions**

Use `.describe()` on every parameter to explain:
- **Purpose**: What the parameter does
- **Examples**: Concrete examples of valid values
- **Constraints**: Limits, formats, or validation rules
- **Usage patterns**: When and how to use it

```typescript
// ❌ Poor context
limit: z.number().int().min(1).max(1000).default(100)

// ✅ Rich context
limit: z.number().int().min(1).max(1000).default(100)
  .describe('Maximum number of results to return (1-1000, default: 100). Use multiple calls with offset for pagination.')
```

### 2. **Pagination Guidance**

For tools that return paginated results, explicitly guide agents on how to get all data:

```typescript
this.server.tool(
  "query_traffic",
  {
    limit: z.number().int().min(1).max(1000).default(100)
      .describe('Maximum results per call. Use multiple calls with offset to get all results.'),
    offset: z.number().int().min(0).default(0)
      .describe('Number of results to skip for pagination. Use with limit to get all results.'),
  },
  async (params) => {
    const result = await this.queryTools.queryTraffic(params);

    // Add pagination hints in response
    const response = {
      ...result,
      pagination: {
        hasMore: result.data?.length === params.limit,
        nextOffset: params.offset + params.limit,
        suggestion: result.data?.length === params.limit
          ? `Call again with offset: ${params.offset + params.limit} to get more results`
          : 'No more results available'
      }
    };

    return {
      content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
      isError: !result.success
    };
  }
);
```

### 3. **Tool Name Conventions**

Use descriptive, action-oriented tool names:

```typescript
// ❌ Vague names
"get_data"
"process"
"handle_request"

// ✅ Clear, specific names
"query_traffic_by_filters"
"search_traffic_content"
"export_traffic_to_csv"
"analyze_traffic_patterns"
```

### 4. **Response Context**

Include helpful metadata in responses:

```typescript
async (params) => {
  const result = await this.queryTools.queryTraffic(params);

  const contextualResponse = {
    ...result,
    metadata: {
      totalFound: result.data?.length || 0,
      hasMore: result.data?.length === params.limit,
      filters: params.filters,
      suggestions: {
        nextSteps: result.data?.length === params.limit
          ? ['Use offset parameter to get more results', 'Consider adding filters to narrow results']
          : ['Try different filters if no results found', 'Check time range if looking for recent data']
      }
    }
  };

  return {
    content: [{ type: "text", text: JSON.stringify(contextualResponse, null, 2) }],
    isError: !result.success
  };
}
```

### 5. **Error Context**

Provide actionable error messages:

```typescript
try {
  const result = await this.queryTools.queryTraffic(params);
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    isError: !result.success
  };
} catch (error) {
  const errorResponse = {
    success: false,
    error: error.message,
    suggestions: [
      'Check that the proxy server is running',
      'Verify filter parameters are valid',
      'Try a smaller time range if query is timing out'
    ],
    examples: {
      validTimeRange: {
        startDate: '2023-12-01T10:00:00Z',
        endDate: '2023-12-01T23:59:59Z'
      }
    }
  };

  return {
    content: [{ type: "text", text: JSON.stringify(errorResponse, null, 2) }],
    isError: true
  };
}
```

## Advanced Context Techniques

### 6. **Progress Notifications**

For long-running operations, use progress callbacks:

```typescript
server.tool(
  "export_large_dataset",
  { format: z.enum(['csv', 'json']) },
  async ({ format }, { onprogress }) => {
    const totalSteps = 100;

    for (let i = 0; i < totalSteps; i++) {
      // Report progress
      onprogress?.({
        progress: i / totalSteps,
        total: 1.0,
        message: `Processing step ${i + 1} of ${totalSteps}`
      });

      // Do work...
      await processStep(i);
    }

    return {
      content: [{ type: "text", text: "Export completed!" }]
    };
  }
);
```

### 7. **Related Tool Suggestions**

Help agents discover related functionality:

```typescript
const response = {
  ...result,
  relatedTools: {
    'get_request_details': 'Get full details for a specific request ID',
    'analyze_traffic_patterns': 'Analyze patterns in the returned traffic',
    'export_traffic_logs': 'Export these results to a file'
  }
};
```

### 8. **Usage Examples in Descriptions**

Include concrete examples in parameter descriptions:

```typescript
{
  filters: z.object({
    host: z.string().optional()
      .describe('Filter by hostname. Examples: "api.example.com", "localhost:3000"'),
    statusCode: z.number().int().optional()
      .describe('HTTP status code. Examples: 200 (success), 404 (not found), 500 (server error)'),
    startDate: z.string().optional()
      .describe('Start time in ISO 8601 format. Example: "2023-12-01T10:00:00Z" for Dec 1, 2023 at 10 AM UTC')
  }).optional()
}
```

## Implementation Checklist

When adding context to MCP tools:

- [ ] **Tool name** is descriptive and action-oriented
- [ ] **Every parameter** has a `.describe()` with purpose and examples
- [ ] **Pagination** is clearly explained with guidance on getting all results
- [ ] **Response format** is documented
- [ ] **Error handling** provides actionable suggestions
- [ ] **Related tools** are mentioned when relevant
- [ ] **Examples** are provided for complex parameters
- [ ] **Constraints** (limits, formats) are clearly stated
- [ ] **Default values** are explained
- [ ] **Optional vs required** parameters are clear

## Example: Well-Documented Tool

```typescript
this.server.tool(
  "query_traffic_with_filters",
  {
    filters: z.object({
      host: z.string().optional()
        .describe('Filter by hostname (e.g., "api.example.com", "localhost:3000")'),
      method: z.string().optional()
        .describe('HTTP method filter (e.g., "GET", "POST", "PUT", "DELETE")'),
      statusCode: z.number().int().optional()
        .describe('HTTP status code filter (e.g., 200, 404, 500)'),
      timeRange: z.object({
        start: z.string().describe('Start time - ISO 8601 format (e.g., "2023-12-01T10:00:00Z")'),
        end: z.string().describe('End time - ISO 8601 format (e.g., "2023-12-01T23:59:59Z")')
      }).optional().describe('Time range filter for when requests occurred')
    }).optional().describe('Optional filters to narrow down results. Omit to get all traffic.'),

    limit: z.number().int().min(1).max(1000).default(100)
      .describe('Maximum results per call (1-1000, default: 100). Use multiple calls with offset for pagination.'),

    offset: z.number().int().min(0).default(0)
      .describe('Number of results to skip for pagination. Use with limit to get all results.'),

    includeBody: z.boolean().default(false)
      .describe('Include request/response body content (increases response size significantly)')
  },
  async (params) => {
    // Implementation with rich response context...
  }
);
```

This approach helps AI agents understand not just what parameters exist, but how to use them effectively to accomplish their goals.

## Real-World Examples from Proxy Traffic MCP

### Query Traffic Tool Enhancement

**Before (basic context):**
```typescript
this.server.tool("query_traffic", {
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0)
}, async (params) => { /* ... */ });
```

**After (rich context):**
```typescript
this.server.tool("query_traffic", {
  limit: z.number().int().min(1).max(1000).default(100)
    .describe('Maximum results per call (1-1000, default: 100). Use multiple calls with offset for pagination.'),
  offset: z.number().int().min(0).default(0)
    .describe('Number of results to skip for pagination. Use with limit to get all results.'),
  filters: z.object({
    host: z.string().optional()
      .describe('Filter by hostname (e.g., "api.example.com")'),
    statusCode: z.number().int().optional()
      .describe('HTTP status code filter (e.g., 200, 404, 500)')
  }).optional().describe('Optional filters to narrow down results')
}, async (params) => {
  const result = await this.queryTools.queryTraffic(params);

  // Add pagination guidance to response
  const enhancedResult = {
    ...result,
    pagination: {
      hasMore: result.data?.length === params.limit,
      nextCall: result.data?.length === params.limit
        ? `Call again with offset: ${params.offset + params.limit}`
        : null
    }
  };

  return {
    content: [{ type: "text", text: JSON.stringify(enhancedResult, null, 2) }],
    isError: !result.success
  };
});
```

### WebSocket Messages Tool

**Enhanced with context:**
```typescript
this.server.tool("get_websocket_messages", {
  connectionId: z.string().min(1)
    .describe('WebSocket connection ID from query_traffic results'),
  limit: z.number().int().min(1).max(1000).default(100)
    .describe('Maximum messages to return. Use offset for pagination if connection has many messages.'),
  offset: z.number().int().min(0).default(0)
    .describe('Number of messages to skip. Use for pagination through large message histories.'),
  includeData: z.boolean().default(true)
    .describe('Include message content. Set to false for just metadata if messages are large.')
}, async (params) => {
  // Implementation with guidance...
});
```

## Tool Response Enhancement Patterns

### 1. Pagination Response Pattern

```typescript
const enhancedResponse = {
  success: true,
  data: results,
  pagination: {
    returned: results.length,
    hasMore: results.length === params.limit,
    nextOffset: params.offset + params.limit,
    totalEstimate: "Use get_traffic_stats for total counts",
    guidance: results.length === params.limit
      ? "More results available - call again with increased offset"
      : "All matching results returned"
  },
  usage: {
    nextSteps: [
      "Use get_request_details with specific IDs for full information",
      "Use search_traffic for content-based filtering",
      "Use analyze_traffic_patterns for insights"
    ]
  }
};
```

### 2. Search Tool Response Pattern

```typescript
const searchResponse = {
  success: true,
  data: searchResults,
  searchContext: {
    query: params.query,
    searchedFields: params.searchIn,
    caseSensitive: params.caseSensitive,
    regex: params.regex,
    matchCount: searchResults.length,
    suggestions: searchResults.length === 0 ? [
      "Try a broader search term",
      "Check spelling and case sensitivity",
      "Use regex: false for literal string matching"
    ] : searchResults.length === params.limit ? [
      "More results may be available",
      "Consider adding filters to narrow results",
      "Use offset parameter for pagination"
    ] : []
  }
};
```

### 3. Analysis Tool Response Pattern

```typescript
const analysisResponse = {
  success: true,
  data: analysisResults,
  insights: {
    summary: "Found 3 patterns in traffic data",
    recommendations: [
      "High error rate detected on /api/orders endpoint",
      "Consider implementing caching for /api/reports (slow responses)",
      "Unusual traffic spike detected - investigate potential bot activity"
    ],
    relatedActions: {
      "query_traffic": "Get detailed data for specific patterns",
      "export_traffic_logs": "Export data for external analysis",
      "clear_logs_by_filter": "Clean up old data if needed"
    }
  }
};
```

## Common Patterns for Your Use Case

### Multi-Step Workflows

Guide agents through common multi-step workflows:

```typescript
// In query_traffic response
const workflowGuidance = {
  commonWorkflows: {
    "debugging_errors": [
      "1. Use query_traffic with statusCode filter (4xx, 5xx)",
      "2. Use get_request_details for specific failed requests",
      "3. Use search_traffic to find similar error patterns"
    ],
    "performance_analysis": [
      "1. Use get_traffic_stats for overview",
      "2. Use query_traffic sorted by responseTime",
      "3. Use analyze_traffic_patterns for insights"
    ],
    "security_audit": [
      "1. Use search_traffic for suspicious patterns",
      "2. Use query_traffic filtered by unusual user agents",
      "3. Use analyze_traffic_patterns for anomaly detection"
    ]
  }
};
```

This comprehensive approach ensures AI agents can effectively use your MCP tools and understand how to chain them together for complex tasks.
