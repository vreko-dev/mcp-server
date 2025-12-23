/**
 * Rendering Module
 *
 * Second pass of the two-pass pipeline:
 * 1. Selection: Pick artifacts using coarse estimates
 * 2. Rendering: Render content, measure exact tokens, shrink if needed
 *
 * This module handles:
 * - Rendering artifact content
 * - Measuring exact token counts
 * - Shrinking content to fit budget
 * - Strategy-based shrinking per artifact kind
 */

import type {
	ArtifactCandidate,
	ArtifactKind,
	ArtifactRef,
	RenderedArtifact,
	ShrinkStrategy,
	TokenCounter,
} from "./types.js";
import { defaultTokenCounter, LANE_PRIORITIES } from "./types.js";

/**
 * Shrink strategies per artifact kind.
 * Determines how content is reduced when budget is exceeded.
 */
export const SHRINK_STRATEGIES: Readonly<Record<ArtifactKind, ShrinkStrategy>> = {
	constraint: "never", // Never shrink rules
	rule_doc: "never", // Never shrink rules
	local_diff: "truncate_oldest", // Drop oldest hunks
	recent_edit: "truncate_oldest", // Drop oldest content
	symbol_context: "keep_signatures", // Keep signatures, drop bodies
	dependency_graph: "collapse_summary", // Collapse to summary
	test_context: "keep_signatures", // Keep signatures, drop bodies
	semantic_match: "truncate_oldest", // Truncate if needed
	session_history: "drop_entries", // Drop oldest entries
	violation: "drop_entries", // Drop oldest entries
	learning: "drop_entries", // Drop oldest entries
} as const;

/**
 * Minimum content size after shrinking (tokens)
 */
export const MIN_SHRUNK_SIZE = 50;

/**
 * Render a single artifact from ref to full content.
 *
 * @param ref - Artifact reference
 * @param candidates - All candidates (to find matching content)
 * @param countTokens - Token counting function
 * @returns Rendered artifact with exact token count
 * @throws Error if candidate not found
 */
export function renderArtifact(
	ref: ArtifactRef,
	candidates: ArtifactCandidate[],
	countTokens: TokenCounter = defaultTokenCounter,
): RenderedArtifact {
	const candidate = candidates.find((c) => c.id === ref.id);
	if (!candidate) {
		throw new Error(`Candidate not found: ${ref.id}`);
	}

	const content = candidate.getContent();
	const exactTokenCount = countTokens(content);

	return {
		id: ref.id,
		kind: ref.kind,
		lane: ref.lane,
		content,
		exactTokenCount,
		shrunk: false,
	};
}

/**
 * Render multiple artifacts.
 *
 * @param refs - Artifact references
 * @param candidates - All candidates
 * @param countTokens - Token counting function
 * @returns Array of rendered artifacts
 */
export function renderArtifacts(
	refs: ArtifactRef[],
	candidates: ArtifactCandidate[],
	countTokens: TokenCounter = defaultTokenCounter,
): RenderedArtifact[] {
	return refs.map((ref) => renderArtifact(ref, candidates, countTokens));
}

/**
 * Get total token count of rendered artifacts
 *
 * @param rendered - Rendered artifacts
 * @returns Total token count
 */
export function getTotalTokens(rendered: RenderedArtifact[]): number {
	return rendered.reduce((sum, r) => sum + r.exactTokenCount, 0);
}

/**
 * Shrink rendered artifacts to fit within target budget.
 *
 * Algorithm:
 * 1. Calculate overflow (current - target)
 * 2. Sort artifacts by shrinkability (never-shrink last, low priority first)
 * 3. Shrink artifacts one by one until budget is met
 *
 * @param rendered - Rendered artifacts
 * @param targetTokens - Target token budget
 * @param countTokens - Token counting function
 * @returns Shrunk artifacts that fit budget
 */
export function shrinkToFit(
	rendered: RenderedArtifact[],
	targetTokens: number,
	countTokens: TokenCounter = defaultTokenCounter,
): RenderedArtifact[] {
	const current = getTotalTokens(rendered);

	if (current <= targetTokens) {
		return rendered;
	}

	// Sort by shrinkability (never-shrink last, then by lane priority descending)
	const ordered = [...rendered].sort((a, b) => {
		const stratA = SHRINK_STRATEGIES[a.kind];
		const stratB = SHRINK_STRATEGIES[b.kind];

		// Never-shrink goes last
		if (stratA === "never" && stratB !== "never") return 1;
		if (stratB === "never" && stratA !== "never") return -1;

		// Otherwise, shrink lower priority lanes first (higher priority number = lower priority)
		return LANE_PRIORITIES[b.lane] - LANE_PRIORITIES[a.lane];
	});

	const result: RenderedArtifact[] = [];
	const overflow = current - targetTokens;
	let shrunk = 0;

	for (const artifact of ordered) {
		// If we've shrunk enough or this artifact can't shrink
		if (shrunk >= overflow || SHRINK_STRATEGIES[artifact.kind] === "never") {
			result.push(artifact);
			continue;
		}

		// Calculate target size for this artifact
		const tokensToShrink = overflow - shrunk;
		const newTarget = Math.max(artifact.exactTokenCount - tokensToShrink, MIN_SHRUNK_SIZE);

		// If already at or below target, no shrink needed
		if (artifact.exactTokenCount <= newTarget) {
			result.push(artifact);
			continue;
		}

		// Apply shrink strategy
		const shrunkArtifact = applyShrinkStrategy(artifact, newTarget, countTokens);
		const saved = artifact.exactTokenCount - shrunkArtifact.exactTokenCount;
		shrunk += saved;
		result.push(shrunkArtifact);
	}

	return result;
}

