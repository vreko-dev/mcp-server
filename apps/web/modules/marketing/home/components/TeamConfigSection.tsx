"use client";

import { marketingAnalytics } from "@marketing/lib/track-event";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent } from "@ui/components/card";
import { Check, Copy, Download, Link2, ShieldCheck, Sparkles, Timer, Users2 } from "lucide-react";
import { motion } from "motion/react";
import Image from "next/image";
import { useState } from "react";

const exampleConfig = `# .snapbackrc
version: 2.1
project: "snapback-enterprise"

hats:
  critical:
    - "*.env*"
    - "package*.json"
    - "infrastructure/**/*"
    - "migrations/**/*"
  protected:
    - "apps/**/*.{ts,tsx,js,jsx}"
    - "packages/**/*.{ts,tsx}"
    - "lib/**/*"
  watched:
    - "*.md"
    - "docs/**/*"

rules:
  - pattern: "migrations/*.sql"
    hat: critical
    reason: "Database changes are irreversible"
    notify: ["#runtime", "pagerduty:oncall"]
  - pattern: "apps/admin/**/*"
    hat: protected
    ai_activity: true
    require_review: ["security"]`;

const setupSteps = [
	{
		icon: ShieldCheck,
		title: "Classify your repo once",
		description:
			"Map file globs to hats in minutes. SnapBack ships smart defaults for JS/TS, Go, Python, and monorepos.",
		metric: "≈3 minutes",
	},
	{
		icon: Users2,
		title: "Commit & share with the team",
		description: "Drop .snapbackrc into main. IDE extensions, CLI, and CI/CD load updates automatically.",
		metric: "1 commit",
	},
	{
		icon: Sparkles,
		title: "Enforce without friction",
		description: "Slack alerts, PR checks, and AI guardrails stay in sync—even when new teammates join.",
		metric: "Always on",
	},
];

const policyHighlights = [
	{
		id: "critical",
		name: "Critical hat",
		icon: "/assets/icons/hat-critical.svg",
		copy: "Blocking + checkpoint every change. Alerts security channel if secrets/configs shift.",
		tone: "text-rose-200",
	},
	{
		id: "protected",
		name: "Protected hat",
		icon: "/assets/icons/hat-protected.svg",
		copy: "Rolling checkpoints every 5 minutes with AI change summaries posted to PR threads.",
		tone: "text-amber-200",
	},
	{
		id: "watched",
		name: "Watched hat",
		icon: "/assets/icons/hat-watched.svg",
		copy: "Daily digests for docs and product copy with tone + accuracy scoring.",
		tone: "text-sky-200",
	},
];

const workspaceMetrics = [
	{
		icon: Timer,
		value: "12 → 1",
		label: "minutes to onboard",
		detail: "Engineers are protected on their first pull.",
	},
	{
		icon: Link2,
		value: "+38%",
		label: "faster incident response",
		detail: "Teams resolve AI mistakes before they hit prod.",
	},
	{
		icon: Users2,
		value: "42 teams",
		label: "using shared policies",
		detail: "Enterprise orgs sync hats across 200+ repos.",
	},
];

