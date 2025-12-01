"use client";

import { Card3D } from "@marketing/components/ui/3d-card";
import { InfiniteMovingCards } from "@marketing/components/ui/infinite-moving-cards";
import { Badge } from "@ui/components/badge";
import {
	CodeIcon,
	FileTextIcon,
	GithubIcon,
	LockIcon,
	ServerIcon,
	ShieldCheckIcon,
} from "lucide-react";

export function DeveloperTrustSignals() {
	const trustSignals = [
		{
			title: "Open Source",
			description: "Fully transparent codebase with community contributions",
			icon: GithubIcon,
			badge: "GitHub",
			stats: "Private Alpha • 55+ Users",
		},
		{
			title: "Security First",
			description: "End-to-end encryption with zero data retention policy",
			icon: ShieldCheckIcon,
			badge: "SOC 2",
			stats: "99.9% Uptime",
		},
		{
			title: "Developer Friendly",
			description: "Extensive documentation and VS Code integration",
			icon: CodeIcon,
			badge: "Docs",
			stats: "50+ Guides",
		},
		{
			title: "Enterprise Ready",
			description: "Scalable architecture with enterprise-grade support",
			icon: ServerIcon,
			badge: "SLA",
			stats: "24/7 Support",
		},
	];

	// Companies using SnapBack for the infinite scroll
	const companies = [
		{
			name: "TechCorp",
			title: "Enterprise",
		},
		{
			name: "DevStudio",
			title: "Agency",
		},
		{
			name: "StartupX",
			title: "Startup",
		},
		{
			name: "CodeLab",
			title: "Education",
		},
		{
			name: "InnovateCo",
			title: "Innovation",
		},
		{
			name: "FutureTech",
			title: "Technology",
		},
		{
			name: "DigitalFirst",
			title: "Digital Agency",
		},
		{
			name: "CloudNine",
			title: "Cloud Services",
		},
	];

	return (
		<section className="py-16 lg:py-24">
			<div className="container max-w-5xl">
				<div className="text-center">
					<h2 className="font-bold text-3xl md:text-4xl lg:text-5xl">
						Built for Developers,{" "}
						<span className="text-primary">Trusted by Teams</span>
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-balance text-foreground/60 text-lg">
						We take security, transparency, and developer experience seriously
					</p>
				</div>

				<div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					{trustSignals.map((signal, index) => {
						const Icon = signal.icon;
						return (
							<Card3D
								key={index}
								className="rounded-2xl border bg-elevated-2 p-6 hover:shadow-lg transition-all duration-300"
							>
								<div className="flex flex-col items-center text-center">
									<div className="mb-4 rounded-full bg-primary/10 p-3">
										<Icon className="text-primary size-6" />
									</div>
									<h3 className="font-semibold text-lg">{signal.title}</h3>
									<p className="mt-2 text-foreground/70 text-sm">
										{signal.description}
									</p>
									<div className="mt-4">
										<Badge status="info" className="text-xs">
											{signal.badge}
										</Badge>
									</div>
									<div className="mt-2 text-xs text-foreground/60">
										{signal.stats}
									</div>
								</div>
							</Card3D>
						);
					})}
				</div>

				{/* Infinite scrolling trust signals */}
				<div className="mt-16">
					<h3 className="text-center font-semibold text-foreground/60 text-lg">
						Trusted by innovative teams worldwide
					</h3>
					<InfiniteMovingCards
						items={companies}
						direction="left"
						speed="normal"
						pauseOnHover
						className="mt-8"
					/>
				</div>

				<div className="mt-16 rounded-3xl border bg-elevated-2 p-8">
					<div className="grid gap-8 md:grid-cols-2">
						<div>
							<h3 className="font-bold text-2xl">
								Open Source & Community Driven
							</h3>
							<p className="mt-4 text-foreground/70">
								SnapBack is built in the open with contributions from developers
								worldwide. Our code is audited by the community and security
								experts.
							</p>
							<div className="mt-6 flex flex-wrap gap-2">
								<Badge status="success">MIT License</Badge>
								<Badge status="info">Community Audited</Badge>
								<Badge status="warning">Public Roadmap</Badge>
								<Badge status="error">Contributor Program</Badge>
							</div>
						</div>
						<div className="flex items-center justify-center">
							<div className="relative">
								<div className="absolute -inset-4 rounded-2xl bg-primary/10 blur-xl" />
								<div className="relative rounded-xl border bg-elevated-3 p-4">
									<div className="flex items-center gap-2">
										<GithubIcon className="text-foreground size-5" />
										<span className="font-mono text-sm">
											github.com/snapback/snapback
										</span>
									</div>
									<div className="mt-3 flex items-center gap-4 text-xs">
										<div className="flex items-center gap-1">
											<div className="size-2 rounded-full bg-green-500 animate-pulse" />
											<span>Private Alpha</span>
										</div>
										<div className="flex items-center gap-1">
											<div className="size-2 rounded-full bg-blue-500" />
											<span>Active Development</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div className="mt-8 grid gap-6 md:grid-cols-3">
					<div className="rounded-2xl border bg-elevated-2 p-6 hover:shadow-md transition-all duration-300">
						<div className="flex items-center gap-2">
							<LockIcon className="text-primary size-5" />
							<h4 className="font-semibold">Zero Data Retention</h4>
						</div>
						<p className="mt-2 text-foreground/70 text-sm">
							Your code never leaves your machine. All processing happens
							locally.
						</p>
					</div>
					<div className="rounded-2xl border bg-elevated-2 p-6 hover:shadow-md transition-all duration-300">
						<div className="flex items-center gap-2">
							<FileTextIcon className="text-primary size-5" />
							<h4 className="font-semibold">Comprehensive Docs</h4>
						</div>
						<p className="mt-2 text-foreground/70 text-sm">
							50+ guides, API references, and tutorials to get you started.
						</p>
					</div>
					<div className="rounded-2xl border bg-elevated-2 p-6 hover:shadow-md transition-all duration-300">
						<div className="flex items-center gap-2">
							<ShieldCheckIcon className="text-primary size-5" />
							<h4 className="font-semibold">Security Audited</h4>
						</div>
						<p className="mt-2 text-foreground/70 text-sm">
							Regular third-party security audits and vulnerability assessments.
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
