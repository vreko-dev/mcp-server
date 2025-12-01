# Client Integration Guide for Revenue Enablement System

**Status**: Incomplete - Needs Implementation
**Owner**: Client Integration Team
**Last Updated**: 2025-10-04

## Overview

This document provides guidance for integrating the VS Code extension, CLI, and MCP server with the SnapBack revenue enablement API. All clients must implement proper authentication, respect rate limits, and handle subscription tier differences.

## API Client Implementation

### Authentication Flow

#### API Key Management

All clients must securely store and manage API keys:

```typescript
// Example API key storage interface
interface ApiKeyStorage {
	save(key: string): Promise<void>;
	load(): Promise<string | null>;
	clear(): Promise<void>;
}

// VS Code implementation
class VSCodeApiKeyStorage implements ApiKeyStorage {
	async save(key: string): Promise<void> {
		await vscode.workspace
			.getConfiguration()
			.update("snapback.apiKey", key, vscode.ConfigurationTarget.Global);
	}

	async load(): Promise<string | null> {
		return vscode.workspace.getConfiguration().get("snapback.apiKey") as
			| string
			| null;
	}

	async clear(): Promise<void> {
		await vscode.workspace
			.getConfiguration()
			.update(
				"snapback.apiKey",
				undefined,
				vscode.ConfigurationTarget.Global
			);
	}
}
```

#### Authentication Header Construction

All API requests must include proper authentication headers:

```typescript
// Example authentication header construction
function createAuthHeaders(apiKey: string): HeadersInit {
	return {
		Authorization: `Bearer ${apiKey}`,
		"Content-Type": "application/json",
	};
}

// Example authenticated request
async function makeAuthenticatedRequest(
	endpoint: string,
	apiKey: string,
	options: RequestInit = {}
): Promise<Response> {
	const headers = createAuthHeaders(apiKey);

	return fetch(`https://api.snapback.dev/v1${endpoint}`, {
		...options,
		headers: {
			...headers,
			...options.headers,
		},
	});
}
```

### Error Handling

#### Standard Error Responses

All clients must handle standard API error responses:

```typescript
interface ApiError {
	error: string;
	upgradePrompt?: {
		message: string;
		cta: string;
		ctaUrl: string;
	};
}

// Example error handling
async function handleApiResponse(response: Response): Promise<any> {
	if (!response.ok) {
		const errorData: ApiError = await response.json();

		switch (response.status) {
			case 401:
				// Authentication required
				throw new AuthenticationError(errorData.error);

			case 402:
				// Payment required - show upgrade prompt
				if (errorData.upgradePrompt) {
					showUpgradePrompt(errorData.upgradePrompt);
				}
				throw new PaymentRequiredError(errorData.error);

			case 403:
				// Forbidden
				throw new ForbiddenError(errorData.error);

			case 429:
				// Rate limited
				const retryAfter = response.headers.get("Retry-After");
				throw new RateLimitError(errorData.error, retryAfter);

			default:
				// Other errors
				throw new ApiError(errorData.error);
		}
	}

	return response.json();
}
```

#### Retry Logic

Implement appropriate retry logic for transient errors:

```typescript
async function makeRequestWithRetry(
	requestFn: () => Promise<Response>,
	maxRetries: number = 3
): Promise<any> {
	let lastError: Error;

	for (let i = 0; i <= maxRetries; i++) {
		try {
			const response = await requestFn();
			return await handleApiResponse(response);
		} catch (error) {
			lastError = error;

			// Don't retry for authentication or payment errors
			if (
				error instanceof AuthenticationError ||
				error instanceof PaymentRequiredError
			) {
				throw error;
			}

			// Don't retry for client errors
			if (
				error instanceof ApiError &&
				error.status >= 400 &&
				error.status < 500
			) {
				throw error;
			}

			// Retry for server errors and network issues
			if (i < maxRetries) {
				// Exponential backoff
				const delay = Math.pow(2, i) * 1000;
				await new Promise((resolve) => setTimeout(resolve, delay));
			}
		}
	}

	throw lastError;
}
```

## VS Code Extension Integration

### API Key Configuration

#### Configuration UI

Implement a user-friendly API key configuration interface:

```typescript
// Example command registration
export function activate(context: vscode.ExtensionContext) {
	// Register configuration command
	const configureApiKeyCommand = vscode.commands.registerCommand(
		"snapback.configureApiKey",
		async () => {
			const apiKey = await vscode.window.showInputBox({
				prompt: "Enter your SnapBack API key",
				placeHolder: "sbk_live_...",
				password: true,
			});

			if (apiKey) {
				try {
					// Validate API key
					await validateApiKey(apiKey);

					// Save API key
					await apiKeyStorage.save(apiKey);

					vscode.window.showInformationMessage(
						"API key configured successfully!"
					);
				} catch (error) {
					vscode.window.showErrorMessage(
						`Failed to configure API key: ${error.message}`
					);
				}
			}
		}
	);

	context.subscriptions.push(configureApiKeyCommand);
}
```

#### API Key Validation

Validate API keys before saving:

```typescript
async function validateApiKey(apiKey: string): Promise<void> {
	try {
		const response = await makeAuthenticatedRequest("/user/me", apiKey);

		if (!response.userId) {
			throw new Error("Invalid API key response");
		}
	} catch (error) {
		if (error instanceof AuthenticationError) {
			throw new Error("Invalid API key");
		}
		throw error;
	}
}
```

### Usage Monitoring

#### Status Bar Integration

Display usage information in the status bar:

```typescript
class UsageStatusBar {
	private statusBarItem: vscode.StatusBarItem;