/**
 * Apply shrink strategy to a single artifact.
 *
 * @param artifact - Artifact to shrink
 * @param targetTokens - Target token count
 * @param countTokens - Token counting function
 * @returns Shrunk artifact
 */
export function applyShrinkStrategy(
	artifact: RenderedArtifact,
	targetTokens: number,
	countTokens: TokenCounter = defaultTokenCounter,
): RenderedArtifact {
	const strategy = SHRINK_STRATEGIES[artifact.kind];

	switch (strategy) {
		case "truncate_oldest":
			return truncateOldest(artifact, targetTokens, countTokens);
		case "keep_signatures":
			return keepSignatures(artifact, targetTokens, countTokens);
		case "collapse_summary":
			return collapseSummary(artifact, targetTokens, countTokens);
		case "drop_entries":
			return dropEntries(artifact, targetTokens, countTokens);
		case "never":
		default:
			return artifact;
	}
}

/**
 * Truncate oldest content strategy.
 * Used for diffs, histories, and other time-ordered content.
 * Removes lines from the beginning until target is reached.
 *
 * @param artifact - Artifact to shrink
 * @param targetTokens - Target token count
 * @param countTokens - Token counting function
 * @returns Shrunk artifact
 */
export function truncateOldest(
	artifact: RenderedArtifact,
	targetTokens: number,
	countTokens: TokenCounter = defaultTokenCounter,
): RenderedArtifact {
	const lines = artifact.content.split("\n");
	let startIndex = 0;

	// Remove lines from the start until we're at target
	while (startIndex < lines.length - 1) {
		const remaining = lines.slice(startIndex).join("\n");
		const tokens = countTokens(remaining);

		if (tokens <= targetTokens) {
			break;
		}

		startIndex++;
	}

	const newContent = (startIndex > 0 ? "... (truncated)\n" : "") + lines.slice(startIndex).join("\n");
	const exactTokenCount = countTokens(newContent);

	return {
		...artifact,
		content: newContent,
		exactTokenCount,
		shrunk: true,
		originalTokenCount: artifact.exactTokenCount,
		shrinkStrategy: "truncate_oldest",
	};
}

/**
 * Keep signatures strategy.
 * Used for code artifacts - keeps function/class signatures, drops bodies.
 *
 * @param artifact - Artifact to shrink
 * @param targetTokens - Target token count
 * @param countTokens - Token counting function
 * @returns Shrunk artifact
 */
export function keepSignatures(
	artifact: RenderedArtifact,
	targetTokens: number,
	countTokens: TokenCounter = defaultTokenCounter,
): RenderedArtifact {
	const lines = artifact.content.split("\n");
	const signatures: string[] = [];
	let inBody = false;
	let braceDepth = 0;

	for (const line of lines) {
		const trimmed = line.trim();

		// Track brace depth for body detection
		const openBraces = (line.match(/{/g) || []).length;
		const closeBraces = (line.match(/}/g) || []).length;

		if (!inBody) {
			// Look for function/class/interface signatures
			if (
				trimmed.match(/^(export\s+)?(async\s+)?function\s+\w+/) ||
				trimmed.match(/^(export\s+)?(class|interface|type|enum)\s+\w+/) ||
				trimmed.match(/^\w+\s*\([^)]*\)\s*[:{]/) ||
				trimmed.match(/^(public|private|protected|static|async)\s+\w+/)
			) {
				signatures.push(line);
				if (openBraces > closeBraces) {
					inBody = true;
					braceDepth = openBraces - closeBraces;
					signatures.push("  // ... body omitted");
				}
			} else if (!trimmed.startsWith("//") && !trimmed.startsWith("/*") && !trimmed.startsWith("*")) {
				// Keep non-body, non-comment lines
				if (trimmed !== "" && !trimmed.startsWith("import") && !trimmed.startsWith("require")) {
					signatures.push(line);
				}
			}
		} else {
			// Track body depth
			braceDepth += openBraces - closeBraces;
			if (braceDepth <= 0) {
				inBody = false;
				braceDepth = 0;
				signatures.push(line); // Include closing brace
			}
		}

		// Check if we're at target
		const current = signatures.join("\n");
		if (countTokens(current) >= targetTokens) {
			break;
		}
	}

	const newContent = signatures.join("\n");
	const exactTokenCount = countTokens(newContent);

	return {
		...artifact,
		content: newContent,
		exactTokenCount,
		shrunk: true,
		originalTokenCount: artifact.exactTokenCount,
		shrinkStrategy: "keep_signatures",
	};
}

