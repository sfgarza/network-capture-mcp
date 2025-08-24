# Documentation Restructure Plan - TEMPORARY REFERENCE

## Current State Analysis
- **Current README.md**: 1,564 lines - too long and overwhelming
- **Problems**: Multiple audiences mixed, scattered information, cognitive overload
- **Existing docs/**: Only contains `mcp-tool-context-guide.md`

## Target Documentation Structure

### 1. README.md (~250 lines)
**Audience**: New users, quick overview seekers
**Content from current README**:
- Lines 1-40: Introduction and overview
- Lines 41-57: Why Use This (condensed)
- Lines 70-106: Quick Start (streamlined)
- Lines 164-180: Basic troubleshooting (selected items)
- New: Links to all other documentation
- Lines 1561-1564: License

**Key sections to include**:
- Project title and brief description
- What is MCP explanation (keep short)
- Key benefits (3-4 bullet points)
- Quick start (5 steps max)
- Documentation links section
- Basic troubleshooting (3-4 common issues)
- License

### 2. docs/getting-started.md
**Audience**: New users wanting comprehensive setup
**Content from current README**:
- Lines 58-69: Prerequisites
- Lines 70-106: Quick Start (expanded)
- Lines 107-163: How to Configure Your Applications
- Lines 164-208: Common Issues & Solutions (setup-related)
- Lines 235-250: Installation and Usage

### 3. docs/configuration.md
**Audience**: Users needing configuration details
**Content from current README**:
- Lines 251-263: Basic Configuration
- Lines 265-393: Advanced Configuration Options (full collapsible section)
- Lines 1392-1465: CLI Options
- Lines 1428-1465: Configuration Examples

### 4. docs/ai-agent-setup.md
**Audience**: AI agent users and MCP integrators
**Content from current README**:
- Lines 395-541: Adding to AI Agents (full section)
- Lines 522-541: Usage examples with AI agents
- MCP-specific troubleshooting items

### 5. docs/api-reference.md
**Audience**: Developers and advanced users
**Content from current README**:
- Lines 1172-1209: Available MCP Tools
- Lines 1210-1268: Tool Parameters
- Lines 1269-1316: Response Formats
- Lines 1006-1040: MCP Tools (from architecture section)

### 6. docs/architecture.md
**Audience**: Developers and technical users
**Content from current README**:
- Lines 542-1131: Technical Architecture & Advanced Features (full collapsible)
- Lines 545-563: Architecture diagrams
- Lines 574-606: How It Works
- Lines 607-615: What Gets Captured
- Lines 616-833: Storage Architecture
- Lines 834-1005: Auto-Start & Health Monitoring

### 7. docs/development.md
**Audience**: Contributors and developers
**Content from current README**:
- Lines 1133-1170: Development Guide (full collapsible)
- Lines 1317-1360: Testing
- Lines 1361-1391: Contributing

### 8. docs/troubleshooting.md
**Audience**: Users experiencing problems
**Content from current README**:
- Lines 164-208: Common Issues & Solutions (expanded)
- Lines 209-234: Performance & Resource Usage
- Lines 1466-1560: Troubleshooting (full section)
- SSL/certificate issues
- Database problems
- Performance issues

### 9. docs/examples.md (NEW)
**Audience**: Users wanting real-world examples
**Content**: New comprehensive examples
- Complete workflow examples
- Integration patterns
- Use case scenarios
- Best practices

## Content Mapping Strategy

### High Priority Sections (Keep in main README)
- Project overview and MCP explanation
- Quick start steps
- Links to documentation
- Most common troubleshooting items

### Medium Priority (Move to specialized docs)
- Detailed configuration
- AI agent setup
- API reference
- Architecture details

### Low Priority (Can be condensed or moved)
- Advanced configuration examples
- Detailed troubleshooting
- Development details
- Technical architecture

## Implementation Order
1. Create new streamlined README.md
2. Create docs/getting-started.md
3. Create docs/configuration.md
4. Create docs/ai-agent-setup.md
5. Create docs/api-reference.md
6. Create docs/architecture.md
7. Create docs/development.md
8. Create docs/troubleshooting.md
9. Create docs/examples.md
10. Update cross-references and navigation

## Cross-Reference Strategy
- Each document should link to related documents
- Main README should have comprehensive "Documentation" section
- Use consistent formatting across all documents
- Add "See also" sections where appropriate

## Success Metrics
- Main README under 300 lines
- Each specialized document focused on single audience
- Clear navigation between documents
- No duplicate information
- Consistent formatting and tone
