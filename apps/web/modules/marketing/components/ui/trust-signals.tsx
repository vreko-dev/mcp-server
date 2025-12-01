"use client";

import { cn } from "@ui/lib";
import { Clock, Mail, ShieldCheck } from "lucide-react";

interface TrustSignalsProps {
	className?: string;
}

export function TrustSignals({ className }: TrustSignalsProps) {
	const signals = [
		{
			icon: <Clock className="h-3 w-3" />,
			text: "1-minute signup",
		},
		{
			icon: <ShieldCheck className="h-3 w-3" />,
			text: "Zero code access",
		},
		{
			icon: <Mail className="h-3 w-3" />,
			text: "No spam ever",
		},
	];

	return (
		<div
			className={cn(
				"flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-[#A0A0A0]",
				className,
			)}
		>
			{signals.map((signal, index) => (
				<div key={index} className="flex items-center gap-2">
					{signal.icon}
					<span>{signal.text}</span>
				</div>
			))}
		</div>
	);
}
