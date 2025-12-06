"use client";

import { Tabs } from "@marketing/components/ui/tabs";
import { Terminal } from "@marketing/components/ui/terminal";
import { marketingAnalytics } from "@marketing/lib/track-event";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent } from "@ui/components/card";
import { Activity, Bolt, CheckCircle, Clock3, ShieldCheck, Undo2, Users2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useMemo, useRef, useState } from "react";

type ProtectionHat = "watched" | "protected" | "critical";

const hatOptions: Array<{
	id: ProtectionHat;
	label: string;
	icon: string;
	iconSrc: string;
	description: string;
	badgeClass: string;
}> = [
	{
		id: "watched",
		label: "Watched",
		icon: "🧢",
		iconSrc: "/assets/icons/hat-watched.svg",
		description: "Daily checkpoints",
		badgeClass: "bg-sky-500/15 text-sky-500 border border-sky-500/30",
	},
	{
		id: "protected",
		label: "Protected",
		icon: "👷",
		iconSrc: "/assets/icons/hat-protected.svg",
		description: "Every 5 minutes",
		badgeClass: "bg-amber-500/15 text-amber-500 border border-amber-500/30",
	},
	{
		id: "critical",
		label: "Critical",
		icon: "⛑️",
		iconSrc: "/assets/icons/hat-critical.svg",
		description: "Every change",
		badgeClass: "bg-rose-500/15 text-rose-500 border border-rose-500/30",
	},
];

type ActivityLogEntry = {
	id: number;
	hat: ProtectionHat;
	message: string;
	context: string;
};

const hatTone: Record<ProtectionHat, string> = {
	watched: "text-sky-300",
	protected: "text-amber-300",
	critical: "text-rose-300",
};

const hatBarClass: Record<ProtectionHat, string> = {
	watched: "bg-sky-500",
	protected: "bg-amber-500",
	critical: "bg-rose-500",
};

const initialActivityLog: ActivityLogEntry[] = [
	{
		id: 1,
		hat: "critical",
		message: "Auto-checkpoint created before AI rewrite",
		context: "package.json · 2 min ago",
	},
	{
		id: 2,
		hat: "protected",
		message: "AI pattern flagged coherence drop to 68%",
		context: "src/index.ts · 4 min ago",
	},
	{
		id: 3,
		hat: "watched",
		message: "Docs digest ready for async review",
		context: "README.md · 1 hr ago",
	},
];

const initialFiles = [
	{ path: "src/index.ts", hat: "protected" as ProtectionHat },
	{ path: "package.json", hat: "critical" as ProtectionHat },
	{ path: "README.md", hat: "watched" as ProtectionHat },
	{ path: "config/webpack.config.ts", hat: "critical" as ProtectionHat },
	{ path: "docs/changelog.md", hat: "watched" as ProtectionHat },
];

