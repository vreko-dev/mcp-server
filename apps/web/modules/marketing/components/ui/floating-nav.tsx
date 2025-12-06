"use client";
import { cn } from "@marketing/lib/utils";
// import { ASSETS } from "@marketing/lib/assets"
import { Logo } from "@shared/components/Logo";
import { AnimatePresence, m, useMotionValueEvent, useScroll } from "motion/react";
// import Image from "next/image"
import Link from "next/link";
import type React from "react";
import { useState } from "react";

export const FloatingNav = ({
	navItems,
	className,
}: {
	navItems: {
		name: string;
		link: string;
		icon?: React.ReactElement;
	}[];
	className?: string;
}) => {
	const { scrollYProgress } = useScroll();
	const [visible, setVisible] = useState(true);

	useMotionValueEvent(scrollYProgress, "change", (current) => {
		// Check if current is not undefined and is a number
		if (typeof current === "number") {
			const direction = current! - scrollYProgress.getPrevious()!;

			if (scrollYProgress.get() < 0.05) {
				setVisible(true);
			} else {
				if (direction < 0) {
					setVisible(true);
				} else {
					setVisible(false);
				}
			}
		}
	});

	return (
		<AnimatePresence mode="wait">
			<m.div
				initial={{
					opacity: 1,
					y: -100,
				}}
				animate={{
					y: visible ? 0 : -100,
					opacity: visible ? 1 : 0,
				}}
				transition={{
					duration: 0.2,
				}}
				className={cn(
					"flex max-w-fit fixed top-6 inset-x-0 mx-auto border border-white/[0.1] rounded-full backdrop-blur-md bg-black/50 shadow-[0px_2px_3px_-1px_rgba(0,0,0,0.1),0px_1px_0px_0px_rgba(25,28,33,0.02),0px_0px_0px_1px_rgba(25,28,33,0.08)] z-[5000] px-8 py-4 items-center justify-center space-x-4",
					className,
				)}
			>
				{/* Logo */}
				<Link
					href="/"
					className="flex items-center space-x-2 text-sm font-medium text-white hover:text-neutral-300 transition-colors"
				>
					<div className="flex items-center space-x-2">
						{/* Using existing logo component instead of sbapback.dev logo */}
						<div className="h-6 w-6">
							<Logo withLabel={false} />
						</div>
						<span className="font-bold text-white">SnapBack</span>
					</div>
				</Link>

				{/* Navigation Items */}
				{navItems.map((navItem: any, idx: number) => (
					<Link
						key={`link-${idx}`}
						href={navItem.link}
						className={cn(
							"relative flex items-center space-x-1 text-neutral-600 dark:text-neutral-50 hover:text-neutral-500 dark:hover:text-neutral-300 text-sm font-medium transition-colors",
						)}
					>
						<span className="block sm:hidden">{navItem.icon}</span>
						<span className="hidden sm:block text-sm">{navItem.name}</span>
					</Link>
				))}
			</m.div>
		</AnimatePresence>
	);
};
