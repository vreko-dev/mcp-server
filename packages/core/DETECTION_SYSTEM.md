# SnapBack Detection System

The SnapBack Detection System is a high-performance AI code detection system that identifies when AI coding assistants make potentially problematic changes. It consists of three core plugins that work together to provide comprehensive code analysis.

## Core Components

### 1. Secret Detection Plugin
Detects secrets and sensitive information that might be accidentally committed to code.

**Features:**
- Pattern matching for common secret formats (AWS keys, GitHub tokens, OpenAI keys, etc.)
- Entropy analysis for high randomness strings
- Context awareness (skips test files, .env.example, comments)
- False positive reduction (whitelists UUIDs, timestamps, placeholders)

### 2. Mock Replacement Plugin
Detects when test mocks are accidentally used in production code.

**Features:**
- Identifies test framework imports in production code (jest, vi, sinon)
- Detects inline mock objects and mock factory functions
- Recognizes mock configuration properties and environment variables
- Skips legitimate test files and dependency injection patterns

### 3. Phantom Dependency Plugin
Detects missing dependencies that are imported but not declared in package.json.

**Features:**
- AST-based import extraction
- Package.json comparison for dependency validation
- Built-in exclusion for Node.js built-ins and workspace packages
- Support for scoped packages and subpath imports

## Usage

### Basic Usage with Guardian

```typescript
import { Guardian } from "@snapback/core";
import { SecretDetectionPlugin, MockReplacementPlugin, PhantomDependencyPlugin } from "@snapback/core/detection";

const guardian = new Guardian();
guardian.addPlugin(new SecretDetectionPlugin());
guardian.addPlugin(new MockReplacementPlugin());
guardian.addPlugin(new PhantomDependencyPlugin());

const result = await guardian.analyze(code, filePath);
```

### Individual Plugin Usage

```typescript
import { SecretDetectionPlugin } from "@snapback/core/detection";

const plugin = new SecretDetectionPlugin();
const result = await plugin.analyze(code, filePath);
```

## Performance

The detection system is optimized for performance:
- **Latency**: <200ms P95 for analysis
- **Memory**: <100MB usage
- **Scalability**: Handles large files efficiently

## Integration Points

### VS Code Extension
The detection system is integrated into the VS Code extension's SaveHandler, providing real-time analysis when files are saved.

### MCP Server
The detection system can be used with the Model Context Protocol server for remote analysis.

## Test Coverage

The detection system has comprehensive test coverage:
- Secret Detection: 20+ tests
- Mock Replacement: 15+ tests
- Phantom Dependency: 18+ tests
- Integration tests for combined analysis

## Extensibility

The detection system follows a plugin architecture that makes it easy to add new detection capabilities:

```typescript
import { AnalysisPlugin, type AnalysisResult } from "@snapback/core";

class CustomDetectionPlugin implements AnalysisPlugin {
  readonly name = "CustomDetectionPlugin";
  
  async analyze(content: string, filePath?: string): Promise<AnalysisResult> {
    // Implementation
    return {
      score: 0.5,
      factors: ["custom-issue-detected"],
      recommendations: ["fix-custom-issue"]
    };
  }
}
```