"use client";
import type React from "react";

export function FeaturesSectionDemo() {
	const features = [
		{
			title: "AI Detection",
			description: "Knows when AI touches your code",
			details: "Detects Copilot, Cursor, Windsurf patterns",
			icon: <IconAI />,
		},
		{
			title: "Smart Checkpoints",
			description: "Saves the right moments, not every moment",
			details: "Checkpoints before risky operations",
			icon: <IconCheckpoint />,
		},
		{
			title: "Instant Recovery",
			description: "One click back to safety",
			details: "Visual diff of all changes",
			icon: <IconRecover />,
		},
		{
			title: "Team Sync",
			description: "Shared protection across your team",
			details: "Real-time checkpoint sharing",
			icon: <IconTeam />,
		},
		{
			title: "Git Integration",
			description: "Works alongside your existing workflow",
			details: "Complements, doesn't replace",
			icon: <IconGit />,
		},
		{
			title: "Zero Config",
			description: "Protection from the first keystroke",
			details: "Auto-detects your environment",
			icon: <IconZero />,
		},
	];

	return (
		<div className="container mx-auto">
			<div className="text-center mb-16">
				<h2 className="text-display font-black text-white mb-6">
					Protection First, Always
				</h2>
				<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
					Comprehensive AI safety features that work seamlessly with your
					development workflow
				</p>
			</div>

			{/* Bento Grid Layout */}
			<div className="grid md:auto-rows-[18rem] grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto">
				{features.map((feature, index) => (
					<FeatureCard
						key={index}
						{...feature}
						className={index === 0 || index === 3 ? "md:col-span-2" : ""}
					/>
				))}
			</div>
		</div>
	);
}

const FeatureCard = ({
	title,
	description,
	details,
	icon,
	className = "",
}: {
	title: string;
	description: string;
	details: string;
	icon: React.ReactNode;
	className?: string;
}) => {
	return (
		<div className={`card-neon group h-full ${className}`}>
			<div className="flex items-center mb-4">
				<div className="p-2 bg-primary/10 rounded-lg mr-4 group-hover:bg-primary/20 transition-colors">
					{icon}
				</div>
				<h3 className="text-xl font-bold text-white">{title}</h3>
			</div>
			<p className="text-muted-foreground mb-3">{description}</p>
			<p className="text-sm text-primary">{details}</p>
		</div>
	);
};

// Icon components
const IconAI = () => (
	<svg
		width="24"
		height="24"
		fill="none"
		viewBox="0 0 24 24"
		className="text-primary"
	>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M9.5 2A2.5 2.5 0 0 0 7 4.5v15A2.5 2.5 0 0 0 9.5 22h5a2.5 2.5 0 0 0 2.5-2.5v-15A2.5 2.5 0 0 0 14.5 2h-5Z"
		/>
	</svg>
);

const IconCheckpoint = () => (
	<svg
		width="24"
		height="24"
		fill="none"
		viewBox="0 0 24 24"
		className="text-primary"
	>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 0 1 1.946-.806 3.42 3.42 0 0 1 4.438 0 3.42 3.42 0 0 1 1.946.806 3.42 3.42 0 0 1 3.138 3.138 3.42 3.42 0 0 1 .806 1.946 3.42 3.42 0 0 1 0 4.438 3.42 3.42 0 0 1-.806 1.946 3.42 3.42 0 0 1-3.138 3.138 3.42 3.42 0 0 1-1.946.806 3.42 3.42 0 0 1-4.438 0 3.42 3.42 0 0 1-1.946-.806 3.42 3.42 0 0 1-3.138-3.138 3.42 3.42 0 0 1-.806-1.946 3.42 3.42 0 0 1 0-4.438 3.42 3.42 0 0 1 .806-1.946 3.42 3.42 0 0 1 3.138-3.138Z"
		/>
	</svg>
);

const IconRecover = () => (
	<svg
		width="24"
		height="24"
		fill="none"
		viewBox="0 0 24 24"
		className="text-primary"
	>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"
		/>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"
		/>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M3 21v-5h5"
		/>
	</svg>
);

const IconTeam = () => (
	<svg
		width="24"
		height="24"
		fill="none"
		viewBox="0 0 24 24"
		className="text-primary"
	>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
		/>
	</svg>
);

const IconGit = () => (
	<svg
		width="24"
		height="24"
		fill="none"
		viewBox="0 0 24 24"
		className="text-primary"
	>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
		/>
	</svg>
);

const IconZero = () => (
	<svg
		width="24"
		height="24"
		fill="none"
		viewBox="0 0 24 24"
		className="text-primary"
	>
		<path
			stroke="currentColor"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={2}
			d="M12 3a6.364 6.364 0 0 0 9 9 9 9 0 1 1-9-9Z"
		/>
	</svg>
);
