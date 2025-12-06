"use client";

import { formatDistanceToNow } from "date-fns";
import { AlertCircle, RotateCcw, Zap } from "lucide-react";
import { m } from "motion/react";
import { useEffect, useState } from "react";

interface Win {
	id: string;
	timestamp: Date;
	type: "restore" | "prevention" | "threat-detection";
	fileName: string;
	description: string;
	timeSaved?: number;
	severity?: "low" | "medium" | "high";
}

interface RecentWinsTimelineProps {
	wins: Win[];
	onWinClick?: (win: Win) => void;
}

export function RecentWinsTimeline({ wins, onWinClick }: RecentWinsTimelineProps) {
	const [isMounted, setIsMounted] = useState(false);

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const getWinIcon = (type: string) => {
		switch (type) {
			case "restore":
				return <RotateCcw className="w-5 h-5 text-emerald-400" />;
			case "prevention":
				return <AlertCircle className="w-5 h-5 text-amber-300" />;
			case "threat-detection":
				return <Zap className="w-5 h-5 text-rose-400" />;
			default:
				return null;
		}
	};

	const getWinColor = (type: string) => {
		switch (type) {
			case "restore":
				return "border-emerald-400/30 bg-emerald-500/5";
			case "prevention":
				return "border-amber-300/30 bg-amber-300/5";
			case "threat-detection":
				return "border-rose-400/30 bg-rose-500/5";
			default:
				return "border-sky-300/30 bg-sky-300/5";
		}
	};

	const getSeverityColor = (severity?: string) => {
		switch (severity) {
			case "high":
				return "text-rose-400";
			case "medium":
				return "text-amber-300";
			case "low":
				return "text-emerald-400";
			default:
				return "text-slate-400";
		}
	};

	if (!isMounted) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-2xl font-bold">Recent Wins & Recoveries</h2>
					<span className="text-sm text-slate-500">{wins.length} this week</span>
				</div>

				<div className="space-y-3">
					{wins.length === 0 ? (
						<div className="text-center py-8 text-slate-500">
							<p>No recent wins yet. Create a snapshot to get started!</p>
						</div>
					) : (
						wins.map((win) => (
							<div
								key={win.id}
								className={`rounded-lg border p-4 cursor-pointer transition-all ${getWinColor(win.type)}`}
							>
								<div className="flex gap-4">
									<div className="flex-shrink-0 mt-1">{getWinIcon(win.type)}</div>

									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between gap-2 mb-1">
											<div>
												<p className="font-semibold text-white truncate">{win.description}</p>
												<p className="text-sm text-slate-400 truncate">{win.fileName}</p>
											</div>
											{win.severity && (
												<span
													className={`text-xs font-medium flex-shrink-0 ${getSeverityColor(win.severity)}`}
												>
													{win.severity.charAt(0).toUpperCase() + win.severity.slice(1)}
												</span>
											)}
										</div>

										<div className="flex items-center justify-between text-xs">
											<span className="text-slate-500">
												📅{" "}
												{formatDistanceToNow(win.timestamp, {
													addSuffix: true,
												})}
											</span>
											{win.timeSaved && (
												<span className="text-emerald-400 font-semibold">
													Saved you ~{win.timeSaved}m
												</span>
											)}
										</div>
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">Recent Wins & Recoveries</h2>
				<span className="text-sm text-slate-500">{wins.length} this week</span>
			</div>

			<div className="space-y-3">
				{wins.length === 0 ? (
					<div className="text-center py-8 text-slate-500">
						<p>No recent wins yet. Create a snapshot to get started!</p>
					</div>
				) : (
					wins.map((win, index) => (
						<m.div
							key={win.id}
							initial={{ opacity: 1, x: 0 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{
								duration: 0.4,
								delay: index * 0.1,
								ease: "easeOut",
							}}
							whileHover={{ x: 4 }}
							onClick={() => onWinClick?.(win)}
							className={`rounded-lg border p-4 cursor-pointer transition-all ${getWinColor(win.type)}`}
						>
							<div className="flex gap-4">
								<div className="flex-shrink-0 mt-1">{getWinIcon(win.type)}</div>

								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between gap-2 mb-1">
										<div>
											<p className="font-semibold text-white truncate">{win.description}</p>
											<p className="text-sm text-slate-400 truncate">{win.fileName}</p>
										</div>
										{win.severity && (
											<span
												className={`text-xs font-medium flex-shrink-0 ${getSeverityColor(win.severity)}`}
											>
												{win.severity.charAt(0).toUpperCase() + win.severity.slice(1)}
											</span>
										)}
									</div>

									<div className="flex items-center justify-between text-xs">
										<span className="text-slate-500">
											📅{" "}
											{formatDistanceToNow(win.timestamp, {
												addSuffix: true,
											})}
										</span>
										{win.timeSaved && (
											<m.span
												initial={{ opacity: 0 }}
												whileInView={{ opacity: 1 }}
												viewport={{ once: true }}
												transition={{ delay: 0.2 }}
												className="text-emerald-400 font-semibold"
											>
												Saved you ~{win.timeSaved}m
											</m.span>
										)}
									</div>
								</div>
							</div>
						</m.div>
					))
				)}
			</div>
		</div>
	);
}
