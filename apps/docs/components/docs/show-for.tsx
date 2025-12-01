"use client";
import type { PropsWithChildren } from "react";
import type { Tier } from "./tier-context";
import { useTier } from "./tier-context";

export function ShowFor({
	minTier,
	tiers,
	children,
}: PropsWithChildren<{ minTier?: Exclude<Tier, "all">; tiers?: Exclude<Tier, "all">[] }>) {
	const { isAtLeast, isOneOf } = useTier();
	const ok = minTier ? isAtLeast(minTier) : tiers ? isOneOf(tiers) : true;
	return ok ? <>{children}</> : null;
}
