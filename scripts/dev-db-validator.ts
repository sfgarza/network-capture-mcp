#!/usr/bin/env tsx

/**
 * Development Database Validator
 *
 * This script provides comprehensive database querying and validation tools
 * for the netcap-mcp project. It can:
 *
 * 1. Query all database entries directly
 * 2. Validate MCP tool call results against raw database data
 * 3. Test search functionality
 * 4. Analyze database structure and content
 * 5. Debug FTS issues
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';
import { SQLiteTrafficStorage } from '../src/storage/sqlite-storage.js';
import { SharedConfig } from '../src/config/shared-config.js';

interface ValidationOptions {
  dbPath?: string;
  verbose?: boolean;
  testSearch?: boolean;
  validatePagination?: boolean;
  checkFTS?: boolean;
}

class DatabaseValidator {
  private db: Database.Database;
  private storage: SQLiteTrafficStorage;
  private options: ValidationOptions;

  constructor(options: ValidationOptions = {}) {
    this.options = {
      dbPath: options.dbPath || './traffic.db',
      verbose: options.verbose || false,
      testSearch: options.testSearch || false,
      validatePagination: options.validatePagination || false,
      checkFTS: options.checkFTS || false,
    };

    if (!existsSync(this.options.dbPath!)) {
      throw new Error(`Database file not found: ${this.options.dbPath}`);
    }

    this.db = new Database(this.options.dbPath!);
    this.storage = new SQLiteTrafficStorage({
      dbPath: this.options.dbPath!,
      enableFTS: true,
    });
  }

  /**
   * Get database schema information
   */
  async getSchemaInfo() {
    console.log('\n🗄️  DATABASE SCHEMA INFORMATION');
    console.log('=' .repeat(50));

    // Get all tables
    const tables = this.db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as { name: string }[];

    for (const table of tables) {
      console.log(`\n📋 Table: ${table.name}`);

      // Get table info
      const columns = this.db.prepare(`PRAGMA table_info(${table.name})`).all();
      console.log('   Columns:', columns.map((col: any) => `${col.name} (${col.type})`).join(', '));

      // Get row count
      const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
      console.log(`   Rows: ${count.count}`);
    }

    // Check for FTS tables
    const ftsTables = this.db.prepare(`
      SELECT name FROM sqlite_master
      WHERE type='table' AND name LIKE '%_fts'
      ORDER BY name
    `).all() as { name: string }[];

    if (ftsTables.length > 0) {
      console.log('\n🔍 FTS TABLES:');
      ftsTables.forEach(table => {
        const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
        console.log(`   ${table.name}: ${count.count} entries`);
      });
    }
  }

  /**
   * Get all HTTP traffic entries
   */
  async getAllHttpTraffic() {
    console.log('\n🌐 HTTP TRAFFIC ENTRIES');
    console.log('=' .repeat(50));

    const entries = this.db.prepare(`
      SELECT id, timestamp, method, url, host, status_code, response_time
      FROM http_traffic
      ORDER BY timestamp DESC
    `).all();

    console.log(`Total HTTP entries: ${entries.length}`);

    if (this.options.verbose && entries.length > 0) {
      console.log('\nSample entries:');
      entries.slice(0, 5).forEach((entry: any, index) => {
        console.log(`${index + 1}. ${entry.method} ${entry.url} (${entry.status_code}) - ${new Date(entry.timestamp).toISOString()}`);
      });
    }

    return entries;
  }

  /**
   * Get all WebSocket traffic entries
   */
  async getAllWebSocketTraffic() {
    console.log('\n🔌 WEBSOCKET TRAFFIC ENTRIES');
    console.log('=' .repeat(50));

    const connections = this.db.prepare(`
      SELECT c.id, c.timestamp, c.url, c.host, c.established_at, c.closed_at,
             COUNT(m.id) as message_count
      FROM websocket_connections c
      LEFT JOIN websocket_messages m ON c.id = m.connection_id
      GROUP BY c.id
      ORDER BY c.timestamp DESC
    `).all();

    console.log(`Total WebSocket connections: ${connections.length}`);

    if (this.options.verbose && connections.length > 0) {
      console.log('\nSample connections:');
      connections.slice(0, 5).forEach((conn: any, index) => {
        const status = conn.closed_at ? 'Closed' : 'Active';
        console.log(`${index + 1}. ${conn.url} (${status}) - ${conn.message_count} messages`);
      });
    }

    return connections;
  }

  /**
   * Test search functionality
   */
  async testSearchFunctionality() {
    if (!this.options.testSearch) return;

    console.log('\n🔍 SEARCH FUNCTIONALITY TEST');
    console.log('=' .repeat(50));

    const testQueries = [
      'google',
      'stripe',
      'ir.world',
      'analytics',
      'POST',
      'javascript'
    ];

    for (const query of testQueries) {
      try {
        console.log(`\n🔎 Testing search: "${query}"`);

        // Test storage search directly
        const results = await this.storage.searchTraffic({
          query,
          searchIn: ['url', 'body'],
          caseSensitive: false,
          regex: false,
        });

        console.log(`   Direct storage search: ${results.length} results`);

        if (this.options.verbose && results.length > 0) {
          results.slice(0, 3).forEach((result, index) => {
            console.log(`   ${index + 1}. ${result.url}`);
          });
        }

      } catch (error) {
        console.error(`   ❌ Search failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Validate pagination functionality
   */
  async validatePagination() {
    if (!this.options.validatePagination) return;

    console.log('\n📄 PAGINATION VALIDATION');
    console.log('=' .repeat(50));

    try {
      // Test HTTP traffic pagination
      const httpTotal = this.db.prepare('SELECT COUNT(*) as count FROM http_traffic').get() as { count: number };
      console.log(`\n📊 HTTP Traffic Pagination (Total: ${httpTotal.count})`);

      const pageSize = 5;
      let offset = 0;
      let totalRetrieved = 0;

      while (offset < Math.min(httpTotal.count, 20)) { // Test first 20 entries
        const httpEntries = await this.storage.queryHttpTraffic({
          limit: pageSize,
          offset: offset,
          sortBy: 'timestamp',
          sortOrder: 'desc',
        });

        console.log(`   Page ${Math.floor(offset / pageSize) + 1}: ${httpEntries.length} entries (offset: ${offset})`);
        totalRetrieved += httpEntries.length;

        if (httpEntries.length < pageSize) break;
        offset += pageSize;
      }

      console.log(`   ✅ Retrieved ${totalRetrieved} entries via pagination`);

      // Test WebSocket pagination
      const wsTotal = this.db.prepare('SELECT COUNT(*) as count FROM websocket_connections').get() as { count: number };
      console.log(`\n🔌 WebSocket Traffic Pagination (Total: ${wsTotal.count})`);

      offset = 0;
      totalRetrieved = 0;

      while (offset < Math.min(wsTotal.count, 15)) { // Test first 15 entries
        const wsEntries = await this.storage.queryWebSocketTraffic({
          limit: pageSize,
          offset: offset,
          sortBy: 'timestamp',
          sortOrder: 'desc',
        });

        console.log(`   Page ${Math.floor(offset / pageSize) + 1}: ${wsEntries.length} entries (offset: ${offset})`);
        totalRetrieved += wsEntries.length;

        if (wsEntries.length < pageSize) break;
        offset += pageSize;
      }

      console.log(`   ✅ Retrieved ${totalRetrieved} entries via pagination`);

    } catch (error) {
      console.error(`   ❌ Pagination test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check FTS functionality
   */
  async checkFTSFunctionality() {
    if (!this.options.checkFTS) return;

    console.log('\n🔍 FTS FUNCTIONALITY CHECK');
    console.log('=' .repeat(50));

    try {
      // Check if FTS tables exist
      const ftsTables = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name LIKE '%_fts'
      `).all() as { name: string }[];

      if (ftsTables.length === 0) {
        console.log('   ❌ No FTS tables found');
        return;
      }

      console.log(`   ✅ Found ${ftsTables.length} FTS tables: ${ftsTables.map(t => t.name).join(', ')}`);

      // Check FTS table contents
      for (const table of ftsTables) {
        try {
          const count = this.db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get() as { count: number };
          console.log(`   📊 ${table.name}: ${count.count} indexed entries`);

          // Try a simple FTS query
          if (count.count > 0) {
            const testResult = this.db.prepare(`
              SELECT COUNT(*) as count FROM ${table.name}
              WHERE ${table.name} MATCH 'google'
            `).get() as { count: number };
            console.log(`   🔎 FTS test query 'google': ${testResult.count} matches`);
          }
        } catch (error) {
          console.error(`   ❌ FTS table ${table.name} error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

    } catch (error) {
      console.error(`   ❌ FTS check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Compare MCP tool results with direct database queries
   */
  async validateMCPToolResults() {
    console.log('\n🔧 MCP TOOL VALIDATION');
    console.log('=' .repeat(50));

    try {
      // Import MCP tools
      const { QueryTools } = await import('../src/tools/query-tools.js');
      const queryTools = new QueryTools();

      // Test query_traffic vs direct database query
      console.log('\n📊 Validating query_traffic tool...');

      const mcpResult = await queryTools.queryTraffic({
        limit: 10,
        offset: 0,
        sortBy: 'timestamp',
        sortOrder: 'desc',
        includeBody: false,
      });

      const dbHttpCount = this.db.prepare('SELECT COUNT(*) as count FROM http_traffic').get() as { count: number };
      const dbWsCount = this.db.prepare('SELECT COUNT(*) as count FROM websocket_connections').get() as { count: number };
      const dbTotal = dbHttpCount.count + dbWsCount.count;

      if (mcpResult.success) {
        const mcpTotal = mcpResult.data?.summary?.totalCount || 0;
        const match = mcpTotal === dbTotal;
        console.log(`   MCP total: ${mcpTotal}, DB total: ${dbTotal} ${match ? '✅' : '❌'}`);
      } else {
        console.log(`   ❌ MCP query failed: ${mcpResult.message}`);
      }

      // Test search functionality
      console.log('\n🔍 Validating search_traffic tool...');

      const searchResult = await queryTools.searchTraffic({
        query: 'google',
        searchIn: ['url'],
        limit: 5,
        caseSensitive: false,
        regex: false,
      });

      if (searchResult.success) {
        const searchCount = searchResult.data?.results?.length || 0;
        console.log(`   Search for 'google': ${searchCount} results ✅`);
      } else {
        console.log(`   ❌ Search failed: ${searchResult.message}`);
      }

      await queryTools.cleanup();

    } catch (error) {
      console.error(`   ❌ MCP validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate database summary report
   */
  async generateSummaryReport() {
    console.log('\n📋 DATABASE SUMMARY REPORT');
    console.log('=' .repeat(50));

    try {
      // Traffic summary
      const httpCount = this.db.prepare('SELECT COUNT(*) as count FROM http_traffic').get() as { count: number };
      const wsCount = this.db.prepare('SELECT COUNT(*) as count FROM websocket_connections').get() as { count: number };
      const wsMessageCount = this.db.prepare('SELECT COUNT(*) as count FROM websocket_messages').get() as { count: number };

      console.log(`📈 Traffic Summary:`);
      console.log(`   HTTP Requests: ${httpCount.count}`);
      console.log(`   WebSocket Connections: ${wsCount.count}`);
      console.log(`   WebSocket Messages: ${wsMessageCount.count}`);
      console.log(`   Total Traffic Entries: ${httpCount.count + wsCount.count}`);

      // Time range
      const timeRange = this.db.prepare(`
        SELECT
          MIN(timestamp) as earliest,
          MAX(timestamp) as latest
        FROM (
          SELECT timestamp FROM http_traffic
          UNION ALL
          SELECT timestamp FROM websocket_connections
        )
      `).get() as { earliest: number; latest: number };

      if (timeRange.earliest && timeRange.latest) {
        const duration = timeRange.latest - timeRange.earliest;
        const hours = Math.round(duration / (1000 * 60 * 60) * 100) / 100;
        console.log(`⏱️  Time Range:`);
        console.log(`   Earliest: ${new Date(timeRange.earliest).toISOString()}`);
        console.log(`   Latest: ${new Date(timeRange.latest).toISOString()}`);
        console.log(`   Duration: ${hours} hours`);
      }

      // Top hosts
      const topHosts = this.db.prepare(`
        SELECT host, COUNT(*) as count
        FROM http_traffic
        GROUP BY host
        ORDER BY count DESC
        LIMIT 5
      `).all() as { host: string; count: number }[];

      if (topHosts.length > 0) {
        console.log(`🌐 Top Hosts:`);
        topHosts.forEach((host, index) => {
          console.log(`   ${index + 1}. ${host.host}: ${host.count} requests`);
        });
      }

      // HTTP methods
      const methods = this.db.prepare(`
        SELECT method, COUNT(*) as count
        FROM http_traffic
        GROUP BY method
        ORDER BY count DESC
      `).all() as { method: string; count: number }[];

      if (methods.length > 0) {
        console.log(`🔧 HTTP Methods:`);
        methods.forEach(method => {
          console.log(`   ${method.method}: ${method.count}`);
        });
      }

      // Status codes
      const statusCodes = this.db.prepare(`
        SELECT status_code, COUNT(*) as count
        FROM http_traffic
        WHERE status_code IS NOT NULL
        GROUP BY status_code
        ORDER BY count DESC
        LIMIT 5
      `).all() as { status_code: number; count: number }[];

      if (statusCodes.length > 0) {
        console.log(`📊 Top Status Codes:`);
        statusCodes.forEach(status => {
          console.log(`   ${status.status_code}: ${status.count}`);
        });
      }

    } catch (error) {
      console.error(`   ❌ Summary report failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Run comprehensive validation
   */
  async runValidation() {
    console.log('🚀 NETCAP MCP - DATABASE VALIDATOR');
    console.log('=' .repeat(60));
    console.log(`Database: ${this.options.dbPath}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);

    try {
      await this.getSchemaInfo();
      await this.getAllHttpTraffic();
      await this.getAllWebSocketTraffic();
      await this.generateSummaryReport();
      await this.testSearchFunctionality();
      await this.validatePagination();
      await this.checkFTSFunctionality();
      await this.validateMCPToolResults();

      console.log('\n✅ VALIDATION COMPLETE');
      console.log('=' .repeat(60));

    } catch (error) {
      console.error('\n❌ VALIDATION FAILED');
      console.error('Error:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.storage.close();
    this.db.close();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options: ValidationOptions = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--db-path':
        options.dbPath = args[++i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--test-search':
        options.testSearch = true;
        break;
      case '--validate-pagination':
        options.validatePagination = true;
        break;
      case '--check-fts':
        options.checkFTS = true;
        break;
      case '--all':
        options.verbose = true;
        options.testSearch = true;
        options.validatePagination = true;
        options.checkFTS = true;
        break;
      case '--help':
        console.log(`
Usage: tsx scripts/dev-db-validator.ts [options]

Options:
  --db-path <path>         Database file path (default: ./traffic.db)
  --verbose                Show detailed output
  --test-search            Test search functionality
  --validate-pagination    Test pagination functionality
  --check-fts              Check FTS functionality
  --all                    Run all tests with verbose output
  --help                   Show this help message

Examples:
  tsx scripts/dev-db-validator.ts --all
  tsx scripts/dev-db-validator.ts --verbose --test-search
  tsx scripts/dev-db-validator.ts --db-path ./custom.db --check-fts
        `);
        process.exit(0);
    }
  }

  const validator = new DatabaseValidator(options);

  try {
    await validator.runValidation();
  } finally {
    await validator.cleanup();
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { DatabaseValidator };
