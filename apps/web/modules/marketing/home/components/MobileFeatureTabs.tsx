"use client";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@ui/components/accordion";
import { AlertTriangleIcon, CheckCircleIcon, FileTextIcon, ShieldCheckIcon } from "lucide-react";

interface FeatureTab {
	id: string;
	title: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	highlights: {
		icon: React.ComponentType<{ className?: string }>;
		title: string;
		description: string;
	}[];
}

const featureTabs: FeatureTab[] = [
	{
		id: "ai-detection",
		title: "AI Detection",
		description: "Real-time monitoring of AI coding assistants to prevent destructive changes",
		icon: AlertTriangleIcon,
		highlights: [
			{
				icon: CheckCircleIcon,
				title: "Pattern Recognition",
				description: "Detects destructive AI refactoring patterns before they cause damage",
			},
			{
				icon: CheckCircleIcon,
				title: "Multi-Platform Support",
				description: "Works with Cursor, GitHub Copilot, Windsurf, and VS Code",
			},
		],
	},
	{
		id: "auto-checkpoints",
		title: "Auto Checkpoints",
		description: "Automatic version control that captures your code state before AI changes",
		icon: FileTextIcon,
		highlights: [
			{
				icon: CheckCircleIcon,
				title: "Smart Scheduling",
				description: "Creates checkpoints every 5 minutes or before major AI operations",
			},
			{
				icon: CheckCircleIcon,
				title: "Lightning Fast",
				description: "Checkpoint creation in under 100ms with minimal performance impact",
			},
		],
	},
	{
		id: "one-click-recovery",
		title: "One-Click Recovery",
		description: "Restore your codebase to any previous checkpoint with a single click",
		icon: ShieldCheckIcon,
		highlights: [
			{
				icon: CheckCircleIcon,
				title: "Instant Restore",
				description: "Recover your entire project in seconds, not hours",
			},
			{
				icon: CheckCircleIcon,
				title: "Selective Recovery",
				description: "Restore individual files or entire projects as needed",
			},
		],
	},
];

export function MobileFeatureTabs() {
	return (
		<div className="lg:hidden mt-8">
			<Accordion type="single" collapsible defaultValue="ai-detection">
				{featureTabs.map((tab) => (
					<AccordionItem key={tab.id} value={tab.id}>
						<AccordionTrigger className="flex items-center gap-2 py-4">
							<tab.icon className="w-5 h-5" />
							{tab.title}
						</AccordionTrigger>
						<AccordionContent>
							<p className="text-gray-400 mb-4">{tab.description}</p>
							<ul className="space-y-2">
								{tab.highlights.map((highlight, i) => (
									<li key={i} className="flex items-start gap-2">
										<highlight.icon className="w-4 h-4 mt-1 text-green-400" />
										<div>
											<div className="font-medium">{highlight.title}</div>
											<div className="text-sm text-gray-500">{highlight.description}</div>
										</div>
									</li>
								))}
							</ul>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
		</div>
	);
}
