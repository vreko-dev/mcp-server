"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Progress } from "@ui/components/progress";
import { Cpu, Package, Timer, Zap } from "lucide-react";
import Link from "next/link";

interface PerformanceMetricsProps {
	vsixSizeMB: number;
	bundleSizeMB: number;
	loadTimeMs: number;
	activationTimeMs: number;
}

export function PerformanceMetrics({
	vsixSizeMB = 1.5,
	bundleSizeMB = 0.8,
	loadTimeMs = 350,
	activationTimeMs = 200,
}: PerformanceMetricsProps) {
	// Performance targets
	const VSIX_SIZE_TARGET = 2.0;
	const BUNDLE_SIZE_TARGET = 1.0;
	const LOAD_TIME_TARGET = 500;
	const ACTIVATION_TIME_TARGET = 300;

	// Calculate percentages
	const vsixSizePercentage = Math.min((vsixSizeMB / VSIX_SIZE_TARGET) * 100, 100);
	const bundleSizePercentage = Math.min((bundleSizeMB / BUNDLE_SIZE_TARGET) * 100, 100);
	const loadTimePercentage = Math.min((loadTimeMs / LOAD_TIME_TARGET) * 100, 100);
	const activationTimePercentage = Math.min((activationTimeMs / ACTIVATION_TIME_TARGET) * 100, 100);

	// Determine status colors
	const getStatusColor = (percentage: number): string => {
		if (percentage <= 80) {
			return "bg-green-500";
		}
		if (percentage <= 100) {
			return "bg-yellow-500";
		}
		return "bg-red-500";
	};

	const getStatusText = (percentage: number): string => {
		if (percentage <= 80) {
			return "Excellent";
		}
		if (percentage <= 100) {
			return "Good";
		}
		return "Needs Improvement";
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Zap className="h-5 w-5 text-[var(--snapback-green)]" />
						Performance Metrics
					</CardTitle>
					<Link
						href="/docs/performance"
						className="text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						Learn more
					</Link>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* VSIX Size */}
				<div className="space-y-2">
					<div className="flex justify-between items-center">
						<div className="flex items-center gap-2">
							<Package className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium">VSIX Size</span>
						</div>
						<div className="text-sm">
							<span className="font-mono">{vsixSizeMB.toFixed(2)} MB</span>
							<span className="text-muted-foreground"> / {VSIX_SIZE_TARGET} MB</span>
						</div>
					</div>
					<Progress value={vsixSizePercentage} className={getStatusColor(vsixSizePercentage)} />
					<div className="text-xs text-muted-foreground flex justify-between">
						<span>{getStatusText(vsixSizePercentage)}</span>
						<span>{vsixSizePercentage.toFixed(1)}% of budget</span>
					</div>
				</div>

				{/* Bundle Size */}
				<div className="space-y-2">
					<div className="flex justify-between items-center">
						<div className="flex items-center gap-2">
							<Package className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium">Bundle Size</span>
						</div>
						<div className="text-sm">
							<span className="font-mono">{bundleSizeMB.toFixed(2)} MB</span>
							<span className="text-muted-foreground"> / {BUNDLE_SIZE_TARGET} MB</span>
						</div>
					</div>
					<Progress value={bundleSizePercentage} className={getStatusColor(bundleSizePercentage)} />
					<div className="text-xs text-muted-foreground flex justify-between">
						<span>{getStatusText(bundleSizePercentage)}</span>
						<span>{bundleSizePercentage.toFixed(1)}% of budget</span>
					</div>
				</div>

				{/* Load Time */}
				<div className="space-y-2">
					<div className="flex justify-between items-center">
						<div className="flex items-center gap-2">
							<Timer className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium">Load Time</span>
						</div>
						<div className="text-sm">
							<span className="font-mono">{loadTimeMs} ms</span>
							<span className="text-muted-foreground"> / {LOAD_TIME_TARGET} ms</span>
						</div>
					</div>
					<Progress value={loadTimePercentage} className={getStatusColor(loadTimePercentage)} />
					<div className="text-xs text-muted-foreground flex justify-between">
						<span>{getStatusText(loadTimePercentage)}</span>
						<span>{loadTimePercentage.toFixed(1)}% of budget</span>
					</div>
				</div>

				{/* Activation Time */}
				<div className="space-y-2">
					<div className="flex justify-between items-center">
						<div className="flex items-center gap-2">
							<Cpu className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium">Activation Time</span>
						</div>
						<div className="text-sm">
							<span className="font-mono">{activationTimeMs} ms</span>
							<span className="text-muted-foreground"> / {ACTIVATION_TIME_TARGET} ms</span>
						</div>
					</div>
					<Progress value={activationTimePercentage} className={getStatusColor(activationTimePercentage)} />
					<div className="text-xs text-muted-foreground flex justify-between">
						<span>{getStatusText(activationTimePercentage)}</span>
						<span>{activationTimePercentage.toFixed(1)}% of budget</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