export function TeamConfigSection() {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(exampleConfig);
			} else {
				const textArea = document.createElement("textarea");
				textArea.value = exampleConfig;
				textArea.style.position = "fixed";
				textArea.style.left = "-9999px";
				document.body.appendChild(textArea);
				textArea.focus();
				textArea.select();
				document.execCommand("copy");
				document.body.removeChild(textArea);
			}
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
			marketingAnalytics.configCopied();
		} catch (error) {
			console.error("Failed to copy policy", { error });
			setCopied(false);
		}
	};

	const handleDownload = () => {
		try {
			const blob = new Blob([exampleConfig], { type: "text/plain" });
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = ".snapbackrc";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			marketingAnalytics.configDownloaded();
		} catch (error) {
			console.error("Failed to download policy", { error });
		}
	};

	return (
		<section className="relative overflow-hidden bg-slate-950 py-24">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900/80 to-slate-950" />
				<div className="absolute -top-24 left-1/2 h-[520px] w-[640px] -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-500/20 via-transparent to-transparent blur-3xl" />
			</div>

			<div className="container relative z-10">
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					className="mx-auto mb-14 max-w-3xl text-center"
				>
					<Badge className="mb-4 border-emerald-400/40 text-emerald-200">Team Configuration</Badge>
					<h2 className="text-balance text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
						Standardize protection across every workspace
					</h2>
					<p className="mt-4 text-lg text-slate-300 sm:text-xl">
						SnapBack reads one declarative file, auto-assigns hats, and keeps your entire org aligned—IDEs,
						CI, and AI agents included.
					</p>
				</motion.div>

				<div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
					<Card className="border-slate-800/70 bg-slate-900/80 backdrop-blur">
						<div className="flex items-center justify-between border-b border-slate-800/60 bg-slate-900/80 px-6 py-4">
							<div className="flex items-center gap-2 text-sm font-mono text-slate-400">
								<div className="flex gap-1.5">
									<span className="h-3 w-3 rounded-full bg-rose-400" />
									<span className="h-3 w-3 rounded-full bg-amber-400" />
									<span className="h-3 w-3 rounded-full bg-emerald-400" />
								</div>
								<span>.snapbackrc</span>
							</div>
							<div className="flex items-center gap-2">
								<Button variant="ghost" size="sm" className="gap-2 text-slate-200" onClick={handleCopy}>
									{copied ? (
										<>
											<Check className="h-4 w-4" />
											Copied
										</>
									) : (
										<>
											<Copy className="h-4 w-4" />
											Copy
										</>
									)}
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="gap-2 text-slate-200"
									onClick={handleDownload}
								>
									<Download className="h-4 w-4" />
									Download
								</Button>
							</div>
						</div>
						<CardContent className="p-0">
							<pre className="overflow-x-auto px-6 py-6 text-sm text-slate-200 sm:text-base">
								<code className="language-yaml">{exampleConfig}</code>
							</pre>
						</CardContent>
					</Card>

					<Card className="border-slate-800/70 bg-slate-900/80 backdrop-blur">
						<CardContent className="grid gap-6 p-6 sm:p-8">
							<div className="grid gap-4 sm:grid-cols-3">
								{setupSteps.map((step) => (
									<div
										key={step.title}
										className="rounded-2xl border border-slate-800/60 bg-slate-950/70 p-4 text-sm text-slate-300"
									>
										<div className="flex items-center gap-2 text-slate-100">
											<step.icon className="h-4 w-4 text-emerald-300" />
											<span className="font-semibold">{step.title}</span>
										</div>
										<p className="mt-3 text-xs sm:text-sm">{step.description}</p>
										<p className="mt-4 text-xs uppercase tracking-wide text-emerald-200">
											{step.metric}
										</p>
									</div>
								))}
							</div>

							<div className="rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-5 text-sm text-emerald-100">
								<strong className="font-semibold">Ops bonus:</strong> SnapBack validates configuration
								on PRs, so no one can merge without the latest hats. GitHub, GitLab, Bitbucket, and
								Azure DevOps supported.
							</div>

							<div className="grid gap-4 sm:grid-cols-3">
								{workspaceMetrics.map((metric) => (
									<div
										key={metric.label}
										className="rounded-2xl border border-slate-800/60 bg-slate-950/70 px-4 py-5 text-center"
									>
										<metric.icon className="mx-auto mb-2 h-5 w-5 text-emerald-300" />
										<p className="text-xl font-semibold text-slate-50">{metric.value}</p>
										<p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
										<p className="mt-2 text-xs text-slate-500">{metric.detail}</p>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="mt-10 grid gap-6 lg:grid-cols-3">
					{policyHighlights.map((highlight) => (
						<Card
							key={highlight.id}
							className="border-slate-800/70 bg-slate-900/80 p-5 transition hover:border-emerald-400/40 hover:bg-slate-900/90"
						>
							<div className="flex items-center gap-3">
								<Image
									src={highlight.icon}
									alt={`${highlight.name} icon`}
									width={40}
									height={32}
									className="h-8 w-auto"
									loading="lazy"
								/>
								<p className={`text-sm font-semibold uppercase tracking-wide ${highlight.tone}`}>
									{highlight.name}
								</p>
							</div>
							<p className="mt-4 text-sm text-slate-300">{highlight.copy}</p>
						</Card>
					))}
				</div>

				<motion.div
					initial={{ opacity: 0, y: 16 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.45 }}
					className="mx-auto mt-12 flex flex-col gap-4 text-center sm:flex-row sm:items-center sm:justify-center"
				>
					<Button
						size="lg"
						className="h-12 rounded-full px-8 text-base font-semibold"
						onClick={handleDownload}
					>
						Get the policy starter kit
					</Button>
					<Button
						size="lg"
						className="h-12 rounded-full border-slate-700/60 px-8 text-base font-semibold text-slate-200"
					>
						View configuration docs →
					</Button>
				</motion.div>

				<p className="mt-6 text-center text-xs text-slate-500">
					Need SSO, SCIM, or custom environments? SnapBack Enterprise syncs hats with IAM and HRIS providers.
				</p>
			</div>
		</section>
	);
}