export function InteractiveDemo() {
	const [selectedHat, setSelectedHat] = useState<ProtectionHat>("protected");
	const [files, setFiles] = useState(initialFiles);
	const [assignmentCue, setAssignmentCue] = useState<string | null>(null);
	const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(initialActivityLog);
	const logCounter = useRef(initialActivityLog.length + 1);

	const hatMap = useMemo(
		() =>
			new Map(
				hatOptions.map((hat) => [
					hat.id,
					{
						label: hat.label,
						icon: hat.icon,
						iconSrc: hat.iconSrc,
						badgeClass: hat.badgeClass,
					},
				]),
			),
		[],
	);

	const coverage = useMemo(() => {
		const totals = {
			watched: 0,
			protected: 0,
			critical: 0,
		};

		files.forEach((file) => {
			totals[file.hat] += 1;
		});

		return {
			total: files.length,
			counts: totals,
		};
	}, [files]);

	const handleHatSelect = (hatId: ProtectionHat) => {
		setSelectedHat(hatId);
		setAssignmentCue(null);
	};

	const assignHat = (filePath: string) => {
		const nextFiles = files.map((file) => (file.path === filePath ? { ...file, hat: selectedHat } : file));
		setFiles(nextFiles);

		const hat = hatMap.get(selectedHat);
		if (hat) {
			setAssignmentCue(`${hat.label} protection applied to ${filePath}`);
		}

		marketingAnalytics.demoHatAssigned(filePath, selectedHat);

		if (hat) {
			const nextCoverage = nextFiles.reduce(
				(acc, file) => {
					acc.counts[file.hat] = (acc.counts[file.hat] ?? 0) + 1;
					return acc;
				},
				{
					total: nextFiles.length,
					counts: {
						watched: 0,
						protected: 0,
						critical: 0,
					},
				},
			);

			const newLogEntry: ActivityLogEntry = {
				id: logCounter.current++,
				hat: selectedHat,
				message: `${hat.label} hat applied to ${filePath}`,
				context: `Coverage now ${nextCoverage.counts[selectedHat]}/${nextCoverage.total}`,
			};

			setActivityLog((prev) => [newLogEntry, ...prev].slice(0, 4));
		}
	};

	const vsCodeLines = [
		"> SnapBack: Create Checkpoint",
		"📸 Checkpoint created: snap_20241028_152345",
		"> SnapBack: Show Protection Status",
		"🛡️ SnapBack Protection Dashboard",
		"Current Status: ACTIVELY MONITORING",
		"• AI Detection: ✅ Enabled",
		"• Auto-checkpoint: ✅ Every 5 minutes",
		"• File watching: ✅ 247 files monitored",
	];

	const cliLines = [
		"# Analyze risk in current directory",
		"$ snapback analyze ./src",
		"🛡️ Risk Analysis Complete",
		"Files analyzed: 247",
		"Risk level: MEDIUM",
		"AI patterns detected: 3",
		"",
		"# Create manual checkpoint",
		'$ snapback checkpoint "Before major refactor"',
		"📸 Checkpoint created: snap_20241028_145523",
		"",
		"# Restore to checkpoint",
		"$ snapback restore",
		"? Select checkpoint to restore:",
		"  ▸ snap_20241028_145523 (2 min ago) - Before major refactor",
		"    snap_20241028_144847 (8 min ago) - Auto: AI activity",
		"    snap_20241028_143052 (15 min ago) - Auto: package.json",
	];

	const notifications = [
		"[14:30:21] 🛡️ SnapBack detected potential AI-induced risk",
		"           Package.json modified (3 dependencies updated)",
		"           Confidence: 92% | Risk: MEDIUM",
		"",
		"[14:30:45] 🔒 Critical File Protection Alert",
		"           Modified: .env.production, webpack.config.js",
		"           Auto-checkpoint created",
		"",
		"[14:31:02] 📊 Large-Scale Change Analysis",
		"           47 files modified | 156 files/minute",
		"           AI Pattern Detected: Cursor",
		"",
		"[14:31:15] 🚨 Build System Failure Detected",
		"           Error: TypeScript compilation failed",
		"           Recovery available: snap_20241028_142847",
	];

	const recoveryLines = [
		"$ snapback status",
		"Current Status: ACTIVELY MONITORING",
		"Last checkpoint: snap_20241028_154523 (2 min ago)",
		"",
		"[ERROR] Build failed - TypeScript compilation error",
		"File: src/components/Header.tsx",
		'Line: 42 | Unexpected token, expected ","',
		"",
		"$ snapback snapBack",
		"🔍 Analyzing changes...",
		"✅ Found recovery point: snap_20241028_154523",
		"🔄 Restoring files...",
		"✅ 47 files restored successfully",
		"🎉 Your code is safe!",
		"",
		"$ snapback status",
		"Current Status: ACTIVELY MONITORING",
		"Last checkpoint: snap_20241028_154712 (Just now)",
	];

	const tabs = [
		{
			title: "VS Code Extension",
			value: "vscode",
			content: (
				<div className="w-full">
					<div className="bg-card border rounded-xl p-6">
						<h3 className="font-semibold text-lg mb-4">VS Code Extension</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<h4 className="font-medium mb-2">Key Features</h4>
								<ul className="space-y-2 text-sm">
									<li className="flex items-center gap-2">
										<span className="w-2 h-2 bg-primary rounded-full" />
										Activity bar icon
									</li>
									<li className="flex items-center gap-2">
										<span className="w-2 h-2 bg-primary rounded-full" />
										Command palette integration
									</li>
									<li className="flex items-center gap-2">
										<span className="w-2 h-2 bg-primary rounded-full" />
										Right-click context menu
									</li>
									<li className="flex items-center gap-2">
										<span className="w-2 h-2 bg-primary rounded-full" />
										Real-time checkpoint timeline
									</li>
								</ul>
							</div>
							<div>
								<Terminal lines={vsCodeLines} className="text-xs" />
							</div>
						</div>
					</div>
				</div>
			),
		},
		{
			title: "CLI",
			value: "cli",
			content: (
				<div className="w-full">
					<div className="bg-card border rounded-xl p-6">
						<h3 className="font-semibold text-lg mb-4">Command Line Interface</h3>
						<Terminal lines={cliLines} className="text-xs" />
					</div>
				</div>
			),
		},
		{
			title: "Notifications",
			value: "notifications",
			content: (
				<div className="w-full">
					<div className="bg-card border rounded-xl p-6">
						<h3 className="font-semibold text-lg mb-4">Enhanced Notifications</h3>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<h4 className="font-medium mb-2">Collapsed View</h4>
								<div className="bg-muted p-3 rounded-lg text-sm">
									<div className="flex items-center gap-2">
										<span>🛡️</span>
										<span>SnapBack detected potential AI-induced risk</span>
									</div>
								</div>

								<h4 className="font-medium mt-4 mb-2">Expanded View</h4>
								<div className="bg-muted p-3 rounded-lg text-sm">
									<div className="flex items-center gap-2">
										<span>🔒</span>
										<span>Critical File Protection Alert</span>
									</div>
									<div className="mt-1 text-muted-foreground text-xs">
										Modified: .env.production, webpack.config.js
									</div>
									<div className="mt-1 flex items-center gap-2 text-xs">
										<span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded">
											MEDIUM RISK
										</span>
										<span className="text-muted-foreground">92% Confidence</span>
									</div>
								</div>
							</div>
							<div>
								<Terminal lines={notifications} className="text-xs" />
							</div>
						</div>
					</div>
				</div>
			),
		},
		{
			title: "Recovery",
			value: "recovery",
			content: (
				<div className="w-full">
					<div className="bg-card border rounded-xl p-6">
						<h3 className="font-semibold text-lg mb-4">One-Click Recovery</h3>
						<Terminal lines={recoveryLines} className="text-xs" />
					</div>
				</div>
			),
		},
	];

	return (
		<section className="py-24 bg-gradient-to-b from-black to-slate-900">
			<div className="container max-w-5xl">
				<div className="text-center mb-12">
					<h2 className="font-bold text-3xl md:text-4xl">See SnapBack in Action</h2>
					<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
						Tab-based demo viewer showing real SnapBack functionality
					</p>
				</div>

				<div className="mb-12 rounded-2xl border bg-card p-6">
					<div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
						<div className="space-y-6">
							<div>
								<h3 className="text-xl font-semibold">Assign protection hats in seconds</h3>
								<p className="text-sm text-muted-foreground">
									Choose a hat, then click a file to update its protection level. SnapBack syncs these
									rules across SnapBack IDE plugins, CLI, and CI.
								</p>
							</div>

							<div className="flex flex-wrap gap-3">
								{hatOptions.map((hat) => (
									<Button
										key={hat.id}
										variant={hat.id === selectedHat ? "primary" : "outline"}
										size="sm"
										onClick={() => handleHatSelect(hat.id)}
										className="gap-2"
										aria-pressed={hat.id === selectedHat}
									>
										<span className="relative flex h-5 w-6 items-center justify-center">
											<Image
												src={hat.iconSrc}
												alt={`${hat.label} protection icon`}
												width={24}
												height={18}
												className="h-5 w-auto"
												loading="lazy"
											/>
										</span>
										{hat.label}
										<span className="hidden text-xs text-muted-foreground sm:inline">
											{hat.description}
										</span>
									</Button>
								))}
							</div>

							{assignmentCue && (
								<div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
									{assignmentCue}
								</div>
							)}

							<ul className="space-y-3">
								{files.map((file) => {
									const hat = hatMap.get(file.hat);
									return (
										<motion.button
											key={file.path}
											type="button"
											onClick={() => assignHat(file.path)}
											className="flex w-full items-center justify-between rounded-xl border border-muted bg-muted/40 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-primary/60 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
											whileHover={{ scale: 1.01 }}
											whileTap={{ scale: 0.99 }}
											onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) => {
												if (event.key === "Enter" || event.key === " ") {
													event.preventDefault();
													assignHat(file.path);
												}
											}}
											aria-label={`Assign ${selectedHat} protection to ${file.path}`}
										>
											<div className="flex items-center gap-3">
												<span className="relative flex h-6 w-7 items-center justify-center">
													<Image
														src={hat?.iconSrc ?? "/assets/icons/hat-watched.svg"}
														alt={`${hat?.label ?? "Watched"} protection icon`}
														width={28}
														height={20}
														className="h-6 w-auto"
														loading="lazy"
													/>
												</span>
												<div>
													<div className="text-sm font-medium md:text-base">{file.path}</div>
													<p className="text-xs text-muted-foreground">
														Click to apply {hat?.label.toLowerCase() ?? "watched"} hat
													</p>
												</div>
											</div>
											{hat && (
												<Badge className={`${hat.badgeClass} flex items-center gap-1`}>
													<Image
														src={hat.iconSrc}
														alt={`${hat.label} protection icon`}
														width={16}
														height={12}
														className="h-4 w-auto"
														loading="lazy"
													/>
													<span>{hat.label}</span>
												</Badge>
											)}
										</motion.button>
									);
								})}
							</ul>
						</div>

						<div className="space-y-4">
							<Card className="border border-muted bg-muted/30">
								<CardContent className="space-y-4 p-4">
									<div className="flex items-center justify-between">
										<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
											Team coverage
										</p>
										<Badge
											status="info"
											className="text-[10px] uppercase tracking-wide text-muted-foreground"
										>
											Synced
										</Badge>
									</div>
									<div className="space-y-3">
										{(["critical", "protected", "watched"] as ProtectionHat[]).map((hatId) => {
											const hat = hatMap.get(hatId);
											const count = coverage.counts[hatId];
											const percent = coverage.total
												? Math.round((count / coverage.total) * 100)
												: 0;
											return (
												<div key={hatId}>
													<div className="flex items-center justify-between text-xs text-muted-foreground">
														<div className="flex items-center gap-2">
															<Image
																src={hat?.iconSrc ?? "/assets/icons/hat-watched.svg"}
																alt={`${hat?.label ?? hatId} protection icon`}
																width={24}
																height={18}
																className="h-4 w-auto"
																loading="lazy"
															/>
															<span>{hat?.label ?? hatId}</span>
														</div>
														<span className="font-semibold text-foreground/80">
															{count}/{coverage.total}
														</span>
													</div>
													<div className="mt-2 h-2 w-full rounded-full bg-muted-foreground/20">
														<div
															className={`h-2 rounded-full ${hatBarClass[hatId]}`}
															style={{
																width: `${percent}%`,
															}}
														/>
													</div>
												</div>
											);
										})}
									</div>
								</CardContent>
							</Card>

							<Card className="border border-muted bg-muted/30">
								<CardContent className="space-y-3 p-4">
									<div className="flex items-center justify-between">
										<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
											Live activity feed
										</p>
										<span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
											<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
											Live
										</span>
									</div>

									<div className="space-y-2">
										<AnimatePresence initial={false}>
											{activityLog.map((entry) => {
												const hat = hatMap.get(entry.hat);
												return (
													<motion.div
														key={entry.id}
														initial={{
															opacity: 0,
															y: 12,
														}}
														animate={{
															opacity: 1,
															y: 0,
														}}
														exit={{
															opacity: 0,
															y: -12,
														}}
														transition={{
															duration: 0.25,
														}}
														className="flex items-start gap-3 rounded-xl border border-muted-foreground/20 bg-muted/40 px-3 py-3"
													>
														<Image
															src={hat?.iconSrc ?? "/assets/icons/hat-watched.svg"}
															alt={`${hat?.label ?? entry.hat} icon`}
															width={24}
															height={18}
															className="h-5 w-auto"
															loading="lazy"
														/>
														<div>
															<p className="text-sm font-medium text-foreground">
																{entry.message}
															</p>
															<p className="text-xs text-muted-foreground">
																<span className={hatTone[entry.hat]}>
																	{hat?.label ?? entry.hat}
																</span>{" "}
																· {entry.context}
															</p>
														</div>
													</motion.div>
												);
											})}
										</AnimatePresence>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>

				<div className="mt-12 grid gap-6 md:grid-cols-2">
					<Card className="border-slate-800/70 bg-slate-900/80">
						<CardContent className="p-6">
							<h3 className="text-lg font-semibold text-slate-100 mb-4">Recovery Flow</h3>
							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
										<Activity className="h-4 w-4" />
									</div>
									<div>
										<h4 className="font-medium text-slate-100">Diff at a glance</h4>
										<p className="text-sm text-slate-400">
											Compare AI output with your last good checkpoint in a human-friendly view
										</p>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
										<ShieldCheck className="h-4 w-4" />
									</div>
									<div>
										<h4 className="font-medium text-slate-100">Select scope</h4>
										<p className="text-sm text-slate-400">
											Restore specific files or entire repo—no merge conflicts
										</p>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
										<Undo2 className="h-4 w-4" />
									</div>
									<div>
										<h4 className="font-medium text-slate-100">One-click snapback</h4>
										<p className="text-sm text-slate-400">
											Instantly restore files with filesystem rehydration
										</p>
									</div>
								</div>
							</div>
							<div className="mt-6 flex items-center justify-between rounded-xl bg-slate-900/60 p-4">
								<div className="flex items-center gap-3">
									<Clock3 className="h-5 w-5 text-emerald-400" />
									<div>
										<p className="text-sm font-semibold text-slate-100">Average recovery time</p>
										<p className="text-xs text-slate-400">2.3 seconds</p>
									</div>
								</div>
								<div className="flex items-center gap-3">
									<Bolt className="h-5 w-5 text-amber-400" />
									<div>
										<p className="text-sm font-semibold text-slate-100">Downtime prevented</p>
										<p className="text-xs text-slate-400">$892K this week</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="border-slate-800/70 bg-slate-900/80">
						<CardContent className="p-6">
							<h3 className="text-lg font-semibold text-slate-100 mb-4">Team Configuration</h3>
							<div className="space-y-4">
								<div className="flex items-start gap-3">
									<div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500/20 text-sky-400">
										<ShieldCheck className="h-4 w-4" />
									</div>
									<div>
										<h4 className="font-medium text-slate-100">Declarative config</h4>
										<p className="text-sm text-slate-400">
											Drop .snapbackrc into main for automatic team alignment
										</p>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
										<Users2 className="h-4 w-4" />
									</div>
									<div>
										<h4 className="font-medium text-slate-100">Commit & share</h4>
										<p className="text-sm text-slate-400">
											One commit protects your entire team automatically
										</p>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
										<CheckCircle className="h-4 w-4" />
									</div>
									<div>
										<h4 className="font-medium text-slate-100">Enforce without friction</h4>
										<p className="text-sm text-slate-400">
											Slack alerts and PR checks stay in sync automatically
										</p>
									</div>
								</div>
							</div>
							<div className="mt-6 rounded-xl bg-slate-900/60 p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-semibold text-slate-100">Onboarding time</p>
										<p className="text-xs text-slate-400">12 → 1 minutes</p>
									</div>
									<div>
										<p className="text-sm font-semibold text-slate-100">Teams using SnapBack</p>
										<p className="text-xs text-slate-400">42 teams</p>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				<Tabs tabs={tabs} />
			</div>
		</section>
	);
}
