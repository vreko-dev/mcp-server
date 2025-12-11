"use client";

import { Check, Star } from "lucide-react"; // Using Lucide icons
import Link from "next/link";
import { CardBody, CardContainer, CardItem } from "@/components/ui/3d-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { BorderBeam } from "@/components/ui/border-beam";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Marquee } from "@/components/ui/marquee";
import { Meteors } from "@/components/ui/meteors";
import { NumberTicker } from "@/components/ui/number-ticker";
import { Particles } from "@/components/ui/particles";
import { RippleButton } from "@/components/ui/ripple-button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { Spotlight } from "@/components/ui/spotlight";
import { Timeline, TimelineContent, TimelineItem } from "@/components/ui/timeline";
import { cn } from "@/lib/utils";
import { TierProgression } from "@/modules/pioneer/components/tier-progression";
import { useLeaderboard } from "@/modules/pioneer/hooks/use-leaderboard";
import { usePioneerProgress } from "@/modules/pioneer/hooks/use-pioneer-progress";
import { ACTIONS } from "@/modules/pioneer/lib/actions";
import { TIERS } from "@/modules/pioneer/lib/tiers";

export default function PioneerPage() {
	const { data: pioneerData } = usePioneerProgress();
	const { data: leaderboardData } = useLeaderboard();

	// Derived state
	const isAuthenticated = !!pioneerData;
	const user = pioneerData?.pioneer;
	const progress = pioneerData?.progress;
	const completedActions = pioneerData?.completedActions || [];

	return (
		<main className="min-h-screen bg-background overflow-x-hidden">
			{/* ─────────────────────────────────────────────────────────────────
          HERO SECTION
         ───────────────────────────────────────────────────────────────── */}
			<section className="relative min-h-[80vh] flex flex-col items-center justify-center pt-20 pb-20 overflow-hidden">
				<Particles className="absolute inset-0" quantity={50} color="#10b981" />

				<div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
					<h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50">
						Earn Pro Features. <br />
						Build the Future.
					</h1>

					<p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
						Join <NumberTicker value={2112} className="text-primary font-bold" /> Pioneers getting Pro
						features free during beta. Star, share, refer—level up before we launch.
					</p>

					{isAuthenticated && user && progress ? (
						<div className="bg-card/50 backdrop-blur border rounded-xl p-6 mb-8 w-full">
							<p className="text-lg mb-2">
								You're a <strong>{user.tier}</strong> with{" "}
								<NumberTicker value={user.totalPoints} className="font-mono font-bold" /> points
							</p>
							<TierProgression
								currentTier={user.tier}
								currentPoints={user.totalPoints}
								nextTier={progress.nextTier}
								pointsToNext={progress.pointsToNext}
							/>

							{/* Progress Bar for accessibility tests */}
							{progress.nextTier && (
								<div
									className="sr-only"
									role="progressbar"
									aria-label={`Progress to ${progress.nextTier} tier`}
									aria-valuenow={progress.percentToNext}
									aria-valuemin={0}
									aria-valuemax={100}
								/>
							)}
						</div>
					) : (
						<TierProgression currentTier="seedling" currentPoints={175} />
					)}

					{!isAuthenticated && (
						<div className="mt-10">
							<ShimmerButton size="lg">Become a Pioneer</ShimmerButton>
						</div>
					)}
				</div>
			</section>

			{/* ─────────────────────────────────────────────────────────────────
          TIER CARDS SECTION
         ───────────────────────────────────────────────────────────────── */}
			<section className="py-20 px-4">
				<div className="max-w-7xl mx-auto">
					<h2 className="text-3xl font-bold text-center mb-12">Choose Your Path</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						{TIERS.map((tier) => (
							<CardContainer key={tier.name} className="inter-var">
								<CardBody
									className={cn(
										"bg-card border-2 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] w-full h-auto rounded-xl p-6 transition-all",
										// Highlight current tier if Auth
										isAuthenticated && user?.tier === tier.name.toLowerCase()
											? "border-primary shadow-[0_0_20px_rgba(16,185,129,0.3)]"
											: "border-muted",
									)}
								>
									<CardItem translateZ="50" className="w-full mt-4">
										<div className="flex items-center justify-between">
											<span className="text-4xl">{tier.emoji}</span>
											<Badge className="font-mono text-xs">{tier.range} pts</Badge>
										</div>
									</CardItem>

									<CardItem
										as="h3"
										translateZ="60"
										className="text-xl font-bold text-foreground mt-4"
									>
										{tier.name}
									</CardItem>

									<CardItem translateZ="30" className="w-full mt-8">
										<ul className="space-y-3">
											{tier.benefits.map((benefit, idx) => (
												<li
													key={idx}
													className="flex items-start gap-2 text-sm text-muted-foreground"
												>
													<Check
														className={cn(
															"h-4 w-4 mt-0.5 shrink-0",
															`text-${tier.color}-500`,
														)}
													/>
													{benefit}
												</li>
											))}
										</ul>
									</CardItem>
								</CardBody>
							</CardContainer>
						))}
					</div>
				</div>
			</section>

			{/* ─────────────────────────────────────────────────────────────────
          HOW TO EARN SECTION
         ───────────────────────────────────────────────────────────────── */}
			<section className="py-20 px-4 bg-muted/30">
				<div className="max-w-3xl mx-auto">
					<h2 className="text-3xl font-bold text-center mb-12">How to Earn Points</h2>

					<Timeline>
						{ACTIONS.map((item) => {
							const isCompleted = completedActions.includes(item.id);

							return (
								<TimelineItem key={item.id} className={cn(isCompleted && "opacity-60")}>
									<TimelineContent>
										<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border rounded-lg p-4">
											<div className="flex items-center gap-3">
												<div
													className={cn(
														"h-8 w-8 rounded-full flex items-center justify-center border",
														isCompleted
															? "bg-green-100 text-green-600 border-green-200"
															: "bg-muted text-muted-foreground",
													)}
												>
													{isCompleted ? (
														<Check className="h-4 w-4" />
													) : (
														<Star className="h-4 w-4" />
													)}
												</div>
												<div>
													<p className="font-medium">{item.label}</p>
													<div className="flex items-center gap-2 mt-1">
														<Badge
															status={item.once ? "info" : "success"}
															className="text-xs"
														>
															+{item.points} pts {!item.once && "∞"}
														</Badge>
														{isCompleted && (
															<span className="text-xs text-green-600 font-medium">
																Completed
															</span>
														)}
													</div>
												</div>
											</div>

											{item.cta && !isCompleted && (
												<div className="shrink-0">
													{item.cta.type === "copy" ? (
														<CopyButton
															value="snapback.dev/join/abc123"
															className="w-full sm:w-auto"
														>
															{item.cta.label}
														</CopyButton>
													) : (
														<RippleButton
															href={item.cta.href}
															size="sm"
															className="w-full sm:w-auto"
														>
															{item.cta.label}
														</RippleButton>
													)}
												</div>
											)}
										</div>
									</TimelineContent>
								</TimelineItem>
							);
						})}
					</Timeline>
				</div>
			</section>

			{/* ─────────────────────────────────────────────────────────────────
          LEADERBOARD SECTION
         ───────────────────────────────────────────────────────────────── */}
			<section className="py-20 px-4 overflow-hidden">
				<h2 className="text-3xl font-bold text-center mb-8">Top Pioneers</h2>

				{/* Marquee */}
				<div className="mb-12">
					<Marquee pauseOnHover className="[--duration:20s]">
						{leaderboardData?.leaderboard.slice(0, 5).map((p) => (
							<div
								key={p.username}
								className="flex items-center gap-2 mx-8 bg-muted/50 px-4 py-2 rounded-full border"
							>
								<span className="text-xl">{p.tier === "guardian" ? "🌲" : "🌳"}</span>
								<span className="font-mono font-bold">@{p.username}</span>
								<span className="text-primary">{p.points}</span>
							</div>
						))}
					</Marquee>
				</div>

				{/* Table */}
				<div className="max-w-4xl mx-auto overflow-x-auto">
					<table className="w-full min-w-[500px]">
						<thead>
							<tr className="border-b border-border/50 text-muted-foreground text-sm">
								<th className="text-left py-3 px-4 font-medium">Rank</th>
								<th className="text-left py-3 px-4 font-medium">Pioneer</th>
								<th className="text-left py-3 px-4 font-medium">Tier</th>
								<th className="text-right py-3 px-4 font-medium">Points</th>
							</tr>
						</thead>
						<tbody>
							{leaderboardData?.leaderboard.map((p) => (
								<tr
									key={p.username}
									className={cn(
										"border-b border-border/40 hover:bg-muted/30 transition-colors",
										p.isCurrentUser && "bg-primary/5 hover:bg-primary/10",
									)}
								>
									<td className="py-3 px-4 font-mono text-muted-foreground">#{p.rank}</td>
									<td className="py-3 px-4">
										<div className="flex items-center gap-3">
											<Avatar className="h-8 w-8">
												<AvatarImage src={p.avatar} />
												<AvatarFallback>{p.username?.[0]?.toUpperCase() || "?"}</AvatarFallback>
											</Avatar>
											<span className="font-medium">@{p.username}</span>
											{p.isCurrentUser && <Badge className="ml-2 text-[10px] h-5">You</Badge>}
										</div>
									</td>
									<td className="py-3 px-4">
										<Badge status="info" className="capitalize">
											{p.tier}
										</Badge>
									</td>
									<td className="py-3 px-4 text-right font-mono font-bold">{p.points}</td>
								</tr>
							))}
						</tbody>
					</table>

					<div className="mt-8 text-center">
						<Button variant="ghost" asChild>
							<Link href="/pioneer/leaderboard">View Full Leaderboard →</Link>
						</Button>
					</div>
				</div>
			</section>

			{/* ─────────────────────────────────────────────────────────────────
          URGENCY CARD
         ───────────────────────────────────────────────────────────────── */}
			<section className="py-20 px-4">
				<div className="max-w-2xl mx-auto relative">
					<Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

					<div className="relative bg-card border rounded-2xl p-8 md:p-12 overflow-hidden text-center">
						<BorderBeam />

						<h3 className="text-2xl font-bold mb-4">Pioneer Program ends at launch.</h3>

						<p className="text-muted-foreground mb-8">
							When Pro goes live in Q1 2025, Pioneer benefits lock in forever. Don't miss out on lifetime
							access.
						</p>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-left mb-8">
							<div className="bg-muted/50 p-4 rounded-lg">
								<div className="text-2xl mb-2">🌲</div>
								<div className="font-bold text-sm">Lifetime Pro</div>
								<div className="text-xs text-muted-foreground">For Guardians</div>
							</div>
							<div className="bg-muted/50 p-4 rounded-lg">
								<div className="text-2xl mb-2">🌳</div>
								<div className="font-bold text-sm">1 Year Free</div>
								<div className="text-xs text-muted-foreground">For Cultivators</div>
							</div>
							<div className="bg-muted/50 p-4 rounded-lg">
								<div className="text-2xl mb-2">🌱</div>
								<div className="font-bold text-sm">50% Off</div>
								<div className="text-xs text-muted-foreground">For Everyone</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* ─────────────────────────────────────────────────────────────────
          FINAL CTA
         ───────────────────────────────────────────────────────────────── */}
			<section className="relative text-center py-24 px-4 overflow-hidden border-t">
				<Meteors number={30} />

				<div className="relative z-10">
					<h2 className="text-3xl md:text-4xl font-bold mb-8">Ready to earn your way to Pro?</h2>

					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<ShimmerButton size="lg">Become a Pioneer</ShimmerButton>

						<Button variant="outline" size="lg" asChild>
							<Link href="/docs/pioneer">View Docs →</Link>
						</Button>
					</div>

					<div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mt-8 text-sm text-muted-foreground">
						<span className="flex items-center gap-1">
							<Check className="h-4 w-4" /> No credit card
						</span>
						<span className="flex items-center gap-1">
							<Check className="h-4 w-4" /> Instant access
						</span>
						<span className="flex items-center gap-1">
							<Check className="h-4 w-4" /> Keep benefits forever
						</span>
					</div>
				</div>
			</section>
		</main>
	);
}
