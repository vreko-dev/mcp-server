"use client";

import { Card } from "@ui/components/card";
import { ShieldCheck } from "lucide-react";

interface ProtectionStatusProps {
	snapshotCount: number;
	isActive: boolean;
}

export function ProtectionStatus({ snapshotCount, isActive }: ProtectionStatusProps) {
	if (!isActive) {
		return null;
	}

	return (
		<Card className="bg-gradient-to-r from-[var(--snapback-green)]/10 to-transparent border border-[var(--snapback-green)]/30 p-6">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div className="relative">
						<ShieldCheck
							className="h-12 w-12 text-[var(--snapback-green)]"
							data-testid="status-icon"
							aria-label="Protection active"
						/>
						<div className="absolute inset-0 h-12 w-12 bg-[var(--snapback-green)] blur-xl opacity-30 animate-pulse" />
					</div>
					<div>
						<h2 className="text-2xl font-bold text-white flex items-center gap-2">Protection Active</h2>
						<p className="text-neutral-400 mt-1">Your code is being monitored and protected</p>
					</div>
				</div>
				<div className="text-right">
					<div className="text-4xl font-mono font-bold text-white">{snapshotCount}</div>
					<div className="text-sm text-neutral-400">Snapshots Created</div>
				</div>
			</div>
		</Card>
	);
}
