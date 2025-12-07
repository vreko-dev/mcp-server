import type { ReactNode } from "react";

export type DemoState = "safe" | "ai_edit" | "break" | "restored";

export interface DemoNode {
	id: DemoState;
	// Label for the timeline node
	label: string;
	// Sublabel for the timeline node
	sublabel: string;
	// Icon for the timeline node
	icon: ReactNode;
	// Code to display in the editor
	code: string;
	// Trust score change at this step (0 to 1, or null if no change)
	trustDelta: number | null;
	// Log messages (kept for compatibility or extra detail if needed)
	terminal?: { text: string; type: "info" | "error" | "success" | "dim" }[];
}

export interface TerminalLine {
	text: string;
	type: "info" | "error" | "success" | "dim";
}
