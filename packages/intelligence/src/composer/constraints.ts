/**
 * Constraints Interface (Policy → Composer)
 *
 * Defines the interface between PolicyEngine and Composer.
 * PolicyEngine outputs constraints; Composer executes them.
 *
 * Constraint types:
 * - mustInclude: Artifacts that MUST be selected (policy-mandated)
 * - mustExclude: Artifacts that MUST NOT be selected (policy-blocked)
 * - pinned: Artifacts selected first (e.g., current diff)
 * - laneRequirements: Minimum tokens per lane
 */

import type { ArtifactCandidate, ArtifactKind, Lane } from "./types.js";

/**
 * Matcher for identifying artifacts.
 * Used to specify which artifacts a constraint applies to.
 */
export type ArtifactMatcher =
	| { type: "id"; id: string }
	| { type: "kind"; kind: ArtifactKind }
	| { type: "lane"; lane: Lane }
	| { type: "pattern"; pattern: string }; // Glob pattern on internal path

/**
 * Create an ID matcher
 */
export function matchId(id: string): ArtifactMatcher {
	return { type: "id", id };
}

/**
 * Create a kind matcher
 */
export function matchKind(kind: ArtifactKind): ArtifactMatcher {
	return { type: "kind", kind };
}

/**
 * Create a lane matcher
 */
export function matchLane(lane: Lane): ArtifactMatcher {
	return { type: "lane", lane };
}

/**
 * Create a pattern matcher
 */
export function matchPattern(pattern: string): ArtifactMatcher {
	return { type: "pattern", pattern };
}

/**
 * Constraint with reason for explainability.
 * Every constraint includes a reason for transparency.
 */
export interface Constraint {
	/** How to identify matching artifacts */
	match: ArtifactMatcher;
	/** Human-readable reason for this constraint */
	reason: string;
}

/**
 * Lane requirement from policy.
 * Specifies minimum tokens for a lane.
 */
export interface LaneRequirement {
	/** Target lane */
	lane: Lane;
	/** Minimum tokens required */
	minTokens: number;
	/** Reason for this requirement */
	reason: string;
}

/**
 * Constraints from Policy Engine to Composer.
 * Hard constraints that must be respected.
 */
export interface ComposerConstraints {
	/**
	 * Must include these artifacts (policy-mandated).
	 * Selected before scoring, use budget from their lane.
	 */
	mustInclude: Constraint[];

	/**
	 * Must exclude these artifacts (policy-blocked).
	 * Removed before scoring, never selected.
	 */
	mustExclude: Constraint[];

	/**
	 * Pinned artifacts (always selected first).
	 * E.g., current diff is always pinned.
	 */
	pinned: Constraint[];

	/**
	 * Lane requirements from policy.
	 * E.g., "rules lane must have at least 300 tokens"
	 */
	laneRequirements: LaneRequirement[];
}

/**
 * Default empty constraints.
 * Used when no policy constraints apply.
 */
export const EMPTY_CONSTRAINTS: ComposerConstraints = {
	mustInclude: [],
	mustExclude: [],
	pinned: [],
	laneRequirements: [],
} as const;

/**
 * Simple glob pattern matching.
 * Supports * (any characters) and ? (single character).
 *
 * @param pattern - Glob pattern
 * @param text - Text to match
 * @returns true if text matches pattern
 */
function matchGlob(pattern: string, text: string): boolean {
	// Convert glob to regex
	const regexPattern = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&") // Escape special regex chars
		.replace(/\*/g, ".*") // * → .*
		.replace(/\?/g, "."); // ? → .

	const regex = new RegExp(`^${regexPattern}$`, "i");
	return regex.test(text);
}

/**
 * Check if an artifact matches a constraint matcher.
 *
 * @param artifact - Artifact to check
 * @param matcher - Matcher to apply
 * @param getPath - Optional function to get artifact path (for pattern matching)
 * @returns true if artifact matches
 *
 * @example
 * // Match by ID
 * matches(artifact, { type: 'id', id: 'abc123' });
 *
 * // Match by kind
 * matches(artifact, { type: 'kind', kind: 'local_diff' });
 *
 * // Match by lane
 * matches(artifact, { type: 'lane', lane: 'policy' });
 */
