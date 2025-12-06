import type { Tier } from "./tier-context";

const tierColors: Record<Exclude<Tier, "all">, string> = {
	free: "bg-gray-600/20 text-gray-400 border-gray-600",
	pro: "bg-blue-600/20 text-blue-400 border-blue-600",
	team: "bg-purple-600/20 text-purple-400 border-purple-600",
	enterprise: "bg-amber-600/20 text-amber-400 border-amber-600",
};

const tierLabels: Record<Exclude<Tier, "all">, string> = {
	free: "Free",
	pro: "Pro",
	team: "Team",
	enterprise: "Enterprise",
};

export function TierBadge({ tier }: { tier: Exclude<Tier, "all"> }) {
	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${tierColors[tier]}`}
			title={`Available in ${tierLabels[tier]} plan`}
		>
			{tierLabels[tier]}
		</span>
	);
}
