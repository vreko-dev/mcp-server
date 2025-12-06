"use client";

import { cn } from "@ui/lib";
import { motion } from "motion/react";
import React from "react";

interface AnimatedListProps {
	className?: string;
	delay?: number;
	children: React.ReactNode;
}

export const AnimatedList = ({ className, delay = 1000, children }: AnimatedListProps) => {
	return (
		<div className={cn("space-y-4", className)}>
			{React.Children.map(children, (child, index) => (
				<motion.div
					key={index}
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{
						duration: 0.5,
						delay: index * (delay / 1000),
					}}
					className="w-full"
				>
					{child}
				</motion.div>
			))}
		</div>
	);
};

interface NotificationItemProps {
	title: string;
	description: string;
	timestamp: string;
	icon: string;
	riskLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
	className?: string;
}

export const NotificationItem = ({
	title,
	description,
	timestamp,
	icon,
	riskLevel = "LOW",
	className,
}: NotificationItemProps) => {
	const getRiskColor = () => {
		switch (riskLevel) {
			case "LOW":
				return "text-green-500";
			case "MEDIUM":
				return "text-yellow-500";
			case "HIGH":
				return "text-orange-500";
			case "CRITICAL":
				return "text-red-500";
			default:
				return "text-gray-500";
		}
	};

	return (
		<div className={cn("flex items-start gap-3 p-3 rounded-lg bg-card border", className)}>
			<div className="text-lg">{icon}</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center justify-between">
					<h4 className="font-medium text-sm">{title}</h4>
					<span className="text-xs text-muted-foreground">{timestamp}</span>
				</div>
				<p className="text-sm text-muted-foreground mt-1">{description}</p>
				<div className="flex items-center gap-2 mt-2">
					<span className={cn("text-xs font-medium", getRiskColor())}>{riskLevel} RISK</span>
				</div>
			</div>
		</div>
	);
};
