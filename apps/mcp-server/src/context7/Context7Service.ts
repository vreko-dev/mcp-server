import type { StorageBrokerAdapter } from "@snapback/sdk";
import retry from "async-retry";
import { z } from "zod";

// Custom Snapshot interface for Context7Service that matches the expected structure
interface Snapshot {
	id: string;
	timestamp: number;
	meta?: Record<string, any>;
	files?: string[];
	fileContents?: Record<string, string>;
}

// Custom error class for aborting retries
class AbortError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "AbortError";
	}
}

// Zod schemas for input validation
export const ResolveLibraryIdSchema = z.object({
	libraryName: z.string().min(1, "Library name is required"),
});

export const GetLibraryDocsSchema = z.object({
	context7CompatibleLibraryID: z.string().min(1, "Library ID is required"),
	topic: z.string().optional(),
	tokens: z.number().optional(),
});

// Result interfaces
export interface ResolveLibraryResult {
	content: Array<{
		type: "text";
		text: string;
	}>;
}

export interface GetLibraryDocsResult {
	content: Array<{
		type: "text";
		text: string;
	}>;
}

// Cache metadata interface
interface CacheMetadata {
	cacheExpiration: number;
	cacheType: "resolve-library-id" | "get-library-docs";
	createdAt: number;
}

export class Context7Service {
	private storage: StorageBrokerAdapter;
	private apiKey: string | undefined;
	private apiUrl: string;
	private searchCacheTTL: number;
	private docsCacheTTL: number;

	constructor(storage: StorageBrokerAdapter) {
		this.storage = storage;
		this.apiKey = process.env.CONTEXT7_API_KEY;
		this.apiUrl = process.env.CONTEXT7_API_URL || "https://context7.com/api";
		this.searchCacheTTL = Number.parseInt(process.env.CONTEXT7_CACHE_TTL_SEARCH || "3600", 10);
		this.docsCacheTTL = Number.parseInt(process.env.CONTEXT7_CACHE_TTL_DOCS || "86400", 10);

		// Validate configuration
		if (this.apiKey && this.apiKey.length < 10) {
			console.warn("CONTEXT7_API_KEY appears to be invalid (too short)");
		}

		try {
			new URL(this.apiUrl);
		} catch (_e) {
			throw new Error(`Invalid CONTEXT7_API_URL: ${this.apiUrl}`);
		}

		if (Number.isNaN(this.searchCacheTTL) || this.searchCacheTTL < 0) {
			console.warn(
				`Invalid CONTEXT7_CACHE_TTL_SEARCH: ${process.env.CONTEXT7_CACHE_TTL_SEARCH}, using default 3600`,
			);
			this.searchCacheTTL = 3600;
		}

		if (Number.isNaN(this.docsCacheTTL) || this.docsCacheTTL < 0) {
			console.warn(
				`Invalid CONTEXT7_CACHE_TTL_DOCS: ${process.env.CONTEXT7_CACHE_TTL_DOCS}, using default 86400`,
			);
			this.docsCacheTTL = 86400;
		}
	}

	/**
	 * Resolves a library or package name into a Context7-compatible library ID
	 */
	async resolveLibraryId(libraryName: string): Promise<ResolveLibraryResult> {
		// Validate input
		const validated = ResolveLibraryIdSchema.parse({ libraryName });

		// Try to get from cache first
		const cacheKey = `ctx7:resolve:${encodeURIComponent(validated.libraryName)}`;
		const cached = await this.getFromCache<ResolveLibraryResult>(cacheKey);
		if (cached) {
			return cached;
		}

		// If not in cache, call API
		const result = await this.callResolveLibraryAPI(validated.libraryName);

		// Save to cache
		await this.saveToCache(cacheKey, result, this.searchCacheTTL, "resolve-library-id");

		return result;
	}

