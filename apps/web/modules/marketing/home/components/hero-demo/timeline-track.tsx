"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import type { DemoNode, DemoState } from "./types";

interface TimelineTrackProps {
	nodes: DemoNode[];
	currentState: DemoState;
}

export function TimelineTrack({
	nodes,
	currentState,
	orientation = "horizontal",
}: TimelineTrackProps & { orientation?: "horizontal" | "vertical" }) {
	const getNodeStatus = (nodeId: string, currentId: string) => {
		const states = ["safe", "ai_edit", "break", "restored"];
		const currentIndex = states.indexOf(currentId);
		const nodeIndex = states.indexOf(nodeId);

		if (nodeId === "restored" && currentId === "restored") {
			return "restored";
		}
		if (nodeId === currentId && currentId === "break") {
			return "danger";
		}
		if (nodeIndex <= currentIndex) {
			return "active";
		}
		return "inactive";
	};

	const isVertical = orientation === "vertical";

	return (
		<div
			className={`
            flex justify-between items-center relative
            ${isVertical ? "flex-col h-full py-12 gap-12 w-16" : "w-full flex-row mb-8 md:px-12"}
        `}
		>
			{/* Connector Line Background */}
			{isVertical ? (
				<div className="absolute top-12 bottom-12 left-1/2 w-0.5 bg-[#27272A] -z-10 -translate-x-1/2 hidden md:block" />
			) : (
				<div className="absolute top-5 left-0 right-0 h-0.5 bg-[#27272A] -z-10 mx-16 hidden md:block" />
			)}

			{/* Active Progress Line */}
			{isVertical ? (
				<motion.div
					className="absolute top-12 left-1/2 w-0.5 bg-green-500 -z-10 -translate-x-1/2 hidden md:block origin-top"
					initial={{ scaleY: 0 }}
					animate={{
						scaleY:
							currentState === "safe"
								? 0
								: currentState === "ai_edit"
									? 0.33
									: currentState === "break"
										? 0.66
										: 1,
					}}
					transition={{ duration: 0.5, ease: "easeInOut" }}
					style={{ height: "calc(100% - 6rem)" }}
				/>
			) : (
				<motion.div
					className="absolute top-5 left-0 h-0.5 bg-green-500 -z-10 mx-16 hidden md:block origin-left"
					initial={{ scaleX: 0 }}
					animate={{
						scaleX:
							currentState === "safe"
								? 0
								: currentState === "ai_edit"
									? 0.33
									: currentState === "break"
										? 0.66
										: 1,
					}}
					transition={{ duration: 0.5, ease: "easeInOut" }}
				/>
			)}

			{nodes.map((node, _index) => {
				const status = getNodeStatus(node.id, currentState);
				// ... (rest of map)

				return (
					<div
						key={node.id}
						className={`flex items-center gap-4 group cursor-pointer relative ${isVertical ? "flex-row-reverse w-full justify-center" : "flex-col"}`}
					>
						{/* Tooltip Label (Desktop Vertical only - show on side?)
                            Actually simple label next to node if vertical?
                            Let's keep it clean. If vertical, maybe hide labels or show on hover?
                            For now, let's just make the node active.
                        */}

						{/* Node Circle */}
						<motion.div
							className={`
                                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 z-10 shrink-0
                                ${status === "inactive" ? "bg-[#18181B] border-[#27272A] text-gray-500" : ""}
                                ${status === "active" ? "bg-[#09090B] border-green-500 text-green-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : ""}
                                ${status === "danger" ? "bg-[#09090B] border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] animate-pulse" : ""}
                                ${status === "restored" ? "bg-green-500 border-green-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.5)]" : ""}
                            `}
							animate={status === "active" || status === "danger" ? { scale: [1, 1.1, 1] } : { scale: 1 }}
							transition={{ duration: 0.3 }}
						>
							{status === "restored" ? <Check className="w-5 h-5" /> : node.icon}
						</motion.div>

						{/* Labels - Different for Vertical */}
						<div
							className={`flex flex-col ${isVertical ? "items-start absolute left-14 w-32 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 p-2 rounded border border-white/10 z-50 pointer-events-none" : "items-center text-center"}`}
						>
							<span
								className={`text-xs font-semibold ${
									status === "active" || status === "restored" ? "text-white" : "text-gray-500"
								}`}
							>
								{node.label}
							</span>
							<span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
								{node.sublabel}
							</span>
						</div>
					</div>
				);
			})}
		</div>
	);
}
