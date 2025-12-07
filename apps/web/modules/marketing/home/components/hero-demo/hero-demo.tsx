"use client";

import { motion, useCycle } from "motion/react";
import { useEffect, useState } from "react";
import { captureEvent } from "@/lib/posthog-client";

import { DEMO_NODES } from "./data";
import { EditorFrame } from "./editor-frame";
import { TimelineTrack } from "./timeline-track";
import type { DemoState } from "./types";

export function HeroDemo() {
	const [state, cycleState] = useCycle<DemoState>("safe", "ai_edit", "break", "restored");
	const [showRestorePrompt, setShowRestorePrompt] = useState(false);
	const [showCTA, setShowCTA] = useState(false); // In-editor CTA

	// Current state data
	const currentNode = DEMO_NODES.find((n) => n.id === state) ?? DEMO_NODES[0];

	// Automation Sequencer
	useEffect(() => {
		let timeout: NodeJS.Timeout;

		if (state === "safe") {
			// Hold Safe for 1.5s
			timeout = setTimeout(() => cycleState(), 1500);
		} else if (state === "ai_edit") {
			// Edit for 1.2s -> Break
			timeout = setTimeout(() => cycleState(), 1200);
		} else if (state === "break") {
			// Break -> Wait for interaction (or auto-show button?)
			// Spec says: "WAIT FOR CLICK (or 3s auto-continue)" - Let's make button appear fast
			timeout = setTimeout(() => setShowRestorePrompt(true), 800);
		} else if (state === "restored") {
			// Restored -> Show CTA after animation
			timeout = setTimeout(() => setShowCTA(true), 600);
		}

		return () => clearTimeout(timeout);
	}, [state, cycleState]);

	const handleRestore = () => {
		captureEvent("hero_restore_click", { from_state: state });
		setShowRestorePrompt(false);
		cycleState(3); // Jump to restored (index 3)
	};

	// User Interaction Handlers for Timeline
	const handleNodeClick = (_id: DemoState) => {
		// Reset flows if jumping
		setShowRestorePrompt(false);
		setShowCTA(false);
		// Find index to jump to proper cycle state (messy with useCycle, but we can set state if we used useState,
		// but useCycle cycles through. We might need a better state manager or just accept the limitation.
		// For now, let's just let it be automated or simple click-to-start.
		// Implementing full jump support with useCycle is tricky without exposed setter for specific index in older versions.
		// Actually cycleState(i) works in some versions, but let's stick to simple flow for reliability or re-init.)

		// Actually, let's just use the restore button as the main interactor for now to avoid complexity in this step.
	};

	return (
		<div className="relative w-full max-w-6xl mx-auto flex flex-col items-center">
			{/* V4 Layout: Side-by-Side on Desktop */}
			<div className="flex flex-col md:flex-row gap-6 w-full items-start">
				{/* Main Editor Component */}
				<motion.div
					className="relative z-10 flex-1 w-full"
					animate={state === "restored" ? { scale: [1, 1.01, 1] } : {}}
					transition={{ duration: 0.4, ease: "backOut" }} // Elastic snap
				>
					<EditorFrame
						node={currentNode!}
						currentState={state}
						showCTA={showCTA}
						showRestorePrompt={showRestorePrompt}
						onRestore={handleRestore}
					>
						<CodeDisplay code={currentNode!.code} state={state} />
					</EditorFrame>
				</motion.div>

				{/* Timeline (Right Sidebar) - Vertical on Desktop, Hidden/Horizontal on Mobile?
                    Actually let's keep it clean: Horizontal on Mobile (top/bottom?), Vertical on Desktop (right).
                    Let's hide it on mobile for now or put it below? User said "above the fold" focus.
                    Let's put it to the right on desktop, and maybe horizontally below on mobile.
                */}
				<div className="hidden md:flex shrink-0">
					<TimelineTrack nodes={DEMO_NODES} currentState={state} orientation="vertical" />
				</div>
				{/* Mobile Timeline (Horizontal Bottom) */}
				<div className="md:hidden w-full mt-8">
					<TimelineTrack nodes={DEMO_NODES} currentState={state} orientation="horizontal" />
				</div>
			</div>
		</div>
	);
}

// Simple Code Display Helper
function CodeDisplay({ code, state }: { code?: string; state: string }) {
	if (!code) return null;

	return (
		<pre className="font-mono text-sm leading-6 p-4">
			<code
				dangerouslySetInnerHTML={{
					__html: code
						.replace(/export const/g, '<span class="text-[#C586C0]">export const</span>')
						.replace(/process.env/g, '<span class="text-[#4EC9B0]">process.env</span>')
						.replace(/"(.+)"/g, '<span class="text-[#CE9178]">"$1"</span>')
						.replace(/:/g, '<span class="text-[#D4D4D4]">:</span>')
						.replace(/\/\/.*/g, '<span class="text-[#6A9955]">$&</span>'), // Comments
				}}
			/>
		</pre>
	);
}
