"use client";

import { useLocaleCurrency } from "@shared/hooks/locale-currency";
import { Badge } from "@ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { useMemo } from "react";

type Props = {
	title: string;
	value: number;
	valueFormat: "currency" | "number" | "percentage";
	context?: string;
	icon?: React.ReactNode;
	trend?: number;
};

export function StatsTile({ title, value, context, trend, valueFormat }: Props) {
	const localeCurrency = useLocaleCurrency();

	const formattedValue = useMemo(() => {
		// format currency
		if (valueFormat === "currency") {
			return new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: localeCurrency,
			}).format(value);
		}
		// format percentage
		if (valueFormat === "percentage") {
			return new Intl.NumberFormat("en-US", {
				style: "percent",
			}).format(value);
		}
		// format default number
		return new Intl.NumberFormat("en-US").format(value);
	}, [value, valueFormat, localeCurrency]);

	const formattedTrend = useMemo(() => {
		if (!trend) {
			return null;
		}
		return `${trend >= 0 ? "+" : ""}${new Intl.NumberFormat("en-US", {
			style: "percent",
		}).format(trend)}`;
	}, [trend]);

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-foreground/60 text-sm">{title}</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="flex items-center justify-between">
					<strong className="font-bold text-2xl">
						{formattedValue}
						{context && <small>{context}</small>}
					</strong>
					{trend && <Badge status={trend > 0 ? "success" : "error"}>{formattedTrend}</Badge>}
				</div>
			</CardContent>
		</Card>
	);
}
