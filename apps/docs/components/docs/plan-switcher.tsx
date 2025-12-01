"use client";
import { captureDocsEvent } from "@/lib/analytics";
import type { Tier } from "./tier-context";
import { useTier } from "./tier-context";

const options: { value: Tier; label: string }[] = [
	{ value: "all", label: "All" },
	{ value: "free", label: "Free" },
	{ value: "solo", label: "Solo" },
	{ value: "team", label: "Team" },
	{ value: "enterprise", label: "Enterprise" },
];

export function PlanSwitcher() {
	const { tier, setTier } = useTier();

	const select = (v: Tier) => {
		if (typeof window !== "undefined") {
			captureDocsEvent({
				name: "docs_plan_filter_changed",
				props: { from_tier: tier, to_tier: v, page_path: window.location.pathname },
			});
		}
		setTier(v);
	};

	const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
		const idx = options.findIndex((o) => o.value === tier);
		const left = idx <= 0 ? options.length - 1 : idx - 1;
		const right = idx >= options.length - 1 ? 0 : idx + 1;
		if (e.key === "ArrowLeft") select(options[left].value);
		if (e.key === "ArrowRight") select(options[right].value);
	};

	return (
		<div
			role="radiogroup"
			aria-label="Filter documentation by plan tier"
			onKeyDown={onKeyDown}
			className="flex gap-2 flex-wrap mb-6"
		>
			{options.map((o) => {
				const active = o.value === tier;
				return (
					<button
						key={o.value}
						type="button"
						role="radio"
						aria-checked={active}
						onClick={() => select(o.value)}
						className={`px-3 py-1 rounded-full border focus:outline-none focus:ring-2 transition-colors ${
							active
								? "border-emerald-500 bg-emerald-500/10 ring-emerald-500 text-emerald-400"
								: "border-slate-600 hover:border-slate-500 text-slate-300 hover:text-slate-200"
						}`}
					>
						{o.label}
					</button>
				);
			})}
		</div>
	);
}