	constructor() {
		this.statusBarItem = vscode.window.createStatusBarItem(
			vscode.StatusBarAlignment.Right,
			100
		);
		this.statusBarItem.command = "snapback.showUsage";
		this.updateStatusBar();
	}

	async updateStatusBar(): Promise<void> {
		try {
			const apiKey = await apiKeyStorage.load();
			if (!apiKey) {
				this.statusBarItem.text = "$(key) SnapBack: Configure API Key";
				this.statusBarItem.tooltip =
					"Click to configure your SnapBack API key";
				this.statusBarItem.show();
				return;
			}

			const userInfo = await makeAuthenticatedRequest("/user/me", apiKey);

			const usagePercent = Math.round(
				(userInfo.usage.checkpoints / userInfo.limits.checkpoints) * 100
			);

			this.statusBarItem.text = `$(shield) SnapBack: ${usagePercent}%`;
			this.statusBarItem.tooltip =
				`Checkpoints: ${userInfo.usage.checkpoints}/${userInfo.limits.checkpoints}\n` +
				`Plan: ${userInfo.plan}`;

			// Show warning when near limits
			if (usagePercent > 80) {
				this.statusBarItem.backgroundColor = new vscode.ThemeColor(
					"statusBarItem.warningBackground"
				);
			} else {
				this.statusBarItem.backgroundColor = undefined;
			}

			this.statusBarItem.show();
		} catch (error) {
			this.statusBarItem.text = "$(error) SnapBack: Error";
			this.statusBarItem.tooltip = `Error loading usage data: ${error.message}`;
			this.statusBarItem.backgroundColor = new vscode.ThemeColor(
				"statusBarItem.errorBackground"
			);
			this.statusBarItem.show();
		}
	}
}
```

#### Upgrade Prompts

Show upgrade prompts when limits are reached:

```typescript
async function handleCheckpointLimitReached(
	error: PaymentRequiredError
): Promise<void> {
	if (error.upgradePrompt) {
		const action = await vscode.window.showErrorMessage(
			error.message,
			error.upgradePrompt.cta,
			"Configure API Key",
			"Dismiss"
		);

		switch (action) {
			case error.upgradePrompt.cta:
				vscode.env.openExternal(
					vscode.Uri.parse("https://snapback.dev/pricing")
				);
				break;
			case "Configure API Key":
				vscode.commands.executeCommand("snapback.configureApiKey");
				break;
		}
	}
}
```

## CLI Integration

### Login Command

#### API Key Storage

Implement secure API key storage for CLI:

```bash
# Example CLI commands
snapback login
# Prompts for API key and validates it

snapback status
# Shows current usage and plan information

snapback upgrade
# Opens pricing page in browser
```

```typescript
// Example login command implementation
program
	.command("login")
	.description("Configure SnapBack API key")
	.action(async () => {
		const apiKey = await inquirer.prompt([
			{
				type: "password",
				name: "key",
				message: "Enter your SnapBack API key:",
				validate: (input) =>
					input.length > 0 ? true : "API key is required",
			},
		]);

		try {
			// Validate API key
			const response = await makeAuthenticatedRequest(
				"/user/me",
				apiKey.key
			);

			// Save API key
			await saveApiKeyToConfig(apiKey.key);

			console.log(chalk.green("✓ API key configured successfully!"));
			console.log(`Plan: ${response.plan}`);
			console.log(
				`Checkpoints: ${response.usage.checkpoints}/${response.limits.checkpoints}`
			);
		} catch (error) {
			console.error(
				chalk.red(`✗ Failed to configure API key: ${error.message}`)
			);
			process.exit(1);
		}
	});