export function matches(
	artifact: ArtifactCandidate,
	matcher: ArtifactMatcher,
	getPath?: (artifact: ArtifactCandidate) => string | undefined,
): boolean {
	switch (matcher.type) {
		case "id":
			return artifact.id === matcher.id;

		case "kind":
			return artifact.kind === matcher.kind;

		case "lane":
			return artifact.lane === matcher.lane;

		case "pattern": {
			// Pattern matching requires path access
			// This is only used during selection, path is never logged
			if (!getPath) {
				return false;
			}
			const path = getPath(artifact);
			if (!path) {
				return false;
			}
			return matchGlob(matcher.pattern, path);
		}
	}
}

/**
 * Check if an artifact matches any of the constraints.
 *
 * @param artifact - Artifact to check
 * @param constraints - Array of constraints to check
 * @param getPath - Optional function to get artifact path
 * @returns The first matching constraint, or undefined if none match
 */
export function findMatchingConstraint(
	artifact: ArtifactCandidate,
	constraints: Constraint[],
	getPath?: (artifact: ArtifactCandidate) => string | undefined,
): Constraint | undefined {
	return constraints.find((c) => matches(artifact, c.match, getPath));
}

/**
 * Check if an artifact is excluded by any constraint.
 *
 * @param artifact - Artifact to check
 * @param constraints - Composer constraints
 * @param getPath - Optional function to get artifact path
 * @returns Constraint that excludes the artifact, or undefined
 */
export function isExcluded(
	artifact: ArtifactCandidate,
	constraints: ComposerConstraints,
	getPath?: (artifact: ArtifactCandidate) => string | undefined,
): Constraint | undefined {
	return findMatchingConstraint(artifact, constraints.mustExclude, getPath);
}

/**
 * Check if an artifact is pinned.
 *
 * @param artifact - Artifact to check
 * @param constraints - Composer constraints
 * @param getPath - Optional function to get artifact path
 * @returns Constraint that pins the artifact, or undefined
 */
export function isPinned(
	artifact: ArtifactCandidate,
	constraints: ComposerConstraints,
	getPath?: (artifact: ArtifactCandidate) => string | undefined,
): Constraint | undefined {
	return findMatchingConstraint(artifact, constraints.pinned, getPath);
}

/**
 * Check if an artifact must be included.
 *
 * @param artifact - Artifact to check
 * @param constraints - Composer constraints
 * @param getPath - Optional function to get artifact path
 * @returns Constraint that requires the artifact, or undefined
 */
export function isMustInclude(
	artifact: ArtifactCandidate,
	constraints: ComposerConstraints,
	getPath?: (artifact: ArtifactCandidate) => string | undefined,
): Constraint | undefined {
	return findMatchingConstraint(artifact, constraints.mustInclude, getPath);
}

/**
 * Builder for creating ComposerConstraints
 */
export class ConstraintsBuilder {
	private constraints: ComposerConstraints = {
		mustInclude: [],
		mustExclude: [],
		pinned: [],
		laneRequirements: [],
	};

	/**
	 * Add a must-include constraint
	 */
	mustInclude(match: ArtifactMatcher, reason: string): this {
		this.constraints.mustInclude.push({ match, reason });
		return this;
	}

	/**
	 * Add a must-exclude constraint
	 */
	mustExclude(match: ArtifactMatcher, reason: string): this {
		this.constraints.mustExclude.push({ match, reason });
		return this;
	}

	/**
	 * Add a pinned constraint
	 */
	pin(match: ArtifactMatcher, reason: string): this {
		this.constraints.pinned.push({ match, reason });
		return this;
	}

	/**
	 * Add a lane requirement
	 */
	requireLane(lane: Lane, minTokens: number, reason: string): this {
		this.constraints.laneRequirements.push({ lane, minTokens, reason });
		return this;
	}

	/**
	 * Build the constraints
	 */
	build(): ComposerConstraints {
		return { ...this.constraints };
	}
}

/**
 * Create a new constraints builder
 */
export function constraints(): ConstraintsBuilder {
	return new ConstraintsBuilder();
}

/**
 * Merge multiple constraint sets
 *
 * @param constraintSets - Constraint sets to merge
 * @returns Merged constraints
 */
export function mergeConstraints(...constraintSets: ComposerConstraints[]): ComposerConstraints {
	return {
		mustInclude: constraintSets.flatMap((c) => c.mustInclude),
		mustExclude: constraintSets.flatMap((c) => c.mustExclude),
		pinned: constraintSets.flatMap((c) => c.pinned),
		laneRequirements: constraintSets.flatMap((c) => c.laneRequirements),
	};
}
