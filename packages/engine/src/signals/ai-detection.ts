/**
 * AI Detection Signal
 *
 * Transport-agnostic AI tool detection using:
 * 1. Pattern matching (extension IDs, tool signatures)
 * 2. Velocity-based detection (rapid edits characteristic of AI paste)
 * 3. Content analysis (import statements, config files)
 *
 * Zero VS Code dependencies - pure detection logic.
 */

export interface AIDetectionInput {
	/** Detected extension IDs in environment */
	extensionIds: string[];

	/** File content to analyze for AI signatures */
	content?: string;

	/** Character velocity (chars/ms) from burst detector */
	velocity?: number;

	/** Total characters changed in the operation */
	charCount?: number;
}

export interface AIDetectionResult {
	/** AI tool detected (null if no detection) */
	tool: string | null;

	/** Confidence score (0-1) */
	confidence: number;

	/** Detection method that triggered */
	method: "extension" | "velocity" | "pattern" | "combined" | null;

	/** Indicators that contributed to detection */
	indicators?: string[];
}

export interface AIDetectionConfig {
	/** Velocity threshold (chars/ms) above which AI is suspected */
	velocityThreshold?: number;

	/** Minimum characters for velocity-based detection */
	minCharsForVelocity?: number;

	/** Enable pattern matching in content */
	enablePatternMatching?: boolean;
}

/**
 * Known AI tool extension IDs and their display names
 */
const AI_TOOLS: Record<string, string> = {
	"github.copilot": "GitHub Copilot",
	"github.copilot-nightly": "GitHub Copilot (Nightly)",
	"github.copilot-chat": "GitHub Copilot Chat",
	"cursor.cursor": "Cursor",
	"anthropic.claude": "Claude",
	"anthropic.claude-dev": "Claude Dev",
	"tabnine.tabnine-vscode": "Tabnine",
	"codeium.codeium": "Codeium",
	"amazonwebservices.aws-toolkit-vscode": "Amazon Q",
	"jetbrains.jetbrains-ai": "JetBrains AI",
	"sourcegraph.cody-ai": "Sourcegraph Cody",
};

/**
 * Content patterns that indicate AI-generated code
 */
const AI_PATTERNS = [
	/claude|anthropic/i,
	/copilot|github\.copilot/i,
	/codeium/i,
	/tabnine/i,
	/cursor/i,
	/amazon.*q|codewhisperer/i,
	/jetbrains.*ai/i,
	/sourcegraph|cody/i,
];

/**
 * AIDetector
 *
 * Pure detection logic with no platform dependencies.
 * Combines multiple signals (extension presence, velocity, patterns)
 * to determine if AI is being used.
 */
export class AIDetector {
	private readonly velocityThreshold: number;
	private readonly minCharsForVelocity: number;
	private readonly enablePatternMatching: boolean;

	constructor(config: AIDetectionConfig = {}) {
		this.velocityThreshold = config.velocityThreshold ?? 10; // 10 chars/ms = 10,000 chars/sec
		this.minCharsForVelocity = config.minCharsForVelocity ?? 100;
		this.enablePatternMatching = config.enablePatternMatching ?? true;
	}

	/**
	 * Detect AI tool usage from multiple signals
	 *
	 * @param input - Detection signals (extensions, velocity, content)
	 * @returns Detection result with tool name and confidence
	 */
	detect(input: AIDetectionInput): AIDetectionResult {
		const indicators: string[] = [];
		let confidence = 0;
		let tool: string | null = null;
		let method: "extension" | "velocity" | "pattern" | "combined" | null = null;

		// Signal 1: Extension presence (high confidence)
		const extensionMatch = this.detectByExtension(input.extensionIds);
		if (extensionMatch) {
			tool = extensionMatch;
			confidence = 0.95; // Very high confidence for extension detection
			method = "extension";
			indicators.push(`${extensionMatch} extension active`);
		}

		// Signal 2: Velocity-based detection (moderate confidence)
		const velocityMatch = this.detectByVelocity(input.velocity, input.charCount);
		if (velocityMatch) {
			if (!tool) {
				tool = "AI Tool (Unknown)";
				confidence = velocityMatch.confidence;
				method = "velocity";
			} else {
				// Combine with extension detection
				confidence = Math.max(confidence, velocityMatch.confidence);
				method = "combined";
			}
			indicators.push(velocityMatch.indicator);
		}

		// Signal 3: Pattern matching in content (lower confidence)
		if (this.enablePatternMatching && input.content) {
			const patternMatch = this.detectByPattern(input.content);
			if (patternMatch) {
				if (!tool) {
					tool = patternMatch.tool;
					confidence = 0.6; // Lower confidence for pattern-only detection
					method = "pattern";
				} else {
					// Boost confidence if patterns align with extension
					confidence = Math.min(0.98, confidence + 0.1);
					method = "combined";
				}
				indicators.push(patternMatch.indicator);
			}
		}

		// No detection
		if (!tool) {
			return {
				tool: null,
				confidence: 0,
				method: null,
			};
		}

		return {
			tool,
			confidence,
			method,
			indicators: indicators.length > 0 ? indicators : undefined,
		};
	}

