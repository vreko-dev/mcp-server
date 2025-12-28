/**
 * Design tokens for vitals UI components
 * Centralized color palette for health indicators
 *
 * @package @snapback/ui
 */

export const vitalsTokens = {
	/** Health status color variants */
	health: {
		healthy: {
			/** Background color (Tailwind class) */
			bg: "bg-emerald-500/10",
			/** Text color (Tailwind class) */
			text: "text-emerald-400",
			/** Hex value for programmatic use */
			value: "#34D399",
			/** Glow shadow effect */
			glow: "shadow-[0_0_15px_rgba(52,211,153,0.3)]",
			/** Status label */
			label: "stable",
		},
		elevated: {
			bg: "bg-amber-500/10",
			text: "text-amber-400",
			value: "#FBBF24",
			glow: "shadow-[0_0_15px_rgba(251,191,36,0.3)]",
			label: "elevated",
		},
		critical: {
			bg: "bg-red-500/10",
			text: "text-red-400",
			value: "#EF4444",
			glow: "shadow-[0_0_15px_rgba(239,68,68,0.4)]",
			label: "critical",
		},
	},

	/** Neutral color variants for terminal/UI elements */
	neutral: {
		dim: {
			text: "text-zinc-600",
			value: "#52525B",
		},
		active: {
			text: "text-zinc-300",
			value: "#D4D4D8",
		},
		muted: {
			text: "text-zinc-500",
			value: "#71717A",
		},
		border: {
			default: "border-zinc-800",
			value: "#27272A",
		},
		background: {
			surface: "bg-zinc-900/50",
			value: "rgba(24, 24, 27, 0.5)",
		},
	},

	/** Terminal-specific status colors */
	terminal: {
		good: "text-emerald-400",
		warn: "text-amber-400",
		dim: "text-zinc-600",
		active: "text-zinc-300",
		prompt: "text-zinc-500",
	},
} as const;

/** Type helpers for token consumption */
export type HealthStatus = keyof typeof vitalsTokens.health;
export type TerminalStatus = keyof typeof vitalsTokens.terminal;
