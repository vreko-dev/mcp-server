"use client";

import { cn } from "@ui/lib";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type ReactNode, useState } from "react";

export interface SettingsSectionProps {
	title: string;
	description: string;
	children: ReactNode;
	advanced?: boolean;
	className?: string;
}

export function SettingsSection({
	title,
	description,
	children,
	advanced = false,
	className,
}: SettingsSectionProps) {
	const [expanded, setExpanded] = useState(!advanced);

	return (
		<motion.div
			layout
			className={cn("border-b border-terminal-border pb-6", className)}
		>
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full text-left"
			>
				<div className="flex justify-between items-center">
					<div>
						<h3 className="font-semibold text-base">{title}</h3>
						<p className="text-sm text-gray-500 mt-1">{description}</p>
					</div>

					<motion.div
						animate={{ rotate: expanded ? 180 : 0 }}
						className="text-gray-400"
					>
						<ChevronDown className="w-5 h-5" />
					</motion.div>
				</div>
			</button>

			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: "auto", opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
						className="mt-4 overflow-hidden"
					>
						{children}
					</motion.div>
				)}
			</AnimatePresence>
		</motion.div>
	);
}
