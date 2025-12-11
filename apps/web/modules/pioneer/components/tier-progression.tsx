"use client";

import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { TIERS, type Tier } from "../lib/tiers";

interface TierProgressionProps {
	currentTier: Tier;
	currentPoints: number;
	className?: string;
	nextTier?: Tier | null;
	pointsToNext?: number;
}

export function TierProgression({
	currentTier,
	currentPoints,
	className,
	nextTier,
	pointsToNext,
}: TierProgressionProps) {
	// Calculate overall progress percentage relative to Guardian (1500)
	// or relative to next tier?
	// Visual style: [Seedling] -- [Grower] -- [Cultivator] -- [Guardian]
	//                  ^ You are here

	return (
		<div className={cn("w-full max-w-3xl mx-auto mt-8", className)}>
			<div className="relative flex justify-between mb-2">
				{/* Draw connecting line behind */}
				<div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -translate-y-1/2 rounded-full" />

				{TIERS.map((tier) => {
					const isUnlocked = currentPoints >= tier.minPoints;
					const isCurrent = currentTier === tier.name.toLowerCase();

					return (
						<div key={tier.name} className="flex flex-col items-center">
							<div
								className={cn(
									"w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors bg-background",
									isUnlocked
										? "border-primary bg-primary text-primary-foreground"
										: "border-muted-foreground text-muted-foreground",
									isCurrent && "ring-4 ring-primary/20 scale-110",
								)}
							>
								{isUnlocked ? (
									<Check className="h-4 w-4" />
								) : (
									<div className="h-2 w-2 rounded-full bg-muted-foreground" />
								)}
							</div>
							<span
								className={cn(
									"text-xs mt-2 font-medium",
									isUnlocked ? "text-foreground" : "text-muted-foreground",
								)}
							>
								{tier.emoji} {tier.name}
							</span>
						</div>
					);
				})}
			</div>

			{nextTier && (
				<div className="mt-4 text-center">
					<p className="text-sm text-muted-foreground">
						<span className="font-mono font-bold text-foreground">{pointsToNext} pts</span> until {nextTier}
					</p>
					<Progress value={(currentPoints % 500) / 5} className="h-2 mt-2" />
				</div>
			)}
		</div>
	);
}
