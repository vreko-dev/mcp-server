"use client";

import { cn } from "@ui/lib";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

export interface OnboardingStep {
	id: string;
	label: string;
	icon: string;
	content: ReactNode;
}

export interface OnboardingWizardProps {
	steps: OnboardingStep[];
	currentStep: number;
	onStepChange: (step: number) => void;
	className?: string;
}

interface StepIndicatorProps {
	step: OnboardingStep;
	index: number;
	active: boolean;
	completed: boolean;
	onClick: () => void;
}

function StepIndicator({
	step,
	index: _index,
	active,
	completed,
	onClick,
}: StepIndicatorProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex flex-col items-center gap-2 relative"
			disabled={!completed && !active}
		>
			{/* Step circle */}
			<motion.div
				className={cn(
					"w-10 h-10 rounded-full flex items-center justify-center text-lg z-10",
					active && "bg-snapback-500 text-white",
					completed && !active && "bg-snapback-700 text-snapback-100",
					!active && !completed && "bg-terminal-surface text-gray-500",
				)}
				whileHover={completed || active ? { scale: 1.1 } : {}}
				whileTap={completed || active ? { scale: 0.95 } : {}}
			>
				{completed && !active ? "✓" : step.icon}
			</motion.div>

			{/* Step label */}
			<span
				className={cn(
					"text-xs text-center max-w-[80px]",
					active && "text-snapback-400 font-medium",
					completed && !active && "text-gray-400",
					!active && !completed && "text-gray-600",
				)}
			>
				{step.label}
			</span>
		</button>
	);
}

export function OnboardingWizard({
	steps,
	currentStep,
	onStepChange,
	className,
}: OnboardingWizardProps) {
	return (
		<div className={cn("space-y-8", className)}>
			{/* Progress indicator */}
			<div className="relative">
				{/* Progress line */}
				<div className="absolute top-5 left-8 right-8 h-0.5 bg-terminal-border">
					<motion.div
						className="h-full bg-snapback-500"
						initial={{ width: "0%" }}
						animate={{
							width: `${(currentStep / (steps.length - 1)) * 100}%`,
						}}
						transition={{ duration: 0.5, ease: "easeInOut" }}
					/>
				</div>

				{/* Steps */}
				<div className="relative flex justify-between">
					{steps.map((step, index) => (
						<StepIndicator
							key={step.id}
							step={step}
							index={index}
							active={index === currentStep}
							completed={index < currentStep}
							onClick={() => index <= currentStep && onStepChange(index)}
						/>
					))}
				</div>
			</div>

			{/* Step content */}
			<AnimatePresence mode="wait">
				<motion.div
					key={currentStep}
					initial={{ opacity: 0, x: 20 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: -20 }}
					transition={{ duration: 0.3 }}
				>
					{steps[currentStep]?.content}
				</motion.div>
			</AnimatePresence>
		</div>
	);
}
