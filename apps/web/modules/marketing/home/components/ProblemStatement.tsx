"use client";

import {
	AnimatedList,
	NotificationItem,
} from "@marketing/components/ui/animated-list";

export function ProblemStatement() {
	const notifications = [
		{
			title: "🛡️ SnapBack detected potential AI-induced risk",
			description: "Package.json modified (3 dependencies updated)",
			timestamp: "14:30:21",
			icon: "🛡️",
			riskLevel: "MEDIUM" as const,
		},
		{
			title: "🔒 Critical File Protection Alert",
			description: "Modified: .env.production, webpack.config.js",
			timestamp: "14:30:45",
			icon: "🔒",
			riskLevel: "HIGH" as const,
		},
		{
			title: "📊 Large-Scale Change Analysis",
			description: "47 files modified | 156 files/minute",
			timestamp: "14:31:02",
			icon: "📊",
			riskLevel: "MEDIUM" as const,
		},
		{
			title: "🚨 Build System Failure Detected",
			description: "Error: TypeScript compilation failed",
			timestamp: "14:31:15",
			icon: "🚨",
			riskLevel: "CRITICAL" as const,
		},
	];

	return (
		<section className="py-16 bg-muted/50">
			<div className="container max-w-5xl">
				<div className="text-center mb-12">
					<h2 className="font-bold text-3xl md:text-4xl">
						SnapBack Learns What Breaks
					</h2>
					<p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
						Day 1: Detects hardcoded secrets, phantom dependencies, test code in production. Day 30: Knows YOUR specific patterns. Month 3: Catches what others miss.
					</p>
				</div>

				<div className="bg-card border rounded-2xl p-6 max-w-3xl mx-auto">
					<div className="flex items-center justify-between mb-4">
						<h3 className="font-semibold">Live Notification Feed</h3>
						<div className="flex items-center gap-2">
							<div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
							<span className="text-sm text-muted-foreground">Live</span>
						</div>
					</div>

					<AnimatedList delay={2000}>
						{notifications.map((notification, index) => (
							<NotificationItem
								key={index}
								title={notification.title}
								description={notification.description}
								timestamp={notification.timestamp}
								icon={notification.icon}
								riskLevel={notification.riskLevel}
							/>
						))}
					</AnimatedList>
				</div>

				<div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
					<div className="bg-card border rounded-xl p-6 text-center">
						<div className="text-3xl font-bold text-primary">94%</div>
						<div className="mt-2 text-sm text-muted-foreground">
							Accuracy Day 1
						</div>
					</div>
					<div className="bg-card border rounded-xl p-6 text-center">
						<div className="text-3xl font-bold text-primary">98%</div>
						<div className="mt-2 text-sm text-muted-foreground">
							Accuracy Day 30
						</div>
					</div>
					<div className="bg-card border rounded-xl p-6 text-center">
						<div className="text-3xl font-bold text-primary">99%+</div>
						<div className="mt-2 text-sm text-muted-foreground">
							Accuracy Month 3
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
