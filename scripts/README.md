# Development Scripts

This directory contains development and validation scripts for the network-capture-mcp project.

## 🧪 Available Scripts

### 1. Database Validator (`dev-db-validator.ts`)

Comprehensive database querying and validation tool that provides direct access to the SQLite database.

**Features:**
- 📊 Database schema analysis
- 📈 Traffic data summary and statistics
- 🔍 Search functionality testing
- 📄 Pagination validation
- 🔧 FTS (Full Text Search) diagnostics
- 🛠️ MCP tool result validation

**Usage:**
```bash
# Basic validation
npm run validate-db

# Full validation with all tests
npm run validate-db:all

# Custom database path
tsx scripts/dev-db-validator.ts --db-path ./custom.db --all

# Specific tests
tsx scripts/dev-db-validator.ts --verbose --test-search --check-fts
```

**Options:**
- `--db-path <path>` - Database file path (default: ./traffic.db)
- `--verbose` - Show detailed output
- `--test-search` - Test search functionality
- `--validate-pagination` - Test pagination functionality
- `--check-fts` - Check FTS functionality
- `--all` - Run all tests with verbose output

### 2. MCP Tool Tester (`mcp-tool-tester.ts`)

Tests MCP tool calls and validates their results against expected behavior.

**Features:**
- 🔍 Tests all query tools (query_traffic, search_traffic, etc.)
- 📊 Validates tool responses and data integrity
- 🧪 Exception handling verification
- 📋 Comprehensive test reporting
- ✅ Pass/fail validation with detailed feedback

**Usage:**
```bash
# Run all MCP tool tests
npm run test-mcp-tools

# Custom database path
tsx scripts/mcp-tool-tester.ts --db-path ./custom.db
```

### 3. Combined Development Validation

Run both database validation and MCP tool testing in sequence.

**Usage:**
```bash
# Run complete validation suite
npm run dev-validate
```

## 📊 Example Output

### Database Validator Output:
```
🚀 PROXY TRAFFIC MCP - DATABASE VALIDATOR
============================================================
Database: ./traffic.db
Timestamp: 2025-01-20T10:30:00.000Z

🗄️  DATABASE SCHEMA INFORMATION
==================================================
📋 Table: http_traffic
   Columns: id (TEXT), timestamp (INTEGER), method (TEXT), url (TEXT)...
   Rows: 1,247

📋 Table: websocket_connections
   Columns: id (TEXT), timestamp (INTEGER), url (TEXT), host (TEXT)...
   Rows: 23

📋 DATABASE SUMMARY REPORT
==================================================
📈 Traffic Summary:
   HTTP Requests: 1,247
   WebSocket Connections: 23
   WebSocket Messages: 3,891
   Total Traffic Entries: 1,270

⏱️  Time Range:
   Earliest: 2025-01-19T08:15:30.000Z
   Latest: 2025-01-20T10:25:45.000Z
   Duration: 26.17 hours

🌐 Top Hosts:
   1. api.example.com: 456 requests
   2. cdn.example.com: 234 requests
   3. analytics.google.com: 189 requests

🔍 SEARCH FUNCTIONALITY TEST
==================================================
🔎 Testing search: "google"
   Direct storage search: 108 results

🔎 Testing search: "stripe"
   Direct storage search: 15 results

✅ VALIDATION COMPLETE
```

### MCP Tool Tester Output:
```
🧪 MCP TOOL TESTER
==================================================
Timestamp: 2025-01-20T10:30:00.000Z

🔍 Testing query_traffic tool...
✅ query_traffic - basic query
✅ query_traffic - pagination
✅ query_traffic - protocol filter

🔎 Testing search_traffic tool...
✅ search_traffic - "google"
✅ search_traffic - "stripe"
✅ search_traffic - "ir.world"

📄 Testing get_request_details tool...
✅ get_request_details - valid ID
✅ get_request_details - invalid ID

📋 TEST SUMMARY
==================================================
Total tests: 12
Passed: 12
Failed: 0
Pass rate: 100%
```

## 🛠️ Development Workflow

### Daily Development
```bash
# Quick validation during development
npm run validate-db

# Full validation before commits
npm run dev-validate
```

### Debugging Issues
```bash
# Check database structure and content
npm run validate-db -- --verbose

# Test specific functionality
tsx scripts/dev-db-validator.ts --test-search --check-fts

# Validate MCP tools specifically
npm run test-mcp-tools
```

### Custom Database Testing
```bash
# Test with different database
tsx scripts/dev-db-validator.ts --db-path ./test.db --all
tsx scripts/mcp-tool-tester.ts --db-path ./test.db
```

## 🔧 Script Architecture

### DatabaseValidator Class
- Direct SQLite database access
- Schema introspection
- Raw data querying
- Performance analysis

### MCPToolTester Class
- MCP tool integration testing
- Result validation
- Error handling verification
- Comprehensive reporting

### Validation Features
- **Data Integrity**: Ensures MCP tools return correct data
- **Performance Monitoring**: Tracks query performance
- **Error Detection**: Identifies issues early
- **Regression Testing**: Validates changes don't break functionality

## 📝 Adding New Tests

### Database Validator
```typescript
// Add new validation method
async validateNewFeature() {
  console.log('\n🆕 NEW FEATURE VALIDATION');
  // Your validation logic here
}

// Add to runValidation()
await this.validateNewFeature();
```

### MCP Tool Tester
```typescript
// Add new tool test
async testNewTool() {
  console.log('\n🔧 Testing new_tool...');

  const result = await this.queryTools.newTool({
    // test parameters
  });

  this.addResult({
    testName: 'new_tool - basic functionality',
    passed: result.success,
    details: `Result: ${result.data}`,
  });
}

// Add to runAllTests()
await this.testNewTool();
```

## 🎯 Best Practices

1. **Run validation before commits** to catch issues early
2. **Use verbose mode** when debugging specific problems
3. **Test with different database states** (empty, small, large datasets)
4. **Validate both success and error cases** in MCP tools
5. **Monitor performance** with large datasets
6. **Keep scripts updated** as new features are added

## 🚨 Troubleshooting

### Common Issues

**Database not found:**
```bash
# Check database path
ls -la ./traffic.db

# Use custom path
npm run validate-db -- --db-path ./path/to/traffic.db
```

**FTS not working:**
```bash
# Check FTS status
npm run validate-db -- --check-fts

# Rebuild FTS tables (if needed)
# This would be implemented as a separate tool
```

**MCP tools failing:**
```bash
# Run detailed MCP validation
npm run test-mcp-tools

# Check specific tool
tsx scripts/mcp-tool-tester.ts --verbose
```

These scripts provide comprehensive validation and debugging capabilities for the network-capture-mcp project, ensuring data integrity and tool functionality throughout development.