/**
 * Collapse summary strategy.
 * Used for dependency graphs - collapses to high-level summary.
 *
 * @param artifact - Artifact to shrink
 * @param targetTokens - Target token count
 * @param countTokens - Token counting function
 * @returns Shrunk artifact
 */
export function collapseSummary(
	artifact: RenderedArtifact,
	targetTokens: number,
	countTokens: TokenCounter = defaultTokenCounter,
): RenderedArtifact {
	const lines = artifact.content.split("\n");

	// Extract summary lines (headers, top-level items)
	const summary: string[] = [];
	let itemCount = 0;

	for (const line of lines) {
		const trimmed = line.trim();

		// Keep headers and top-level items
		if (
			trimmed.startsWith("#") ||
			trimmed.startsWith("##") ||
			trimmed.startsWith("- ") ||
			trimmed.startsWith("* ") ||
			trimmed.match(/^\d+\./)
		) {
			summary.push(line);
			itemCount++;
		}

		// Stop if we've reached target
		const current = summary.join("\n");
		if (countTokens(current) >= targetTokens - 20) {
			// Leave room for summary note
			break;
		}
	}

	const totalItems = lines.filter((l) => l.trim().startsWith("- ") || l.trim().startsWith("* ")).length;

	const summaryNote = itemCount < totalItems ? `\n... and ${totalItems - itemCount} more items (collapsed)` : "";

	const newContent = summary.join("\n") + summaryNote;
	const exactTokenCount = countTokens(newContent);

	return {
		...artifact,
		content: newContent,
		exactTokenCount,
		shrunk: true,
		originalTokenCount: artifact.exactTokenCount,
		shrinkStrategy: "collapse_summary",
	};
}

/**
 * Drop entries strategy.
 * Used for lists/histories - drops oldest entries first.
 *
 * @param artifact - Artifact to shrink
 * @param targetTokens - Target token count
 * @param countTokens - Token counting function
 * @returns Shrunk artifact
 */
export function dropEntries(
	artifact: RenderedArtifact,
	targetTokens: number,
	countTokens: TokenCounter = defaultTokenCounter,
): RenderedArtifact {
	const lines = artifact.content.split("\n");

	// Find entry boundaries (empty lines or entry markers)
	const entries: string[][] = [];
	let currentEntry: string[] = [];

	for (const line of lines) {
		if (line.trim() === "" && currentEntry.length > 0) {
			entries.push(currentEntry);
			currentEntry = [];
		} else {
			currentEntry.push(line);
		}
	}
	if (currentEntry.length > 0) {
		entries.push(currentEntry);
	}

	// Keep entries from the end (most recent)
	const kept: string[][] = [];
	let totalTokens = 0;

	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i];
		const entryContent = entry.join("\n");
		const entryTokens = countTokens(entryContent);

		if (totalTokens + entryTokens <= targetTokens - 30) {
			// Leave room for note
			kept.unshift(entry);
			totalTokens += entryTokens;
		} else if (kept.length === 0) {
			// Keep at least one entry
			kept.unshift(entry);
			break;
		} else {
			break;
		}
	}

	const droppedCount = entries.length - kept.length;
	const droppedNote = droppedCount > 0 ? `... ${droppedCount} older entries dropped\n\n` : "";

	const newContent = droppedNote + kept.map((e) => e.join("\n")).join("\n\n");
	const exactTokenCount = countTokens(newContent);

	return {
		...artifact,
		content: newContent,
		exactTokenCount,
		shrunk: true,
		originalTokenCount: artifact.exactTokenCount,
		shrinkStrategy: "drop_entries",
	};
}

/**
 * Check if shrinking is needed for a set of rendered artifacts
 *
 * @param rendered - Rendered artifacts
 * @param budget - Token budget
 * @returns true if total exceeds budget
 */
export function needsShrinking(rendered: RenderedArtifact[], budget: number): boolean {
	return getTotalTokens(rendered) > budget;
}

/**
 * Calculate shrink statistics
 *
 * @param rendered - Rendered artifacts (after shrinking)
 * @returns Shrink statistics
 */
export function getShrinkStats(rendered: RenderedArtifact[]): {
	shrunkCount: number;
	totalSaved: number;
	byStrategy: Record<ShrinkStrategy, number>;
} {
	let shrunkCount = 0;
	let totalSaved = 0;
	const byStrategy = {} as Record<ShrinkStrategy, number>;

	for (const r of rendered) {
		if (r.shrunk && r.originalTokenCount !== undefined && r.shrinkStrategy) {
			shrunkCount++;
			const saved = r.originalTokenCount - r.exactTokenCount;
			totalSaved += saved;
			byStrategy[r.shrinkStrategy] = (byStrategy[r.shrinkStrategy] ?? 0) + 1;
		}
	}

	return { shrunkCount, totalSaved, byStrategy };
}
