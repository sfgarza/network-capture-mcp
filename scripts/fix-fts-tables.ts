#!/usr/bin/env tsx

/**
 * Fix FTS Tables Script
 * 
 * This script fixes the FTS table structure by dropping and recreating them
 * with the correct column names.
 */

import Database from 'better-sqlite3';
import { existsSync } from 'fs';

async function fixFTSTables(dbPath: string = './traffic.db') {
  if (!existsSync(dbPath)) {
    console.error(`❌ Database file not found: ${dbPath}`);
    process.exit(1);
  }

  console.log('🔧 Fixing FTS tables...');
  console.log(`Database: ${dbPath}`);

  const db = new Database(dbPath);

  try {
    // Drop existing FTS tables and triggers
    console.log('🗑️  Dropping existing FTS tables and triggers...');
    
    db.exec(`
      DROP TRIGGER IF EXISTS http_traffic_fts_insert;
      DROP TRIGGER IF EXISTS http_traffic_fts_delete;
      DROP TRIGGER IF EXISTS http_traffic_fts_update;
      DROP TRIGGER IF EXISTS websocket_traffic_fts_insert;
      DROP TRIGGER IF EXISTS websocket_traffic_fts_delete;
      DROP TRIGGER IF EXISTS websocket_traffic_fts_update;
      
      DROP TABLE IF EXISTS http_traffic_fts;
      DROP TABLE IF EXISTS websocket_traffic_fts;
    `);

    // Create new FTS tables with correct structure
    console.log('🆕 Creating new FTS tables...');
    
    db.exec(`
      CREATE VIRTUAL TABLE http_traffic_fts USING fts5(
        id, url, request_headers, request_body, response_body,
        content='http_traffic',
        content_rowid='rowid'
      );

      CREATE VIRTUAL TABLE websocket_traffic_fts USING fts5(
        id, url, headers,
        content='websocket_connections',
        content_rowid='rowid'
      );
    `);

    // Create triggers
    console.log('⚡ Creating triggers...');
    
    db.exec(`
      CREATE TRIGGER http_traffic_fts_insert AFTER INSERT ON http_traffic BEGIN
        INSERT INTO http_traffic_fts(rowid, id, url, request_headers, request_body, response_body)
        VALUES (new.rowid, new.id, new.url, new.request_headers, new.request_body, new.response_body);
      END;

      CREATE TRIGGER http_traffic_fts_delete AFTER DELETE ON http_traffic BEGIN
        INSERT INTO http_traffic_fts(http_traffic_fts, rowid, id, url, request_headers, request_body, response_body)
        VALUES ('delete', old.rowid, old.id, old.url, old.request_headers, old.request_body, old.response_body);
      END;

      CREATE TRIGGER http_traffic_fts_update AFTER UPDATE ON http_traffic BEGIN
        INSERT INTO http_traffic_fts(http_traffic_fts, rowid, id, url, request_headers, request_body, response_body)
        VALUES ('delete', old.rowid, old.id, old.url, old.request_headers, old.request_body, old.response_body);
        INSERT INTO http_traffic_fts(rowid, id, url, request_headers, request_body, response_body)
        VALUES (new.rowid, new.id, new.url, new.request_headers, new.request_body, new.response_body);
      END;

      CREATE TRIGGER websocket_traffic_fts_insert AFTER INSERT ON websocket_connections BEGIN
        INSERT INTO websocket_traffic_fts(rowid, id, url, headers)
        VALUES (new.rowid, new.id, new.url, new.headers);
      END;

      CREATE TRIGGER websocket_traffic_fts_delete AFTER DELETE ON websocket_connections BEGIN
        INSERT INTO websocket_traffic_fts(websocket_traffic_fts, rowid, id, url, headers)
        VALUES ('delete', old.rowid, old.id, old.url, old.headers);
      END;

      CREATE TRIGGER websocket_traffic_fts_update AFTER UPDATE ON websocket_connections BEGIN
        INSERT INTO websocket_traffic_fts(websocket_traffic_fts, rowid, id, url, headers)
        VALUES ('delete', old.rowid, old.id, old.url, old.headers);
        INSERT INTO websocket_traffic_fts(rowid, id, url, headers)
        VALUES (new.rowid, new.id, new.url, new.headers);
      END;
    `);

    // Rebuild FTS tables with existing data
    console.log('🔄 Rebuilding FTS tables with existing data...');
    
    try {
      db.exec(`
        INSERT INTO http_traffic_fts(http_traffic_fts) VALUES('rebuild');
        INSERT INTO websocket_traffic_fts(websocket_traffic_fts) VALUES('rebuild');
      `);
      console.log('✅ FTS tables rebuilt successfully');
    } catch (error) {
      console.warn('⚠️  FTS rebuild warning:', error instanceof Error ? error.message : String(error));
    }

    // Verify the fix
    console.log('🔍 Verifying FTS tables...');
    
    const httpFtsCount = db.prepare('SELECT COUNT(*) as count FROM http_traffic_fts').get() as { count: number };
    const wsFtsCount = db.prepare('SELECT COUNT(*) as count FROM websocket_traffic_fts').get() as { count: number };
    
    console.log(`   HTTP FTS entries: ${httpFtsCount.count}`);
    console.log(`   WebSocket FTS entries: ${wsFtsCount.count}`);

    // Test a simple FTS query
    try {
      const testResult = db.prepare(`
        SELECT COUNT(*) as count FROM http_traffic_fts 
        WHERE http_traffic_fts MATCH 'google'
      `).get() as { count: number };
      console.log(`   FTS test query 'google': ${testResult.count} matches`);
    } catch (error) {
      console.warn('⚠️  FTS test query failed:', error instanceof Error ? error.message : String(error));
    }

    console.log('✅ FTS tables fixed successfully!');

  } catch (error) {
    console.error('❌ Failed to fix FTS tables:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    db.close();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  let dbPath = './traffic.db';

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--db-path':
        dbPath = args[++i];
        break;
      case '--help':
        console.log(`
Usage: tsx scripts/fix-fts-tables.ts [options]

Options:
  --db-path <path>    Database file path (default: ./traffic.db)
  --help              Show this help message

Examples:
  tsx scripts/fix-fts-tables.ts
  tsx scripts/fix-fts-tables.ts --db-path ./custom.db
        `);
        process.exit(0);
    }
  }

  await fixFTSTables(dbPath);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
