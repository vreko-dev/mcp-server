import type { ReactNode } from "react";

// Plan types available in the system
type ProductReferenceId = "free" | "pro" | "team";

export function usePlanData() {
	const planData: Record<
		ProductReferenceId,
		{
			title: string;
			description: ReactNode;
			features: ReactNode[];
		}
	> = {
		free: {
			title: "Free",
			description: "Perfect for getting started",
			features: ["VS Code extension", "CLI tool included", "Unlimited local checkpoints", "Community support"],
		},
		pro: {
			title: "Pro",
			description: "Enhanced Protection for Individual Power Users",
			features: [
				"Everything in Free",
				"Cloud checkpoint backup",
				"Priority support",
				"Advanced AI detection (learns your patterns)",
				"Custom rules engine",
				"Free snapback cap 🧢",
			],
		},
		team: {
			title: "Team",
			description: "Collaborative Safety for Growing Teams",
			features: [
				"Everything in Pro",
				"Centralized policies",
				"Shared checkpoints",
				"Admin dashboard",
				"Audit logs",
				"SSO integration",
			],
		},
	};

	return { planData };
}
