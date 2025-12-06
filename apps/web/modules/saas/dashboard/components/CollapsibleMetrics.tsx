"use client";

import { ChevronDown } from "lucide-react";
import { m } from "motion/react";
import { type ReactNode, useState } from "react";

export interface CollapsibleMetricsProps {
	title: string;
	icon?: ReactNode;
	children: ReactNode;
	defaultOpen?: boolean;
}

/**
 * CollapsibleMetrics Component
 *
 * Displays progressive disclosure of advanced metrics with smooth
 * height and opacity animations.
 *
 * Features:
 * - Height animation: 0 → auto on expand
 * - Chevron rotation: 0° → 180° on expand
 * - Content fade: opacity 0 → 1 on expand
 * - Keyboard accessible via native button
 * - ARIA-friendly semantic structure
 *
 * @example
 * ```tsx
 * <CollapsibleMetrics title="System Health" icon="⚙️" defaultOpen={false}>
 *   <div className="space-y-2">
 *     <div>API Latency: 120ms</div>
 *     <div>Database: Healthy</div>
 *   </div>
 * </CollapsibleMetrics>
 * ```
 */
export function CollapsibleMetrics({ title, icon, children, defaultOpen = false }: CollapsibleMetricsProps) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<section className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900/20" aria-label={title}>
			{/* Header / Trigger Button */}
			<button
				type="button"
				onClick={() => setIsOpen(!isOpen)}
				className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
				aria-expanded={isOpen}
				aria-controls={`collapsible-content-${title}`}
			>
				<div className="flex items-center gap-3">
					{icon && <span className="text-xl">{icon}</span>}
					<span className="font-semibold text-white">{title}</span>
				</div>

				{/* Rotating Chevron */}
				<m.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.3 }}>
					<ChevronDown className="w-5 h-5 text-slate-400" />
				</m.div>
			</button>

			{/* Collapsible Content */}
			<m.div
				id={`collapsible-content-${title}`}
				initial={false}
				animate={{
					height: isOpen ? "auto" : 0,
					opacity: isOpen ? 1 : 0,
				}}
				transition={{
					duration: 0.3,
					ease: "easeInOut",
				}}
				className="overflow-hidden border-t border-slate-700"
			>
				<div className="px-6 py-4 space-y-3">{children}</div>
			</m.div>
		</section>
	);
}
