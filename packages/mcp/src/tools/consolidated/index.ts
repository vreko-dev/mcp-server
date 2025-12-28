/**
 * Consolidated Tools - Token-Efficient LLM Interface
 *
 * Reduces 24 tools to 7 for optimal LLM token efficiency:
 * - snap: Universal entry point (start/check/context)
 * - snap.end: Complete task with learning capture
 * - snap.fix: Snapshot list/restore/diff
 * - snap.?: Help and discovery
 * - snap.learn: Mid-session learning capture
 * - snap.violation: Violation reporting
 * - check: Quick/full/patterns validation
 *
 * @see stress_test_remediation.md
 * @module tools/consolidated
 */

export { type CheckParams, checkTool, handleCheck } from "./check.js";
/** All consolidated tools for registry */
export { CONSOLIDATED_TOOLS } from "./registry.js";
export { handleSnap, type SnapParams, snapTool } from "./snap.js";
export { handleSnapEnd, type SnapEndParams, snapEndTool } from "./snap-end.js";
export { handleSnapFix, type SnapFixParams, snapFixTool } from "./snap-fix.js";
export { handleSnapHelp, snapHelpTool } from "./snap-help.js";
export { handleSnapLearn, type SnapLearnParams, snapLearnTool } from "./snap-learn.js";
export { handleSnapViolation, type SnapViolationParams, snapViolationTool } from "./snap-violation.js";
