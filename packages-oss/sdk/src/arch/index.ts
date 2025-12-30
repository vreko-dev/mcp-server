/**
 * Architecture Validation Module
 *
 * Provides architecture checking and runtime invariants for:
 * 1. Import/dependency validation (ts-arch style)
 * 2. Layer architecture enforcement
 * 3. Runtime invariants with reporting
 *
 * @packageDocumentation
 */

// =============================================================================
// Invariant System
// =============================================================================
export {
	// Predefined helpers
	assertDefined,
	assertNonEmptyArray,
	assertNonEmptyString,
	assertPathWithinRoot,
	assertPositiveNumber,
	// Configuration
	configureInvariant,
	// Scoped invariants
	createScopedInvariant,
	getInvariantConfig,
	getViolationCounts,
	type InvariantConfig,
	type InvariantReporter,
	// Types
	type InvariantViolation,
	// Core function
	invariant,
	// Testing utilities
	resetViolationCounts,
	softInvariant,
	typeInvariant,
} from "./invariant.js";

// =============================================================================
// Architecture Rules
// =============================================================================
export {
	type ArchCheckResult,
	// Types
	type ArchRule,
	type ArchRunnerConfig,
	type ArchViolation,
	// Fluent rule builder
	createRule,
	// Core runner
	runArchCheck,
	// Default SnapBack rules
	SNAPBACK_LAYER_RULES,
} from "./rules.js";
