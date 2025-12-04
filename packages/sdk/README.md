# SnapBack SDK

## Overview

The SnapBack SDK is a TypeScript/JavaScript client library that enables SnapBack clients (VS Code extension, CLI, MCP Server) to interact with the SnapBack API. The SDK provides a privacy-first approach to metadata transmission, ensuring that only file metadata crosses the wire while keeping all file contents local.

### Two Versions Available

| Package | Access | Use Case | Features |
|---------|--------|----------|----------|
| **`@snapback/sdk`** | Private | Internal apps, SnapBack services | Full-featured, proprietary integrations |
| **`@snapback-oss/sdk`** | Public npm | Community users, OSS projects | Privacy-first, metadata-only, no proprietary features |

**Using SnapBack in your project?** Install the public version:
```bash
npm install @snapback-oss/sdk
```

## Features

-   **Privacy-First Design**: Only metadata is transmitted, never file contents
-   **Authentication**: Simple API key-based authentication
-   **Caching**: Built-in caching for improved performance
-   **Error Handling**: Comprehensive error handling with fallback mechanisms
-   **Rate Limiting**: Automatic handling of API rate limits
-   **Retry Logic**: Exponential backoff for failed requests
-   **Type Safety**: Full TypeScript support with comprehensive type definitions

## Installation

### Using the OSS Package (Recommended for Most Users)

```bash
# For public npm usage
npm install @snapback-oss/sdk

# Or with pnpm
pnpm add @snapback-oss/sdk

# Or with yarn
yarn add @snapback-oss/sdk
```

### Using the Private Package

The private `@snapback/sdk` is used internally by SnapBack applications and includes proprietary features. It is not available on npm and requires workspace access.

## Usage

### Basic Setup

```typescript
import { SnapBackAPIClient } from "@snapback-oss/sdk";

const client = new SnapBackAPIClient({
	endpoint: "https://api.snapback.dev",
	apiKey: "your-api-key",
	privacy: {
		hashFilePaths: true,
		anonymizeWorkspace: false,
	},
	cache: {
		enabled: true,
		ttl: {
			analytics: 3600, // 1 hour
		},
	},
	retry: {
		maxRetries: 3,
		backoffMs: 1000,
	},
});
```

### Sending Metadata

```typescript
const fileMetadata = [
	{
		filePathHash: "abc123...",
		fileExtension: ".ts",
		sizeBytes: 1024,
		lineCount: 50,
		risk: {
			score: 0.3,
			factors: ["Medium complexity"],
			severity: "medium",
		},
		complexity: {
			score: 0.5,
			functionCount: 5,
			nestingDepth: 3,
			cyclomaticComplexity: 10,
		},
		timestamp: Date.now(),
		lastModified: Date.now(),
	},
];

await client.sendMetadata("workspace-id", fileMetadata);
```

### Getting Analytics

```typescript
const analytics = await client.getAnalytics("workspace-id");
console.log(analytics.riskInsights);
```

## Privacy Features

The SDK includes several privacy features to ensure compliance with SnapBack's privacy-first principles:

-   **File Path Hashing**: File paths are hashed before transmission
-   **Content Validation**: Ensures no file contents are included in metadata
-   **Size Limits**: Enforces maximum payload sizes to prevent accidental content leakage
-   **Pattern Detection**: Detects and prevents code-like patterns in metadata

## API Reference

### SnapBackAPIClient

#### Constructor

```typescript
new SnapBackAPIClient(config: SDKConfig)
```

**SDKConfig Properties:**

-   `endpoint`: The API endpoint URL
-   `apiKey`: Your SnapBack API key
-   `privacy`: Privacy configuration options
-   `cache`: Caching configuration
-   `retry`: Retry configuration

#### Methods

##### sendMetadata

Sends file metadata to the SnapBack API.

```typescript
async sendMetadata(
  workspaceId: string,
  files: FileMetadata[]
): Promise<{ accepted: number; rejected: number }>
```

##### getAnalytics

Retrieves analytics for a workspace.

```typescript
async getAnalytics(
  workspaceId: string,
  options?: { forceRefresh?: boolean }
): Promise<AnalyticsResponse>
```

##### getRecommendations

Gets smart recommendations for a workspace.

```typescript
async getRecommendations(
  workspaceId: string
): Promise<AnalyticsResponse['checkpointRecommendations']>
```

## Error Handling

The SDK provides comprehensive error handling with automatic fallbacks:

```typescript
try {
	const result = await client.sendMetadata(workspaceId, metadata);
	console.log("Metadata sent successfully", result);
} catch (error) {
	console.error("Failed to send metadata", error);
	// SDK will automatically retry with exponential backoff
}
```

## Architecture

### OSS vs Private SDK

Both versions share the same core philosophy but differ in scope:

**`@snapback-oss/sdk` includes:**
- Privacy-first API client
- Metadata transmission
- Type-safe interfaces
- Caching and rate limiting
- Error handling with fallbacks

**`@snapback/sdk` additionally includes:**
- Storage adapters (SQLite, PostgreSQL)
- Advanced authentication methods
- Subscription/tier management
- Internal telemetry
- Platform-specific integrations

## Contributing

Want to contribute to SnapBack? See our [Contributing Guide](/docs/contributing) for:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process
- OSS contribution guidelines

### Testing

```bash
# Run SDK tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage
```

## License

MIT

## Resources

- **Documentation**: [SnapBack Docs](/docs)
- **GitHub**: [snapback/snapback](https://github.com/snapback/snapback)
- **NPM**: [@snapback-oss/sdk](https://npmjs.com/package/@snapback-oss/sdk)
- **Issues**: [Bug reports & feature requests](https://github.com/snapback/snapback/issues)
- **Discussions**: [Questions & ideas](https://github.com/snapback/snapback/discussions)
