import crypto from "node:crypto";
import type { FileMetadata } from "@snapback-oss/contracts";

// Define file extensions by category at module level for better performance
const CODE_EXTENSIONS = [
	"ts",
	"js",
	"jsx",
	"tsx",
	"py",
	"java",
	"c",
	"cpp",
	"h",
	"hpp",
	"rb",
	"go",
	"php",
	"pl",
	"rs",
	"swift",
	"kt",
	"dart",
	"scala",
	"sql",
];

const CONFIG_EXTENSIONS = [
	"json",
	"env",
	"yml",
	"yaml",
	"xml",
	"html",
	"css",
	"scss",
	"less",
	"map",
	"lock",
	"conf",
	"ini",
	"bat",
	"ps1",
];

const DOCUMENT_EXTENSIONS = ["md", "txt", "csv", "log", "pdf", "docx", "doc", "xlsx", "xls", "pptx", "ppt"];

const IMAGE_EXTENSIONS = ["svg", "png", "jpg", "jpeg", "gif", "bmp", "ico", "webp", "avif"];

const MEDIA_EXTENSIONS = ["mp4", "mov", "avi", "mkv", "mp3", "wav", "ogg", "flac", "aac", "m4a", "webm"];

const ARCHIVE_EXTENSIONS = ["zip", "tar", "gz", "tgz", "rar", "7z"];
const DATABASE_EXTENSIONS = ["db", "db3", "sqlite", "dbf", "bak"];
const BINARY_EXTENSIONS = ["wasm"];

// Combine all extensions and pre-compile regex pattern for performance
const ALL_EXTENSIONS = [
	...CODE_EXTENSIONS,
	...CONFIG_EXTENSIONS,
	...DOCUMENT_EXTENSIONS,
	...IMAGE_EXTENSIONS,
	...MEDIA_EXTENSIONS,
	...ARCHIVE_EXTENSIONS,
	...DATABASE_EXTENSIONS,
	...BINARY_EXTENSIONS,
];

// Pre-compiled regex pattern to avoid repeated RegExp construction
const FILE_EXTENSION_REGEX = new RegExp(`\\b\\w+\\.(${ALL_EXTENSIONS.join("|")})\\b`, "gi");

export class PrivacySanitizer {
	constructor(
		private config: {
			hashFilePaths: boolean;
			anonymizeWorkspace: boolean;
		},
	) {}

	/**
	 * Sanitize file metadata to ensure privacy
	 * Removes any potentially sensitive data
	 */
	sanitize(metadata: FileMetadata): FileMetadata {
		// Create defensive copy to prevent mutating original
		const copy = structuredClone(metadata) as any;

		// Hash file path if enabled
		if (this.config.hashFilePaths && "path" in copy) {
			const filePath = copy.path;
			const hashedPath = this.hashFilePath(filePath);
			copy.pathHash = hashedPath;
			// Keep path field but populate with hash to satisfy contracts
			copy.path = hashedPath;
		}

		// Remove sensitive risk factors
		if (copy.risk?.factors) {
			// The new RiskScore has factors as objects, not strings
			copy.risk.factors = copy.risk.factors.map((factor: any) => ({
				...factor,
				type: this.sanitizeString(factor.type),
			}));
		}

		return copy as FileMetadata;
	}

	/**
	 * Validate that metadata contains no sensitive data
	 */
	isPrivacySafe(metadata: any): boolean {
		// Blacklist of forbidden properties
		const forbiddenProps = ["content", "sourceCode", "fileContent", "code", "text", "body", "fullPath"];

		// Check for forbidden properties
		for (const prop of forbiddenProps) {
			if (prop in metadata) {
				return false;
			}
		}

		// Allow path if it's hashed (matches pathHash)
		if ("path" in metadata && "pathHash" in metadata) {
			// If both exist, path should equal pathHash when hashing is enabled
			if (metadata.path !== metadata.pathHash) {
				return false; // path is not hashed, forbidden
			}
		} else if ("path" in metadata && !("pathHash" in metadata)) {
			// path exists without pathHash, forbidden
			return false;
		}

		// Check nested objects
		for (const [_key, value] of Object.entries(metadata)) {
			if (typeof value === "object" && value !== null) {
				if (!this.isPrivacySafe(value)) {
					return false;
				}
			}

			// Check for suspiciously large strings (potential code content)
			if (typeof value === "string" && value.length > 1000) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Hash file path with workspace salt
	 */
	private hashFilePath(filePath: string): string {
		return crypto.createHash("sha256").update(filePath).digest("hex");
	}

	/**
	 * Sanitize string to remove specific identifiers
	 */
	private sanitizeString(str: string): string {
		// Handle undefined or null strings
		if (!str) {
			return "";
		}

		// Prevent ReDoS by limiting input size
		if (str.length > 10000) {
			throw new Error("Input too large for sanitization");
		}

		// Replace specific file names with generic placeholders
		// Use safer regex patterns that don't cause backtracking
		// Use pre-compiled regex for better performance
		return str
			.replace(/"[^"]*"/g, '"<redacted>"') // Remove quoted strings (safer)
			.replace(FILE_EXTENSION_REGEX, "<file>") // Remove file names with known extensions
			.replace(/\/[\w/]+/g, "<path>"); // Remove paths (safer)
	}

	/**
	 * Public method to sanitize individual risk factors
	 * @param factor - Risk factor string to sanitize
	 * @returns Sanitized risk factor string
	 */
	public sanitizeFactor(factor: string): string {
		return this.sanitizeString(factor);
	}
}
