"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Tier = "all" | "free" | "pro" | "team" | "enterprise";
const rank: Record<Exclude<Tier, "all">, number> = { free: 0, pro: 1, team: 2, enterprise: 3 };

type Ctx = {
	tier: Tier;
	setTier: (t: Tier) => void;
	isAtLeast: (min: Exclude<Tier, "all">) => boolean;
	isOneOf: (tiers: Exclude<Tier, "all">[]) => boolean;
};

const TierContext = createContext<Ctx | null>(null);
const KEY = "docs-tier-preference";

export function TierProvider({ children }: { children: React.ReactNode }) {
	const [tier, setTierState] = useState<Tier>("all");

	useEffect(() => {
		const saved = typeof window !== "undefined" ? (localStorage.getItem(KEY) as Tier | null) : null;
		if (saved) {
			setTierState(saved);
		}
	}, []);

	const setTier = (t: Tier) => {
		setTierState(t);
		try {
			localStorage.setItem(KEY, t);
		} catch {
			// Silently fail in private browsing mode
		}
	};

	const value = useMemo<Ctx>(
		() => ({
			tier,
			setTier,
			isAtLeast: (min) => tier === "all" || rank[tier as Exclude<Tier, "all">] >= rank[min],
			isOneOf: (tiers) => tier === "all" || tiers.includes(tier as Exclude<Tier, "all">),
		}),
		[tier],
	);

	return <TierContext.Provider value={value}>{children}</TierContext.Provider>;
}

export const useTier = () => {
	const ctx = useContext(TierContext);
	if (!ctx) {
		throw new Error("useTier must be used within TierProvider");
	}
	return ctx;
};
