"use client";

import { cn } from "@ui/lib";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface Tab {
	title: string;
	value: string;
	content?: string | React.ReactNode | any;
}

interface TabsProps {
	tabs: Tab[];
	containerClassName?: string;
	activeTabClassName?: string;
	tabClassName?: string;
	contentClassName?: string;
}

export const Tabs = ({
	tabs: propTabs,
	containerClassName,
	activeTabClassName,
	tabClassName,
	contentClassName,
}: TabsProps) => {
	const firstTab = propTabs[0];
	const [active, setActive] = useState<Tab>(firstTab ?? { title: "", value: "" });

	return (
		<>
			<div
				className={cn(
					"flex flex-row items-center justify-start gap-2 relative overflow-auto sm:overflow-visible no-visible-scrollbar max-w-full w-full",
					containerClassName,
				)}
			>
				{propTabs.map((tab) => (
					<button
						key={tab.title}
						onClick={() => setActive(tab)}
						className={cn(
							"relative px-6 py-3 rounded-full transition-colors",
							active.value === tab.value ? "text-white" : "text-gray-400 hover:text-gray-300",
							tabClassName,
						)}
					>
						{active.value === tab.value && (
							<motion.div
								layoutId="activeTab"
								transition={{
									type: "spring",
									bounce: 0.2,
									duration: 0.6,
								}}
								className={cn("absolute inset-0 bg-snapback-green rounded-full", activeTabClassName)}
							/>
						)}
						<span className="relative z-10 font-medium">{tab.title}</span>
					</button>
				))}
			</div>

			<AnimatePresence mode="wait">
				<motion.div
					key={active.value}
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -10 }}
					transition={{ duration: 0.3 }}
					className={cn("mt-8", contentClassName)}
				>
					{active.content}
				</motion.div>
			</AnimatePresence>
		</>
	);
};

interface FadeInDivProps {
	className?: string;
	tabs: Tab[];
	key?: string;
}

// Legacy component - no longer used but keeping for backwards compatibility
export const FadeInDiv = ({ className, tabs }: FadeInDivProps) => {
	return <div className={cn("w-full", className)}>{tabs[0]?.content}</div>;
};
