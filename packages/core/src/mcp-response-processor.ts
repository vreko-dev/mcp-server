import { z } from "zod";

// Zod schemas for MCP responses
const TextContentSchema = z.object({
	type: z.literal("text"),
	text: z.string(),
});

const JsonContentSchema = z.object({
	type: z.literal("json"),
	json: z.any(),
});

const ImageContentSchema = z.object({
	type: z.literal("image"),
	data: z.string(),
	mimeType: z.string(),
});

const ToolContentSchema = z.union([TextContentSchema, JsonContentSchema, ImageContentSchema]);

const ToolResponseSchema = z.object({
	content: z.array(ToolContentSchema).optional(),
	isError: z.boolean().optional(),
	error: z.any().optional(),
});

// Types derived from schemas
type ToolContent = z.infer<typeof ToolContentSchema>;
type ToolResponse = z.infer<typeof ToolResponseSchema>;

/**
 * Normalize text content from MCP tool responses
 * @param content Text content to normalize
 * @returns Normalized text content
 */
export function normalizeTextContent(content: string): string {
	// Remove excessive whitespace and normalize line endings
	return content.replace(/\s+/g, " ").trim();
}

/**
 * Normalize JSON content from MCP tool responses
 * @param content JSON content to normalize
 * @returns Normalized JSON content
 */
export function normalizeJsonContent(content: any): any {
	// For now, just return the content as-is
	// In the future, we might want to apply specific transformations
	return content;
}

/**
 * Normalize image content from MCP tool responses
 * @param data Base64 encoded image data
 * @param mimeType MIME type of the image
 * @returns Object with image data and metadata
 */
export function normalizeImageContent(data: string, mimeType: string): { data: string; mimeType: string } {
	// Validate that data is base64 encoded
	if (!data || typeof data !== "string") {
		throw new Error("Invalid image data");
	}

	// Validate MIME type
	if (!mimeType || typeof mimeType !== "string") {
		throw new Error("Invalid MIME type");
	}

	return { data, mimeType };
}

/**
 * Process MCP tool response content
 * @param content Array of content items from MCP tool response
 * @returns Processed content as a string or object
 */
export function processToolContent(content: ToolContent[]): string | any {
	if (!content || content.length === 0) {
		return "";
	}

	// If there's only one content item, process it directly
	if (content.length === 1) {
		const item = content[0];
		switch (item.type) {
			case "text":
				return normalizeTextContent(item.text);
			case "json":
				return normalizeJsonContent(item.json);
			case "image":
				return normalizeImageContent(item.data, item.mimeType);
			default:
				// Handle unknown content types
				return JSON.stringify(item);
		}
	}

	// If there are multiple content items, combine them
	const results: (string | any)[] = [];
	for (const item of content) {
		switch (item.type) {
			case "text":
				results.push(normalizeTextContent(item.text));
				break;
			case "json":
				results.push(normalizeJsonContent(item.json));
				break;
			case "image":
				results.push(normalizeImageContent(item.data, item.mimeType));
				break;
			default:
				// Handle unknown content types
				results.push(JSON.stringify(item));
		}
	}

	// If all results are strings, join them
	if (results.every((result) => typeof result === "string")) {
		return (results as string[]).join("\n");
	}

	// Otherwise, return as array
	return results;
}

/**
 * Process complete MCP tool response
 * @param response MCP tool response
 * @returns Processed response with normalized content
 */
export function processToolResponse(response: any): {
	content: string | any;
	isError: boolean;
	error?: any;
} {
	// Handle both old and new response formats
	if (response && typeof response === "object") {
		// Check if this is the new format with content array
		if (Array.isArray(response.content)) {
			// New format: [{type: 'text', text: '...'}]
			const parsedResponse = ToolResponseSchema.safeParse(response);

			if (!parsedResponse.success) {
				return {
					content: "Invalid response format",
					isError: true,
					error: parsedResponse.error,
				};
			}

			const { content, isError, error } = parsedResponse.data;

			// If it's an error response, return as-is
			if (isError) {
				return {
					content: error?.message || "Tool execution failed",
					isError: true,
					error,
				};
			}

			// Process content if available
			if (content) {
				try {
					const processedContent = processToolContent(content);
					return {
						content: processedContent,
						isError: false,
					};
				} catch (err) {
					return {
						content: "Error processing tool response",
						isError: true,
						error: err,
					};
				}
			}

			// Return empty response if no content
			return {
				content: "",
				isError: false,
			};
		}
		if (typeof response.content === "string") {
			// Old format: { content: 'text', success: true }
			return {
				content: response.content,
				isError: response.isError || !response.success,
				error: response.error,
			};
		}
		if (response.isError || Object.hasOwn(response, "error")) {
			// Error response in object format
			return {
				content: response.error?.message || "Tool execution failed",
				isError: true,
				error: response.error,
			};
		}
		if (Object.keys(response).length === 0) {
			// Empty response
			return {
				content: "",
				isError: false,
			};
		}
		if (
			!Object.hasOwn(response, "content") &&
			!Object.hasOwn(response, "isError") &&
			!Object.hasOwn(response, "error")
		) {
			// Invalid response format - no recognized fields
			return {
				content: "",
				isError: false,
			};
		}
	}

	// Fallback for unknown formats
	return {
		content: typeof response === "string" ? response : JSON.stringify(response),
		isError: false,
	};
}

/**
 * Create a standardized error response
 * @param message Error message
 * @param code Error code
 * @param details Additional error details
 * @returns Standardized error response
 */
export function createErrorResponse(
	message: string,
	code?: string,
	details?: any,
): {
	content: string;
	isError: boolean;
	error: { message: string; code?: string; details?: any };
} {
	return {
		content: message,
		isError: true,
		error: {
			message,
			code,
			details,
		},
	};
}

/**
 * Validate and process MCP tool call arguments
 * @param args Tool call arguments
 * @param schema Zod schema for validation
 * @returns Validated arguments or error response
 */
export function validateToolArgs<T>(
	args: any,
	schema: z.ZodSchema<T>,
):
	| {
			success: true;
			data: T;
	  }
	| {
			success: false;
			error: ReturnType<typeof createErrorResponse>;
	  } {
	const result = schema.safeParse(args);

	if (!result.success) {
		return {
			success: false,
			error: createErrorResponse("Invalid tool arguments", "INVALID_ARGS", result.error),
		};
	}

	return {
		success: true,
		data: result.data,
	};
}

// Export types
export type { ToolContent, ToolResponse };
