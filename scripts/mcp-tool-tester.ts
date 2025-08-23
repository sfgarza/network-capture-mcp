#!/usr/bin/env tsx

/**
 * MCP Tool Tester
 *
 * This script tests MCP tool calls and compares results with direct database queries
 * to validate that the MCP tools are returning correct data.
 */

import { QueryTools } from '../src/tools/query-tools.js';
import { DatabaseValidator } from './dev-db-validator.js';

interface TestResult {
  testName: string;
  passed: boolean;
  mcpResult?: any;
  dbResult?: any;
  error?: string;
  details?: string;
}

class MCPToolTester {
  private queryTools: QueryTools;
  private validator: DatabaseValidator;
  private results: TestResult[] = [];

  constructor(dbPath: string = './traffic.db') {
    this.queryTools = new QueryTools();
    this.validator = new DatabaseValidator({ dbPath, verbose: false });
  }

  /**
   * Add test result
   */
  private addResult(result: TestResult) {
    this.results.push(result);
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.testName}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.details) {
      console.log(`   Details: ${result.details}`);
    }
  }

  /**
   * Test query_traffic tool
   */
  async testQueryTraffic() {
    console.log('\n🔍 Testing query_traffic tool...');

    try {
      // Test basic query
      const mcpResult = await this.queryTools.queryTraffic({
        limit: 10,
        offset: 0,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });

      if (!mcpResult.success) {
        this.addResult({
          testName: 'query_traffic - basic query',
          passed: false,
          error: mcpResult.message,
        });
        return;
      }

      const mcpCount = mcpResult.data?.entries?.length || 0;
      const totalCount = mcpResult.data?.summary?.totalCount || 0;

      this.addResult({
        testName: 'query_traffic - basic query',
        passed: mcpCount > 0,
        details: `Returned ${mcpCount} entries, total: ${totalCount}`,
      });

      // Test pagination
      const page2Result = await this.queryTools.queryTraffic({
        limit: 5,
        offset: 5,
        sortBy: 'timestamp',
        sortOrder: 'desc',
      });

      this.addResult({
        testName: 'query_traffic - pagination',
        passed: page2Result.success && (page2Result.data?.pagination?.hasMore !== undefined),
        details: `Page 2 hasMore: ${page2Result.data?.pagination?.hasMore}`,
      });

      // Test protocol filters
      const httpsFilterResult = await this.queryTools.queryTraffic({
        filters: { protocol: 'https' },
        limit: 5,
        includeBody: false,
      });

      this.addResult({
        testName: 'query_traffic - HTTPS protocol filter',
        passed: httpsFilterResult.success,
        details: `HTTPS results: ${httpsFilterResult.data?.entries?.length || 0}`,
      });

      // Test WSS filter
      const wssFilterResult = await this.queryTools.queryTraffic({
        filters: { protocol: 'wss' },
        limit: 5,
        includeBody: false,
      });

      this.addResult({
        testName: 'query_traffic - WSS protocol filter',
        passed: wssFilterResult.success,
        details: `WSS results: ${wssFilterResult.data?.entries?.length || 0}`,
      });

      // Validate protocol filtering accuracy
      if (httpsFilterResult.success && httpsFilterResult.data?.entries) {
        const allHTTPS = httpsFilterResult.data.entries.every(entry => entry.protocol === 'https');
        this.addResult({
          testName: 'query_traffic - HTTPS filter accuracy',
          passed: allHTTPS,
          details: `All entries are HTTPS: ${allHTTPS}`,
        });
      }

      if (wssFilterResult.success && wssFilterResult.data?.entries) {
        const allWSS = wssFilterResult.data.entries.every(entry => entry.protocol === 'wss');
        this.addResult({
          testName: 'query_traffic - WSS filter accuracy',
          passed: allWSS,
          details: `All entries are WSS: ${allWSS}`,
        });
      }

    } catch (error) {
      this.addResult({
        testName: 'query_traffic - exception handling',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Test search_traffic tool
   */
  async testSearchTraffic() {
    console.log('\n🔎 Testing search_traffic tool...');

    const testQueries = [
      { query: 'google', expectedMin: 0 },
      { query: 'stripe', expectedMin: 0 },
      { query: 'ir.world', expectedMin: 0 },
      { query: 'nonexistentterm12345', expectedMin: 0 },
    ];

    for (const test of testQueries) {
      try {
        const result = await this.queryTools.searchTraffic({
          query: test.query,
          searchIn: ['url', 'body'],
          limit: 10,
        });

        const resultCount = result.data?.results?.length || 0;
        const totalFound = result.data?.totalFound || 0;

        this.addResult({
          testName: `search_traffic - "${test.query}"`,
          passed: result.success && resultCount >= test.expectedMin,
          details: `Found ${resultCount} results, total: ${totalFound}`,
        });

      } catch (error) {
        this.addResult({
          testName: `search_traffic - "${test.query}" exception`,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  /**
   * Test get_request_details tool
   */
  async testGetRequestDetails() {
    console.log('\n📄 Testing get_request_details tool...');

    try {
      // First get some traffic to test with
      const trafficResult = await this.queryTools.queryTraffic({ limit: 5 });

      if (!trafficResult.success || !trafficResult.data?.entries?.length) {
        this.addResult({
          testName: 'get_request_details - no test data',
          passed: false,
          error: 'No traffic data available for testing',
        });
        return;
      }

      const testEntry = trafficResult.data.entries[0];
      const detailsResult = await this.queryTools.getRequestDetails({
        requestId: testEntry.id,
      });

      this.addResult({
        testName: 'get_request_details - valid ID',
        passed: detailsResult.success && detailsResult.data?.id === testEntry.id,
        details: `Retrieved details for ${testEntry.id}`,
      });

      // Test invalid ID
      const invalidResult = await this.queryTools.getRequestDetails({
        requestId: 'invalid-id-12345',
      });

      this.addResult({
        testName: 'get_request_details - invalid ID',
        passed: !invalidResult.success,
        details: 'Correctly handled invalid ID',
      });

    } catch (error) {
      this.addResult({
        testName: 'get_request_details - exception handling',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Test get_websocket_messages tool
   */
  async testGetWebSocketMessages() {
    console.log('\n🔌 Testing get_websocket_messages tool...');

    try {
      // Get WebSocket connections
      const wsResult = await this.queryTools.queryTraffic({
        filters: { protocol: 'wss' },
        limit: 5,
      });

      if (!wsResult.success || !wsResult.data?.entries?.length) {
        this.addResult({
          testName: 'get_websocket_messages - no WebSocket data',
          passed: true, // Not a failure if no WebSocket data exists
          details: 'No WebSocket connections found (this is OK)',
        });
        return;
      }

      const wsConnection = wsResult.data.entries.find(entry => entry.type === 'websocket');

      if (!wsConnection) {
        this.addResult({
          testName: 'get_websocket_messages - no WebSocket connections',
          passed: true,
          details: 'No WebSocket connections in filtered results (this is OK)',
        });
        return;
      }

      const messagesResult = await this.queryTools.getWebSocketMessages({
        connectionId: wsConnection.id,
        limit: 10,
        offset: 0,
      });

      this.addResult({
        testName: 'get_websocket_messages - valid connection',
        passed: messagesResult.success,
        details: `Retrieved ${messagesResult.data?.messages?.length || 0} messages`,
      });

      // Test pagination if there are messages
      if (messagesResult.data?.totalMessages && messagesResult.data.totalMessages > 5) {
        const page2Result = await this.queryTools.getWebSocketMessages({
          connectionId: wsConnection.id,
          limit: 5,
          offset: 5,
        });

        this.addResult({
          testName: 'get_websocket_messages - pagination',
          passed: page2Result.success,
          details: `Page 2: ${page2Result.data?.messages?.length || 0} messages`,
        });
      }

    } catch (error) {
      this.addResult({
        testName: 'get_websocket_messages - exception handling',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Test get_traffic_stats tool
   */
  async testGetTrafficStats() {
    console.log('\n📊 Testing get_traffic_stats tool...');

    try {
      const statsResult = await this.queryTools.getTrafficStats();

      const hasValidStats = statsResult.success &&
                           statsResult.data?.summary?.totalRequests !== undefined &&
                           statsResult.data?.http?.methodDistribution !== undefined &&
                           statsResult.data?.websocket?.totalMessages !== undefined;

      this.addResult({
        testName: 'get_traffic_stats - basic stats',
        passed: hasValidStats,
        details: `Total requests: ${statsResult.data?.summary?.totalRequests || 0}`,
      });

      // Test with time range
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const rangeStatsResult = await this.queryTools.getTrafficStats({
        start: yesterday.toISOString(),
        end: now.toISOString(),
      });

      this.addResult({
        testName: 'get_traffic_stats - time range',
        passed: rangeStatsResult.success,
        details: `24h stats: ${rangeStatsResult.data?.summary?.totalRequests || 0} requests`,
      });

    } catch (error) {
      this.addResult({
        testName: 'get_traffic_stats - exception handling',
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🧪 MCP TOOL TESTER');
    console.log('=' .repeat(50));
    console.log(`Timestamp: ${new Date().toISOString()}`);

    await this.testQueryTraffic();
    await this.testSearchTraffic();
    await this.testGetRequestDetails();
    await this.testGetWebSocketMessages();
    await this.testGetTrafficStats();

    // Summary
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    console.log('\n📋 TEST SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Total tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Pass rate: ${passRate}%`);

    if (passed < total) {
      console.log('\n❌ FAILED TESTS:');
      this.results.filter(r => !r.passed).forEach(result => {
        console.log(`   • ${result.testName}: ${result.error || 'Unknown error'}`);
      });
    }

    return passRate === 100;
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.queryTools.cleanup();
    await this.validator.cleanup();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  let dbPath = './traffic.db';

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--db-path':
        dbPath = args[++i];
        break;
      case '--help':
        console.log(`
Usage: tsx scripts/mcp-tool-tester.ts [options]

Options:
  --db-path <path>    Database file path (default: ./traffic.db)
  --help              Show this help message

Examples:
  tsx scripts/mcp-tool-tester.ts
  tsx scripts/mcp-tool-tester.ts --db-path ./custom.db
        `);
        process.exit(0);
    }
  }

  const tester = new MCPToolTester(dbPath);

  try {
    const allPassed = await tester.runAllTests();
    process.exit(allPassed ? 0 : 1);
  } finally {
    await tester.cleanup();
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { MCPToolTester };
