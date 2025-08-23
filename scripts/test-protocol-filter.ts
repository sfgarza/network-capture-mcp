#!/usr/bin/env tsx

/**
 * Test Protocol Filter Fix
 * 
 * This script tests the protocol filtering fix to ensure it works correctly.
 */

import { QueryTools } from '../src/tools/query-tools.js';

async function testProtocolFilter() {
  console.log('🧪 Testing Protocol Filter Fix');
  console.log('=' .repeat(50));

  const queryTools = new QueryTools();

  try {
    // Test 1: Filter for WSS only
    console.log('\n🔍 Test 1: Filter for WSS protocol only');
    const wssResult = await queryTools.queryTraffic({
      filters: { protocol: 'wss' },
      limit: 10,
    });

    if (wssResult.success) {
      const entries = wssResult.data?.entries || [];
      console.log(`   Found ${entries.length} entries`);
      
      // Check that all entries are WSS
      const allWSS = entries.every(entry => entry.protocol === 'wss');
      console.log(`   All entries are WSS: ${allWSS ? '✅' : '❌'}`);
      
      if (!allWSS) {
        console.log('   Protocols found:', [...new Set(entries.map(e => e.protocol))]);
      }
    } else {
      console.log(`   ❌ Query failed: ${wssResult.message}`);
    }

    // Test 2: Filter for HTTPS only
    console.log('\n🔍 Test 2: Filter for HTTPS protocol only');
    const httpsResult = await queryTools.queryTraffic({
      filters: { protocol: 'https' },
      limit: 10,
    });

    if (httpsResult.success) {
      const entries = httpsResult.data?.entries || [];
      console.log(`   Found ${entries.length} entries`);
      
      // Check that all entries are HTTPS
      const allHTTPS = entries.every(entry => entry.protocol === 'https');
      console.log(`   All entries are HTTPS: ${allHTTPS ? '✅' : '❌'}`);
      
      if (!allHTTPS) {
        console.log('   Protocols found:', [...new Set(entries.map(e => e.protocol))]);
      }
    } else {
      console.log(`   ❌ Query failed: ${httpsResult.message}`);
    }

    // Test 3: Filter for HTTP only
    console.log('\n🔍 Test 3: Filter for HTTP protocol only');
    const httpResult = await queryTools.queryTraffic({
      filters: { protocol: 'http' },
      limit: 10,
    });

    if (httpResult.success) {
      const entries = httpResult.data?.entries || [];
      console.log(`   Found ${entries.length} entries`);
      
      // Check that all entries are HTTP
      const allHTTP = entries.every(entry => entry.protocol === 'http');
      console.log(`   All entries are HTTP: ${allHTTP ? '✅' : '❌'}`);
      
      if (!allHTTP) {
        console.log('   Protocols found:', [...new Set(entries.map(e => e.protocol))]);
      }
    } else {
      console.log(`   ❌ Query failed: ${httpResult.message}`);
    }

    // Test 4: Filter for WS only
    console.log('\n🔍 Test 4: Filter for WS protocol only');
    const wsResult = await queryTools.queryTraffic({
      filters: { protocol: 'ws' },
      limit: 10,
    });

    if (wsResult.success) {
      const entries = wsResult.data?.entries || [];
      console.log(`   Found ${entries.length} entries`);
      
      // Check that all entries are WS
      const allWS = entries.every(entry => entry.protocol === 'ws');
      console.log(`   All entries are WS: ${allWS ? '✅' : '❌'}`);
      
      if (!allWS) {
        console.log('   Protocols found:', [...new Set(entries.map(e => e.protocol))]);
      }
    } else {
      console.log(`   ❌ Query failed: ${wsResult.message}`);
    }

    // Test 5: No filter (should return mixed)
    console.log('\n🔍 Test 5: No protocol filter (should return mixed)');
    const mixedResult = await queryTools.queryTraffic({
      limit: 10,
    });

    if (mixedResult.success) {
      const entries = mixedResult.data?.entries || [];
      console.log(`   Found ${entries.length} entries`);
      
      const protocols = [...new Set(entries.map(e => e.protocol))];
      console.log(`   Protocols found: ${protocols.join(', ')}`);
      console.log(`   Mixed protocols: ${protocols.length > 1 ? '✅' : '⚠️'}`);
    } else {
      console.log(`   ❌ Query failed: ${mixedResult.message}`);
    }

    console.log('\n✅ Protocol filter tests completed');

  } catch (error) {
    console.error('\n❌ Test failed:', error instanceof Error ? error.message : String(error));
  } finally {
    await queryTools.cleanup();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
Usage: tsx scripts/test-protocol-filter.ts

This script tests the protocol filtering fix to ensure:
1. WSS filter returns only WebSocket Secure traffic
2. HTTPS filter returns only HTTP Secure traffic  
3. HTTP filter returns only HTTP traffic
4. WS filter returns only WebSocket traffic
5. No filter returns mixed traffic types

Examples:
  tsx scripts/test-protocol-filter.ts
    `);
    process.exit(0);
  }

  await testProtocolFilter();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
