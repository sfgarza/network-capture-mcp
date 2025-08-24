# Development Guide

This guide covers development setup, testing procedures, contributing guidelines, and code standards for Network Capture MCP.

## Development Setup

### Prerequisites

- **Node.js 18+** - [Download from nodejs.org](https://nodejs.org/)
- **npm** - Included with Node.js
- **Git** - For version control
- **Text editor/IDE** - VS Code recommended

### Initial Setup

1. **Fork and clone** the repository:
```bash
git clone https://github.com/your-username/network-capture-mcp
cd network-capture-mcp
```

2. **Install dependencies**:
```bash
npm install
```

3. **Verify installation**:
```bash
npm test
npm start -- --help
```

### Development Workflow

#### No Build Process Required

This project uses **tsx** to run TypeScript directly without a build step:

- **Faster development** - No compilation wait time
- **Simpler workflow** - Edit TypeScript, run immediately
- **Auto-reload** - Use `npm run dev` for automatic restarts
- **Direct execution** - TypeScript files run natively

#### Development Commands

```bash
# Run in development mode with auto-reload
npm run dev

# Run directly with tsx (no build required)
npm start

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

#### Development Workflow Steps

1. **Edit TypeScript files** in `src/`
2. **Run with tsx**: `npm start` or `npm run dev`
3. **No build step needed** - tsx handles TypeScript compilation on-the-fly
4. **Test changes**: `npm test`
5. **Lint code**: `npm run lint`

### Project Structure

```
src/
├── cli/                 # Command-line interface
├── config/              # Configuration management
├── proxy/               # Mockttp proxy implementation
├── storage/             # SQLite database operations
├── tools/               # MCP tool implementations
├── types/               # TypeScript type definitions
└── index.ts             # Main entry point

scripts/
├── dev-db-validator.ts  # Database validation tools
├── mcp-tool-tester.ts   # MCP tool testing utilities
├── generate-certs.js    # SSL certificate generation
└── test-protocol-filter.ts # Protocol filtering tests

docs/                    # Documentation
tests/                   # Test files
certs/                   # SSL certificates (auto-generated)
```

## Testing

### Automated Testing

Network Capture MCP includes comprehensive testing tools:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui
```

### Development Validation Scripts

```bash
# Validate database and MCP tools
npm run dev-validate

# Test database functionality
npm run validate-db:all

# Test MCP tool functionality
npm run test-mcp-tools

# Test protocol filtering
npm run test-protocol-filter
```

### Manual Testing

```bash
# Start server and test with curl
npm start
curl --proxy http://localhost:8080 https://httpbin.org/get

# Test with your AI agent
# Ask: "Show me all traffic from the last 5 minutes"
```

### Testing Best Practices

1. **Write tests for new features** - 100% test coverage goal
2. **Test both success and error cases** - Include edge cases
3. **Use descriptive test names** - Clear intent and expectations
4. **Mock external dependencies** - Isolate units under test
5. **Test MCP tool integration** - Verify tool responses and parameters

### Test Categories

#### Unit Tests
- **Individual functions** and classes
- **Database operations** and queries
- **Configuration parsing** and validation
- **Error handling** and edge cases

#### Integration Tests
- **MCP tool functionality** end-to-end
- **Proxy server operations** with real traffic
- **Database storage and retrieval** workflows
- **SSL certificate handling** and validation

#### Performance Tests
- **Memory usage** under load
- **Database query performance** with large datasets
- **Proxy throughput** and latency measurements
- **Concurrent connection handling**

## Code Standards

### TypeScript Standards

- **Strict TypeScript** configuration enabled
- **Explicit types** for all public APIs
- **Interface definitions** for complex objects
- **Generic types** where appropriate
- **Proper error handling** with typed exceptions

### Code Style

- **ESLint** for code linting
- **Prettier** for code formatting (if configured)
- **Consistent naming** conventions:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and interfaces
  - `UPPER_SNAKE_CASE` for constants
- **Clear function names** that describe their purpose
- **Comprehensive comments** for complex logic

### File Organization

- **Single responsibility** - One main concept per file
- **Logical grouping** - Related functionality together
- **Clear imports** - Explicit import statements
- **Export organization** - Clear public API boundaries

### Error Handling

```typescript
// ✅ Good - Specific error types
class ProxyStartError extends Error {
  constructor(port: number, cause?: Error) {
    super(`Failed to start proxy on port ${port}`);
    this.name = 'ProxyStartError';
    this.cause = cause;
  }
}

// ✅ Good - Proper error propagation
async function startProxy(config: ProxyConfig): Promise<void> {
  try {
    await mockttpServer.start(config.port);
  } catch (error) {
    throw new ProxyStartError(config.port, error);
  }
}
```

## Contributing

### Getting Started

1. **Fork the repository** on GitHub
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes** with tests
4. **Run validation**: `npm run dev-validate`
5. **Commit with conventional format**: `git commit -m "feat: your feature"`
6. **Push and create PR**: `git push origin feature/your-feature`

### Contribution Guidelines

#### Before Contributing

1. **Check existing issues** - Look for related work
2. **Discuss major changes** - Open an issue for discussion
3. **Read the code** - Understand existing patterns
4. **Run tests** - Ensure everything works

#### Making Changes

1. **Follow code standards** - Use existing patterns
2. **Write tests** - Cover new functionality
3. **Update documentation** - Keep docs current
4. **Test thoroughly** - Manual and automated testing

#### Commit Standards

Use **conventional commits** format:

```bash
# Feature additions
git commit -m "feat: add WebSocket message filtering"

# Bug fixes
git commit -m "fix: resolve database connection timeout"

# Documentation updates
git commit -m "docs: update API reference examples"

# Performance improvements
git commit -m "perf: optimize database query performance"

# Refactoring
git commit -m "refactor: simplify proxy configuration logic"
```

### Pull Request Process

1. **Create descriptive PR title** - Clear summary of changes
2. **Provide detailed description** - What, why, and how
3. **Link related issues** - Reference issue numbers
4. **Include test results** - Show validation passing
5. **Request appropriate reviewers** - Tag maintainers

#### PR Template

```markdown
## Description
Brief description of changes and motivation.

## Changes Made
- List of specific changes
- New features or fixes
- Breaking changes (if any)

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance impact assessed

## Documentation
- [ ] Code comments updated
- [ ] API documentation updated
- [ ] User documentation updated (if needed)

## Checklist
- [ ] Code follows project standards
- [ ] Tests cover new functionality
- [ ] No breaking changes (or properly documented)
- [ ] Performance impact is acceptable
```

### Areas for Contribution

#### Bug Fixes
- **Fix issues** and improve reliability
- **Handle edge cases** better
- **Improve error messages** and debugging
- **Performance optimizations**

#### Features
- **New analysis tools** and export formats
- **Enhanced filtering** and search capabilities
- **Additional MCP tools** for traffic analysis
- **Performance monitoring** improvements

#### Documentation
- **Improve guides** and examples
- **Add tutorials** for specific use cases
- **Update API documentation** with examples
- **Create video tutorials** or demos

#### Testing
- **Add more test cases** and validation
- **Improve test coverage** in specific areas
- **Performance benchmarking** and regression tests
- **Integration testing** with different applications

#### Infrastructure
- **CI/CD improvements** and automation
- **Development tooling** enhancements
- **Build process** optimizations
- **Dependency management** and security updates

## Release Process

### Version Management

- **Semantic versioning** (semver) - MAJOR.MINOR.PATCH
- **Conventional commits** drive version bumps
- **Automated changelog** generation
- **Git tags** for releases

### Release Steps

1. **Update version** in package.json
2. **Generate changelog** from commits
3. **Create release tag** with git
4. **Publish to npm** (if applicable)
5. **Update documentation** for new version

## Development Tips

### Debugging

```bash
# Enable debug logging
DEBUG=netcap:* npm start

# Run with specific configuration for testing
npm start -- --port 9090 --db-path ./debug-traffic.db --no-auto-start

# Use development validation tools
npm run dev-validate
npm run test-mcp-tools
```

### Performance Profiling

```bash
# Monitor memory usage
node --inspect src/index.ts

# Profile database operations
npm run validate-db:performance

# Test with high load
npm run test:load
```

### Common Development Issues

#### TypeScript Compilation Errors
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Fix import/export issues
npm run lint:fix
```

#### Database Issues During Development
```bash
# Reset development database
rm traffic.db* && npm start

# Validate database schema
npm run validate-db:schema
```

#### SSL Certificate Problems
```bash
# Regenerate development certificates
npm run generate-certs

# Test with insecure mode
npm start -- --insecure
```

## See Also

- **[Getting Started](getting-started.md)** - Basic setup and usage
- **[Configuration](configuration.md)** - Configuration options
- **[API Reference](api-reference.md)** - MCP tools documentation
- **[Architecture](architecture.md)** - Technical architecture details
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