	/**
	 * Fetches up-to-date documentation for a specific library
	 */
	async getLibraryDocs(
		libraryId: string,
		options?: { topic?: string; tokens?: number },
	): Promise<GetLibraryDocsResult> {
		// Validate input
		const validated = GetLibraryDocsSchema.parse({
			context7CompatibleLibraryID: libraryId,
			topic: options?.topic,
			tokens: options?.tokens,
		});

		// Try to get from cache first
		const cacheKey = `ctx7:docs:${encodeURIComponent(validated.context7CompatibleLibraryID)}${
			validated.topic ? `:${encodeURIComponent(validated.topic)}` : ""
		}${validated.tokens ? `:tokens:${validated.tokens}` : ""}`;

		const cached = await this.getFromCache<GetLibraryDocsResult>(cacheKey);
		if (cached) {
			return cached;
		}

		// If not in cache, call API
		const result = await this.callGetLibraryDocsAPI(
			validated.context7CompatibleLibraryID,
			validated.topic,
			validated.tokens,
		);

		// Save to cache
		await this.saveToCache(cacheKey, result, this.docsCacheTTL, "get-library-docs");

		return result;
	}

	/**
	 * Calls the Context7 API to resolve library IDs
	 */
	private async callResolveLibraryAPI(libraryName: string): Promise<ResolveLibraryResult> {
		try {
			// Check if we have an API key
			if (!this.apiKey) {
				throw new Error("CONTEXT7_API_KEY is required for Context7 API access");
			}

			// Make the API call with retry logic
			return await retry(
				async () => {
					// Make the API call to resolve library ID
					const response = await fetch(`${this.apiUrl}/v1/search`, {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							Authorization: `Bearer ${this.apiKey}`,
						},
						body: JSON.stringify({
							query: libraryName,
						}),
					});

					// Handle specific Context7 API responses
					if (!response.ok) {
						// Handle rate limiting
						if (response.status === 429) {
							throw new AbortError("Rate limit exceeded for Context7 API. Please try again later.");
						}

						// Handle authentication errors
						if (response.status === 401 || response.status === 403) {
							throw new Error("Invalid or missing CONTEXT7_API_KEY");
						}

						// Retry on server errors
						if (response.status >= 500) {
							throw new Error(`Context7 API server error: ${response.status} ${response.statusText}`);
						}

						// Don't retry on client errors
						throw new AbortError(`Context7 API client error: ${response.status} ${response.statusText}`);
					}

					// Parse the response
					const data = await response.json();

					// Transform the response to match our expected format
					// Handle error response
					if (data.error) {
						throw new Error(data.error);
					}

					// Format search results
					let formattedText = "Available Libraries (top matches):\n\n";
					if (data.results && data.results.length > 0) {
						data.results.forEach((result: any, index: number) => {
							if (index > 0) {
								formattedText += "\n----------\n\n";
							}
							formattedText += `- Title: ${result.title}\n`;
							formattedText += `- Context7-compatible library ID: ${result.id}\n`;
							if (result.description && result.description !== "-1") {
								formattedText += `- Description: ${result.description}\n`;
							}
							if (result.totalSnippets && result.totalSnippets !== -1) {
								formattedText += `- Code Snippets: ${result.totalSnippets}\n`;
							}
							if (result.trustScore && result.trustScore !== -1) {
								formattedText += `- Trust Score: ${result.trustScore}\n`;
							}
							if (result.versions && result.versions.length > 0) {
								formattedText += `- Versions: ${result.versions.join(", ")}\n`;
							}
						});
					} else {
						formattedText = "No documentation libraries found matching your query.";
					}

					return {
						content: [
							{
								type: "text",
								text: formattedText,
							},
						],
					};
				},
				{
					retries: 3,
					factor: 2,
					minTimeout: 1000,
					maxTimeout: 10000,
					randomize: true,
					onRetry: (error: Error, attempt: number) => {
						console.warn(
							`Retrying Context7 resolve-library-id call (attempt ${attempt}): ${error.message}`,
						);
					},
				},
			);
		} catch (error: any) {
			// Re-throw with context
			throw new Error(`Failed to resolve library: ${error.message}`);
		}
	}

	/**
	 * Calls the Context7 API to get library documentation
	 */
	private async callGetLibraryDocsAPI(
		libraryId: string,
		topic?: string,
		tokens?: number,
	): Promise<GetLibraryDocsResult> {
		try {
			// Check if we have an API key
			if (!this.apiKey) {
				throw new Error("CONTEXT7_API_KEY is required for Context7 API access");
			}

			// Prepare the request body
			const requestBody: any = {
				context7CompatibleLibraryID: libraryId,
			};

			if (topic) {
				requestBody.topic = topic;
			}

			if (tokens) {
				requestBody.tokens = tokens;
			}

			// Make the API call with retry logic
			return await retry(
				async () => {
					// Build query parameters for documentation fetch
					const params = new URLSearchParams();
					params.append("libraryId", libraryId);
					if (tokens) {
						params.append("tokens", tokens.toString());
					}
					if (topic) {
						params.append("topic", topic);
					}

					// Make the API call to get library docs
					const response = await fetch(`${this.apiUrl}/v1/fetch?${params.toString()}`, {
						method: "GET",
						headers: {
							Authorization: `Bearer ${this.apiKey}`,
						},
					});

					// Handle non-OK responses
					if (!response.ok) {
						if (response.status === 401) {
							throw new Error("Invalid or missing CONTEXT7_API_KEY");
						}
						if (response.status === 404) {
							// Don't retry on not found
							throw new AbortError(`Library not found: ${libraryId}`);
						}
						if (response.status === 429) {
							// Don't retry on rate limit exceeded
							throw new AbortError("Rate limit exceeded for Context7 API");
						}
						if (response.status >= 500) {
							// Retry on server errors
							throw new Error(`Context7 API error: ${response.status} ${response.statusText}`);
						}
						// Don't retry on client errors
						throw new AbortError(`Context7 API error: ${response.status} ${response.statusText}`);
					}

					// Handle specific Context7 API responses
					if (!response.ok) {
						const errorText = await response.text();

						// Handle rate limiting
						if (response.status === 429) {
							throw new AbortError("Rate limit exceeded for Context7 API. Please try again later.");
						}

						// Handle authentication errors
						if (response.status === 401 || response.status === 403) {
							throw new Error(`Invalid or missing CONTEXT7_API_KEY. ${errorText}`);
						}

						// Handle not found
						if (response.status === 404) {
							throw new AbortError(`Library not found: ${libraryId}`);
						}

						// Retry on server errors
						if (response.status >= 500) {
							throw new Error(`Context7 API server error: ${response.status} ${response.statusText}`);
						}

						// Don't retry on client errors
						throw new AbortError(
							`Context7 API client error: ${response.status} ${response.statusText}: ${errorText}`,
						);
					}

					// Parse the response
					const text = await response.text();

					// Transform the response to match our expected format
					return {
						content: [
							{
								type: "text",
								text: text || `# ${libraryId} Documentation\n\nNo documentation available.`,
							},
						],
					};
				},
				{
					retries: 3,
					factor: 2,
					minTimeout: 1000,
					maxTimeout: 10000,
					randomize: true,
					onRetry: (error: Error, attempt: number) => {
						console.warn(`Retrying Context7 get-library-docs call (attempt ${attempt}): ${error.message}`);
					},
				},
			);
		} catch (error: any) {
			// Re-throw with context
			throw new Error(`Failed to get library docs: ${error.message}`);
		}
	}

	/**
	 * Retrieves data from cache if it exists and is still valid
	 */
	private async getFromCache<T>(key: string): Promise<T | null> {
		try {
			const cached = await this.storage.get(key);
			if (!cached || !cached.meta) {
				return null;
			}

			const metadata = cached.meta as CacheMetadata;
			if (Date.now() > metadata.cacheExpiration) {
				// Cache expired, delete it
				await this.storage.delete(key);
				return null;
			}

			// Parse the cached data from fileContents
			if (cached.fileContents?.data) {
				return JSON.parse(cached.fileContents.data) as T;
			}

			return null;
		} catch (error) {
			// Log error but don't fail the operation
			console.error(`Cache retrieval failed for key ${key}:`, error);
			return null;
		}
	}

	/**
	 * Saves data to cache with expiration
	 */
	private async saveToCache<T>(
		key: string,
		data: T,
		ttlSeconds: number,
		cacheType: "resolve-library-id" | "get-library-docs",
	): Promise<void> {
		try {
			const metadata: CacheMetadata = {
				cacheExpiration: Date.now() + ttlSeconds * 1000,
				cacheType: cacheType,
				createdAt: Date.now(),
			};

			const snapshot: Snapshot = {
				id: key,
				timestamp: Date.now(),
				meta: metadata,
				files: [],
				fileContents: {
					data: JSON.stringify(data),
				},
			};

			await this.storage.save(snapshot);
		} catch (error) {
			// Log error but don't fail the operation
			console.error(`Cache save failed for key ${key}:`, error);
		}
	}
}
