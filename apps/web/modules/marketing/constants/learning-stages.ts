export interface LearningStage {
	period: string;
	accuracy: number;
	label: string;
	features: string[];
	tier: "free" | "pro";
	highlighted: boolean;
}

export const LEARNING_STAGES: LearningStage[] = [
	{
		period: "Day 1",
		accuracy: 94,
		label: "Catches the obvious",
		features: ["Exposed secrets", "Phantom dependencies", "Broken test mocks"],
		tier: "free",
		highlighted: false,
	},
	{
		period: "Day 30",
		accuracy: 98,
		label: "Knows YOUR patterns",
		features: ['"Cursor always breaks this auth module"', "Team-specific antipatterns", "Codebase-aware detection"],
		tier: "pro",
		highlighted: false,
	},
	{
		period: "Month 3",
		accuracy: 99,
		label: "Predicts problems",
		features: ["Warns before you save", "Learns from near-misses", "Zero false positives"],
		tier: "pro",
		highlighted: true,
	},
];
