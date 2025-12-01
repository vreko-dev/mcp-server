# Qoder Configuration with Context7 Integration

This document explains how to configure Qoder for optimal use with the SnapBack project, specifically focusing on Context7 integration for enhanced developer experience.

## Overview

The Qoder configuration has been enhanced to work seamlessly with Context7, providing intelligent code assistance, documentation retrieval, and risk analysis for AI-assisted development.

## Key Enhancements

### 1. Context7 Integration

The configuration now includes specific settings for Context7 integration:

```yaml
context7:
  integration:
    enabled: true
    api_key_env_var: "CONTEXT7_API_KEY"
    api_url: "https://context7.com/api"
    cache_ttl_search: 3600
    cache_ttl_docs: 86400
```

This enables Qoder to:
- Resolve library names to Context7-compatible IDs
- Fetch up-to-date documentation
- Retrieve code examples
- Cache results for performance

### 2. Enhanced MCP Configuration

The MCP servers section has been updated to include Context7:

```yaml
mcp:
  servers:
    - name: context7
      url: "mcp://context7"
      libraries:
        - "vscode@^1.95.0"
        - "zod@catalog:"
        - "posthog-js@catalog:"
        - "next@catalog:"
        - "react@catalog:"
        - "tailwindcss@catalog:"
        - "@modelcontextprotocol/sdk@catalog:"
      sources_allowlist:
        - "code.visualstudio.com"
        - "github.com/microsoft/vscode-*"
        - "zod.dev"
        - "posthog.com"
        - "nextjs.org"
        - "react.dev"
        - "tailwindcss.com"
        - "context7.com"
        - "npmjs.com"
```

### 3. Sequential Thinking Enhancement

The sequential-thinking MCP server now includes additional triggers:

```yaml
- name: sequential-thinking
  url: "mcp://sequentialthinking"
  use_when:
    - "threat_model"
    - "refactor_large"
    - "perf_hotspot"
    - "architectural_review"
    - "dependency_analysis"
    - "documentation_search"
  max_steps: 12
```

### 4. Performance Budgets

Added specific performance budgets for MCP operations:

```yaml
budgets:
  mcp_response_time_ms: 200
```

## Context7 Tools Integration

### Available Tools

1. **resolve-library-id**
   - Resolves library/package names to Context7-compatible IDs
   - Useful for finding documentation for specific libraries

2. **get-library-docs**
   - Fetches up-to-date documentation with code examples
   - Provides API references and integration patterns

### Usage Patterns

#### Pattern 1: Library Documentation Retrieval

When working with unfamiliar libraries:
1. Use `ctx7.resolve-library-id` to find the correct library ID
2. Use `ctx7.get-library-docs` to retrieve documentation
3. Apply the knowledge to implement features correctly

#### Pattern 2: Code Examples

When implementing complex features:
1. Search for relevant libraries using `ctx7.resolve-library-id`
2. Retrieve code examples with `ctx7.get-library-docs`
3. Adapt examples to your specific use case

## Developer Experience Enhancements

### Code Suggestions

The configuration enables pre-analysis of code suggestions:
- Risk assessment before applying AI-generated code
- Dependency checking for package.json changes
- Automatic snapshot creation for risky changes

### Iteration Tracking

Qoder monitors consecutive AI edits:
- Warning at 3 iterations
- Critical warning at 5 iterations
- Recommendations to test or review code

### Snapshot Management

Enhanced snapshot capabilities:
- Manual snapshot creation
- Snapshot listing and restoration
- Integration with VS Code extension

## Setup Instructions

### Environment Variables

Set the following environment variables:

```bash
export CONTEXT7_API_KEY="your-context7-api-key"
export SNAPBACK_API_KEY="your-snapback-api-key"
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "snapback": {
      "command": "npx",
      "args": ["-y", "@snapback/mcp-server"],
      "env": {
        "CONTEXT7_API_KEY": "your-context7-api-key",
        "SNAPBACK_API_KEY": "your-snapback-api-key"
      }
    }
  }
}
```

## Best Practices

### 1. Documentation Search

When encountering unfamiliar APIs:
1. Use Context7 to search for library documentation
2. Retrieve code examples
3. Understand proper usage patterns

### 2. Risk Assessment

Before accepting AI suggestions:
1. Let Qoder analyze the code for risks
2. Review any warnings or recommendations
3. Create snapshots for significant changes

### 3. Performance Monitoring

Monitor operation times:
- Keep MCP response times under 200ms
- Use caching to improve performance
- Optimize complex operations

## Troubleshooting

### Common Issues

1. **Context7 API Key Missing**
   - Ensure `CONTEXT7_API_KEY` is set in environment variables
   - Verify the key has proper permissions

2. **MCP Connection Issues**
   - Check that the SnapBack MCP server is properly configured
   - Verify network connectivity to external services

3. **Performance Degradation**
   - Check cache settings
   - Monitor concurrent request limits
   - Review timeout configurations

### Logs and Monitoring

Qoder logs performance metrics to stderr:
- Operation times for each tool call
- Cache hit/miss ratios
- Error rates and retry attempts

## Future Enhancements

Planned improvements:
1. Enhanced caching strategies
2. Improved error handling and retry logic
3. Additional documentation sources
4. Better integration with VS Code extension
5. Enhanced performance monitoring

## Conclusion

This Qoder configuration with Context7 integration provides a robust foundation for AI-assisted development with SnapBack. The combination of real-time risk analysis, documentation retrieval, and intelligent code suggestions creates an optimal developer experience while maintaining code safety and quality.