	/**
	 * Detect AI by extension ID presence
	 */
	private detectByExtension(extensionIds: string[]): string | null {
		for (const extId of extensionIds) {
			const normalized = extId.toLowerCase();
			if (AI_TOOLS[normalized]) {
				return AI_TOOLS[normalized];
			}
		}
		return null;
	}

	/**
	 * Detect AI by velocity characteristics
	 *
	 * Rationale: AI paste operations typically show:
	 * - Very high character velocity (>10 chars/ms = 10,000 chars/sec)
	 * - Large character counts (>100 chars)
	 * - Instant or near-instant changes
	 */
	private detectByVelocity(
		velocity: number | undefined,
		charCount: number | undefined,
	): { confidence: number; indicator: string } | null {
		if (velocity === undefined || charCount === undefined) {
			return null;
		}

		// Require minimum character count to avoid false positives
		if (charCount < this.minCharsForVelocity) {
			return null;
		}

		// Check if velocity exceeds threshold
		if (velocity >= this.velocityThreshold) {
			// Higher velocity = higher confidence
			const confidence = Math.min(0.85, 0.6 + velocity / 100);

			return {
				confidence,
				indicator: `High velocity: ${velocity.toFixed(1)} chars/ms (${charCount} chars)`,
			};
		}

		return null;
	}

	/**
	 * Detect AI by content patterns
	 *
	 * Looks for tool-specific signatures in:
	 * - Import statements
	 * - Configuration files
	 * - Comments referencing AI tools
	 */
	private detectByPattern(content: string): { tool: string; indicator: string } | null {
		for (const pattern of AI_PATTERNS) {
			const match = pattern.exec(content);
			if (match) {
				const matchedText = match[0];
				const tool = this.inferToolFromPattern(matchedText);
				return {
					tool,
					indicator: `Pattern match: "${matchedText}"`,
				};
			}
		}
		return null;
	}

	/**
	 * Infer tool name from matched pattern
	 */
	private inferToolFromPattern(matchedText: string): string {
		const lower = matchedText.toLowerCase();

		if (lower.includes("copilot")) return "GitHub Copilot";
		if (lower.includes("cursor")) return "Cursor";
		if (lower.includes("claude") || lower.includes("anthropic")) return "Claude";
		if (lower.includes("codeium")) return "Codeium";
		if (lower.includes("tabnine")) return "Tabnine";
		if (lower.includes("amazon") || lower.includes("codewhisperer")) return "Amazon Q";
		if (lower.includes("jetbrains")) return "JetBrains AI";
		if (lower.includes("cody") || lower.includes("sourcegraph")) return "Sourcegraph Cody";

		return "AI Tool (Unknown)";
	}

	/**
	 * Update velocity threshold dynamically
	 */
	updateVelocityThreshold(threshold: number): void {
		if (threshold <= 0) {
			throw new Error("Velocity threshold must be positive");
		}
		// @ts-expect-error - Intentional mutation of readonly property for dynamic config
		(this as { velocityThreshold: number }).velocityThreshold = threshold;
	}

	/**
	 * Get current configuration
	 */
	getConfig(): Required<AIDetectionConfig> {
		return {
			velocityThreshold: this.velocityThreshold,
			minCharsForVelocity: this.minCharsForVelocity,
			enablePatternMatching: this.enablePatternMatching,
		};
	}
}
