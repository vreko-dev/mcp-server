"use client";

import type { BadgeProps } from "@ui/components/badge";
import { Badge } from "@ui/components/badge";

export function SubscriptionStatusBadge({
	status,
}: {
	status: string;
	className?: string;
}) {
	const badgeLabels: Record<string, string> = {
		active: "Active",
		canceled: "Canceled",
		expired: "Expired",
		incomplete: "Incomplete",
		past_due: "Past Due",
		paused: "Paused",
		trialing: "Trial",
		unpaid: "Unpaid",
	};

	const badgeColors: Record<string, BadgeProps["status"]> = {
		active: "success",
		canceled: "error",
		expired: "error",
		incomplete: "warning",
		past_due: "warning",
		paused: "warning",
		trialing: "info",
		unpaid: "error",
	};

	return <Badge status={badgeColors[status]}>{badgeLabels[status]}</Badge>;
}