```

### Status Command

#### Usage Display

Show detailed usage information:

```typescript
program
	.command("status")
	.description("Show SnapBack usage and plan information")
	.action(async () => {
		try {
			const apiKey = await loadApiKeyFromConfig();
			if (!apiKey) {
				console.log(
					chalk.yellow(
						'No API key configured. Run "snapback login" to configure.'
					)
				);
				return;
			}

			const userInfo = await makeAuthenticatedRequest("/user/me", apiKey);

			console.log(chalk.bold("SnapBack Status"));
			console.log(chalk.gray("================"));
			console.log(`Plan: ${chalk.blue(userInfo.plan)}`);
			console.log(`User ID: ${userInfo.userId || userInfo.deviceId}`);

			const checkpointUsage = `${userInfo.usage.checkpoints}/${userInfo.limits.checkpoints}`;
			const checkpointPercent = Math.round(
				(userInfo.usage.checkpoints / userInfo.limits.checkpoints) * 100
			);

			console.log(
				`Checkpoints: ${checkpointUsage} (${chalk.yellow(
					`${checkpointPercent}%`
				)})`
			);

			if (checkpointPercent > 80) {
				console.log(chalk.yellow("⚠️  Approaching checkpoint limit!"));
			}

			if (userInfo.upgradePrompt) {
				console.log(chalk.blue(`💡 ${userInfo.upgradePrompt.message}`));
				console.log(
					chalk.blue(
						`   Run "snapback upgrade" to ${userInfo.upgradePrompt.cta.toLowerCase()}`
					)
				);
			}
		} catch (error) {
			console.error(
				chalk.red(`✗ Failed to get status: ${error.message}`)
			);
			process.exit(1);
		}
	});
```

## MCP Server Integration

### Authentication Middleware

#### API Key Validation

Implement API key validation for MCP tools:

```typescript
// Example MCP server authentication middleware
async function validateMcpApiKey(request: any): Promise<boolean> {
	const authHeader = request.headers?.authorization;
	if (!authHeader?.startsWith("Bearer ")) {
		return false;
	}

	const apiKey = authHeader.substring(7);

	try {
		const response = await makeAuthenticatedRequest("/user/me", apiKey);
		return !!response.userId;
	} catch (error) {
		return false;
	}
}

// Example tool registration with authentication
server.setRequestHandler("tools/call" as any, async (req: any) => {
	// Validate API key before processing tool calls
	if (!(await validateMcpApiKey(req))) {
		return {
			content: [
				{
					type: "text",
					text: "Authentication required. Please provide a valid SnapBack API key.",
				},
			],
			isError: true,
			error: {
				message: "Authentication required",
				code: "E_AUTH_REQUIRED",
			},
		};
	}

	// Process tool call
	const { name, arguments: args } = req.params;
	// ... tool implementation
});
```

### Permission Checking

#### Tier-Based Access Control

Implement permission checking based on subscription tier:

```typescript
interface UserPermissions {
	maxCheckpoints: number;
	cloudBackup: boolean;
	advancedDetection: boolean;
	customRules: boolean;
	teamSharing: boolean;
}

async function getUserPermissions(apiKey: string): Promise<UserPermissions> {
	const userInfo = await makeAuthenticatedRequest("/user/me", apiKey);
	return userInfo.limits;
}

// Example permission check for advanced features
async function checkAdvancedFeaturePermission(
	apiKey: string,
	feature: keyof UserPermissions
): Promise<boolean> {
	const permissions = await getUserPermissions(apiKey);
	return permissions[feature] === true;
}
```

## Rate Limiting Compliance

### Client-Side Rate Limiting

#### Request Queuing

Implement request queuing to respect rate limits:

```typescript
class RateLimitManager {
	private requestQueue: Array<() => Promise<any>> = [];
	private isProcessing: boolean = false;
	private lastRequestTime: number = 0;
	private minRequestInterval: number = 1000; // 1 request per second default

	async enqueueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			this.requestQueue.push(async () => {
				try {
					const result = await requestFn();
					resolve(result);
				} catch (error) {
					reject(error);
				}
			});

