# Detection System Design Decisions

## AST Parser Selection Strategy

1. **Primary Parser**: Use `@typescript-eslint/parser` for TypeScript files (.ts, .tsx)
2. **Fallback Parser**: Use `esprima` for JavaScript files (.js, .jsx)
3. **Graceful Degradation**: If primary parser fails, try fallback parser
4. **Error Handling**: Log parsing failures but continue with other analysis

## Cache Invalidation Strategy

1. **LRU Cache**: Use `lru-cache` with max 100 entries for package.json lookups
2. **Cache Keys**: Use directory paths as cache keys
3. **Cache Values**: Store parsed package.json objects
4. **Invalidation**: No explicit invalidation needed due to LRU eviction

## Error Boundaries

1. **Fail Gracefully**: Plugin failures should not crash the entire analysis
2. **Logging**: Log errors with context but continue execution
3. **Fallback Results**: Return empty/safe results on failure
4. **Plugin Isolation**: Each plugin runs in isolation

## Debouncing Strategy

1. **Debounce Time**: 500ms after last change for file analysis
2. **Per-File Debouncing**: Separate debounce timers per file path
3. **Immediate Analysis**: For critical/security issues, analyze immediately
4. **Batch Processing**: For multiple file changes, batch analysis where appropriate

## Performance Considerations

1. **Early Exits**: Skip analysis for test files and known safe patterns
2. **Memory Management**: Use WeakMap where appropriate for large objects
3. **Streaming**: Process large files in chunks when possible
4. **Caching**: Cache expensive operations (AST parsing, package.json lookup)

## Plugin Architecture

1. **Interface Compliance**: All plugins implement the AnalysisPlugin interface
2. **File Path Awareness**: Plugins receive file path for context-aware analysis
3. **Severity Scoring**: Each plugin returns a 0-1 score with factors and recommendations
4. **Aggregation**: Guardian aggregates plugin results with weighted averaging

## Secret Detection Specifics

1. **Pattern Matching**: Regex patterns for common secret formats
2. **Entropy Analysis**: Shannon entropy calculation for randomness detection
3. **Context Awareness**: Skip secrets in .env.example, test files, comments
4. **False Positive Reduction**: Whitelist common non-secret patterns

## Mock Replacement Specifics

1. **Import Analysis**: Detect test framework imports in production code
2. **Function Call Detection**: Identify mock function calls outside test contexts
3. **Path-Based Filtering**: Use file path patterns to identify test vs production code
4. **Inline Mock Detection**: Find inline mock objects in services

## Phantom Dependency Specifics

1. **Import Extraction**: Parse AST to extract all import statements
2. **Package.json Comparison**: Compare imports with declared dependencies
3. **Built-in Exclusion**: Skip Node.js built-ins and workspace packages
4. **Dynamic Import Handling**: Handle dynamic imports with special logic

## Integration Points

1. **MCP Server**: Guardian with detection plugins integrated into analysis flow
2. **VS Code Extension**: SaveHandler integration for real-time analysis
3. **Quick Fixes**: Code actions for automatic remediation where possible
4. **Diagnostics**: VS Code diagnostics for user feedback

## Testing Strategy

1. **Unit Tests**: Comprehensive tests for each utility function
2. **Plugin Tests**: 20+ tests per plugin with positive and negative cases
3. **Integration Tests**: End-to-end tests with real code samples
4. **Performance Tests**: Latency and memory usage validation
5. **False Positive Tests**: Validate <5% false positive rate