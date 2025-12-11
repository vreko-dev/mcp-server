"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLeaderboard } from "@/modules/pioneer/hooks/use-leaderboard";

export default function LeaderboardPage() {
	const { data: leaderboardData, isLoading } = useLeaderboard(100);

	return (
		<main className="min-h-screen bg-background py-20 px-4">
			<div className="max-w-4xl mx-auto">
				<div className="mb-8">
					<Button variant="ghost" size="sm" asChild className="mb-4">
						<Link href="/pioneer">
							<ChevronLeft className="h-4 w-4 mr-2" /> Back to Pioneer Program
						</Link>
					</Button>
					<h1 className="text-4xl font-bold">Pioneer Leaderboard</h1>
					<p className="text-muted-foreground mt-2">Top contributors building the future of SnapBack.</p>
				</div>

				<div className="border rounded-xl overflow-hidden bg-card">
					<table className="w-full">
						<thead className="bg-muted/50">
							<tr className="text-left text-sm font-medium text-muted-foreground border-b">
								<th className="py-4 px-6 w-20">Rank</th>
								<th className="py-4 px-6">Pioneer</th>
								<th className="py-4 px-6">Tier</th>
								<th className="py-4 px-6 text-right">Points</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{isLoading ? (
								<tr>
									<td colSpan={4} className="py-12 text-center text-muted-foreground">
										Loading leaderboard...
									</td>
								</tr>
							) : (
								leaderboardData?.leaderboard.map((p) => (
									<tr
										key={p.username}
										className={cn(
											"hover:bg-muted/30 transition-colors",
											p.isCurrentUser && "bg-primary/5 hover:bg-primary/10",
										)}
									>
										<td className="py-4 px-6 font-mono text-muted-foreground">#{p.rank}</td>
										<td className="py-4 px-6">
											<div className="flex items-center gap-3">
												<Avatar>
													<AvatarImage src={p.avatar} />
													<AvatarFallback>
														{p.username?.[0]?.toUpperCase() || "?"}
													</AvatarFallback>
												</Avatar>
												<span className="font-medium">@{p.username}</span>
												{p.isCurrentUser && <Badge className="ml-2 text-xs">You</Badge>}
											</div>
										</td>
										<td className="py-4 px-6">
											<Badge status="info" className="capitalize">
												{p.tier}
											</Badge>
										</td>
										<td className="py-4 px-6 text-right font-mono font-bold">{p.points}</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</main>
	);
}
