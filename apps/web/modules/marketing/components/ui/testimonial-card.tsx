"use client";

import { cn } from "@ui/lib";
import { useReducedMotion } from "@ui/lib/motion";
import { QuoteIcon } from "lucide-react";
import { motion } from "motion/react";
import { forwardRef } from "react";

interface TestimonialCardProps {
	quote: string;
	author: string;
	role: string;
	company: string;
	avatar?: string;
	className?: string;
	[key: string]: any;
}

export const TestimonialCard = forwardRef<HTMLDivElement, TestimonialCardProps>(
	({ quote, author, role, company, avatar, className, ...props }, ref) => {
		const reducedMotion = useReducedMotion();

		return (
			<motion.div
				ref={ref}
				className={cn(
					"relative rounded-2xl border border-white/10 bg-gradient-to-br from-snapback-dark to-snapback-surface p-6 backdrop-blur-xl shadow-lg",
					className,
				)}
				whileHover={
					reducedMotion
						? {}
						: {
								y: -10,
								scale: 1.02,
								boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
							}
				}
				transition={{ type: "spring", stiffness: 300, damping: 20 }}
				{...props}
			>
				{/* Quote icon */}
				<motion.div
					className="absolute top-4 right-4 text-snapback-green/20"
					initial={reducedMotion ? {} : { opacity: 0, scale: 0 }}
					animate={reducedMotion ? {} : { opacity: 1, scale: 1 }}
					transition={{ duration: 0.3, delay: 0.2 }}
				>
					<QuoteIcon className="size-8" />
				</motion.div>

				{/* Quote text */}
				<motion.p
					className="relative text-lg text-foreground/80 italic mb-6"
					initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
					animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.1 }}
				>
					"{quote}"
				</motion.p>

				{/* Author info */}
				<motion.div
					className="flex items-center gap-4"
					initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
					animate={reducedMotion ? {} : { opacity: 1, y: 0 }}
					transition={{ duration: 0.3, delay: 0.3 }}
				>
					{avatar ? (
						<motion.img
							src={avatar}
							alt={author}
							className="size-12 rounded-full object-cover"
							whileHover={reducedMotion ? {} : { scale: 1.1 }}
							transition={{ type: "spring", stiffness: 300 }}
						/>
					) : (
						<motion.div
							className="size-12 rounded-full bg-snapback-green/20 flex items-center justify-center"
							whileHover={reducedMotion ? {} : { scale: 1.1 }}
							transition={{ type: "spring", stiffness: 300 }}
						>
							<span className="font-bold text-snapback-green">{author.charAt(0)}</span>
						</motion.div>
					)}

					<div>
						<motion.h4 className="font-bold text-foreground" whileHover={reducedMotion ? {} : { x: 5 }}>
							{author}
						</motion.h4>
						<motion.p className="text-sm text-foreground/60" whileHover={reducedMotion ? {} : { x: 3 }}>
							{role}, {company}
						</motion.p>
					</div>
				</motion.div>

				{/* Decorative elements */}
				<motion.div
					className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-snapback-green/50 to-transparent rounded-b-2xl"
					initial={reducedMotion ? {} : { scaleX: 0 }}
					animate={reducedMotion ? {} : { scaleX: 1 }}
					transition={{ duration: 0.5, delay: 0.5 }}
				/>
			</motion.div>
		);
	},
);

TestimonialCard.displayName = "TestimonialCard";
