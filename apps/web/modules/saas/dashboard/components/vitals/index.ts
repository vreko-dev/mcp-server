/**
 * Vitals Components
 * Workspace health monitoring UI components
 */

// Re-export shared UI components
export { AnimatedScore, HealthBadge, TerminalVitals } from "@snapback/ui/vitals";

// Export local components
export { VitalBar } from "./VitalBar";
export { VitalsGrid } from "./VitalsGrid";
export { getVitalsStatus, WorkspaceVitals, type WorkspaceVitalsProps } from "./WorkspaceVitals";
