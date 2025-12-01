"use client";

import { cn } from "@ui/lib";
import { motion } from "motion/react";
import type { ReactNode } from "react";

export interface EmptySnapshotsProps {
	title?: string;
	description?: string;
	action?: ReactNode;
	className?: string;
}

export function EmptySnapshots({
	title = "No snapshots yet",
	description = "Your code is unprotected. Let's fix that!",
	action,
	className,
}: EmptySnapshotsProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className={cn("text-center py-12", className)}
		>
			<motion.div
				animate={{
					rotate: [0, 10, -10, 0],
					scale: [1, 1.1, 1],
				}}
				transition={{
					duration: 2,
					repeat: Number.POSITIVE_INFINITY,
					repeatDelay: 3,
				}}
				className="text-6xl mb-4"
			>
				🛡️
			</motion.div>
			<h3 className="text-lg font-semibold mb-2">{title}</h3>
			<p className="text-gray-500 mb-6">{description}</p>
			{action}
		</motion.div>
	);
}
