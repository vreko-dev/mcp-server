"use client";

import { cn } from "@ui/lib";
import { type MotionProps, m } from "motion/react";
import type * as React from "react";

function Skeleton({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) {
	return (
		<div
			className={cn("animate-pulse rounded-md bg-muted", className)}
			{...props}
		/>
	);
}

type SkeletonMotionProps = Omit<
	React.HTMLAttributes<HTMLDivElement>,
	"style" | "onAnimationStart" | "onDrag" | "onDragEnd" | "onDragStart"
> &
	MotionProps;

function SkeletonMotion({
	className,
	children,
	...props
}: SkeletonMotionProps) {
	return (
		<m.div
			className={cn("animate-pulse rounded-md bg-muted", className)}
			{...props}
		>
			{children}
		</m.div>
	);
}

export { Skeleton, SkeletonMotion };