			if (!this.isProcessing) {
				this.processQueue();
			}
		});
	}

	private async processQueue(): Promise<void> {
		this.isProcessing = true;

		while (this.requestQueue.length > 0) {
			const now = Date.now();
			const timeSinceLastRequest = now - this.lastRequestTime;

			if (timeSinceLastRequest < this.minRequestInterval) {
				const delay = this.minRequestInterval - timeSinceLastRequest;
				await new Promise((resolve) => setTimeout(resolve, delay));
			}

			const requestFn = this.requestQueue.shift();
			if (requestFn) {
				this.lastRequestTime = Date.now();
				await requestFn();
			}
		}

		this.isProcessing = false;
	}
}
```

#### Retry-After Header Handling

Respect Retry-After headers from rate limiting responses:

```typescript
async function handleRateLimitResponse(response: Response): Promise<void> {
	if (response.status === 429) {
		const retryAfter = response.headers.get("Retry-After");
		if (retryAfter) {
			const retryAfterMs = parseInt(retryAfter) * 1000;
			await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
		} else {
			// Default backoff
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}
}
```

## Analytics and Telemetry

### Event Tracking

#### Usage Analytics

Track client usage for analytics:

```typescript
interface TelemetryEvent {
	eventType: string;
	eventCategory: string;
	data: Record<string, any>;
	platform: string;
	clientVersion: string;
	ideVersion?: string;
	sessionId: string;
}

async function trackTelemetryEvent(event: TelemetryEvent): Promise<void> {
	try {
		const apiKey = await apiKeyStorage.load();
		if (!apiKey) return;

		await makeAuthenticatedRequest("/telemetry/event", apiKey, {
			method: "POST",
			body: JSON.stringify(event),
		});
	} catch (error) {
		// Don't fail the main operation for telemetry errors
		console.warn(`Failed to track telemetry event: ${error.message}`);
	}
}

// Example usage tracking
async function trackFeatureUsage(feature: string): Promise<void> {
	await trackTelemetryEvent({
		eventType: "feature_used",
		eventCategory: "engagement",
		data: { feature },
		platform: "vscode",
		clientVersion: extensionVersion,
		ideVersion: vscode.version,
		sessionId: getSessionId(),
	});
}
```

## Error Recovery

### Graceful Degradation

#### Offline Mode

Implement offline mode for local functionality:

```typescript
class OfflineManager {
	private isOffline: boolean = false;
	private offlineData: Map<string, any> = new Map();

	async performOperation<T>(operation: () => Promise<T>): Promise<T> {
		try {
			const result = await operation();
			this.isOffline = false;
			return result;
		} catch (error) {
			// If it's a network error, switch to offline mode
			if (this.isNetworkError(error)) {
				this.isOffline = true;
				return this.getOfflineResult(operation);
			}
			throw error;
		}
	}

	private isNetworkError(error: any): boolean {
		return (
			error instanceof TypeError &&
			(error.message.includes("fetch") ||
				error.message.includes("network"))
		);
	}

	private getOfflineResult<T>(operation: () => Promise<T>): T {
		// Return cached/offline data or default values
		// Implementation depends on specific operation
		throw new Error("Offline mode not implemented for this operation");
	}
}
```

## Configuration Management

### Environment-Specific Configuration

#### Configuration Loading

Load configuration based on environment:

```typescript
interface ClientConfig {
	apiUrl: string;
	stripePublicKey: string;
	posthogKey: string;
}

function loadClientConfig(): ClientConfig {
	const isDevelopment = process.env.NODE_ENV === "development";

	return {
		apiUrl: isDevelopment
			? process.env.SNAPBACK_API_URL || "http://localhost:3000/api/v1"
			: "https://api.snapback.dev/v1",
		stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
		posthogKey: process.env.POSTHOG_KEY || "",
	};
}
```

## Security Best Practices

### Secure Storage

#### Platform-Specific Storage

Use platform-specific secure storage:

```typescript
// VS Code secret storage
class VSCodeSecureStorage {
	async save(key: string, value: string): Promise<void> {
		const secrets = vscode.extensions.getExtensionContext().secrets;
		await secrets.store(key, value);
	}

	async load(key: string): Promise<string | undefined> {
		const secrets = vscode.extensions.getExtensionContext().secrets;
		return await secrets.get(key);
	}

	async clear(key: string): Promise<void> {
		const secrets = vscode.extensions.getExtensionContext().secrets;
		await secrets.delete(key);
	}
}
```

### Input Validation

#### Client-Side Validation

Validate inputs before sending to API:

```typescript
function validateCheckpointData(data: any): {
	isValid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	if (!data.name && !data.description) {
		errors.push("Either name or description is required");
	}

	if (data.name && typeof data.name !== "string") {
		errors.push("Name must be a string");
	}

	if (data.description && typeof data.description !== "string") {
		errors.push("Description must be a string");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
}
```

## Testing Client Integration

### Integration Test Scenarios

#### Authentication Tests

```typescript
// Example test scenarios for client authentication
describe("Client Authentication", () => {
	it("should successfully authenticate with valid API key", async () => {
		// Test valid API key authentication
	});

	it("should reject invalid API keys", async () => {
		// Test invalid API key rejection
	});

	it("should handle expired API keys", async () => {
		// Test expired API key handling
	});
});
```

#### Rate Limiting Tests

```typescript
describe("Rate Limiting Compliance", () => {
	it("should respect rate limits for free tier", async () => {
		// Test rate limiting for free tier
	});

	it("should handle Retry-After headers", async () => {
		// Test Retry-After header handling
	});
});
```

## Next Steps

1. Implement API client libraries for each client type
2. Create shared authentication and error handling utilities
3. Implement usage monitoring and status display
4. Add rate limiting compliance mechanisms
5. Integrate analytics and telemetry tracking
6. Implement security best practices
7. Create comprehensive test suites
8. Document client-specific configuration and usage
