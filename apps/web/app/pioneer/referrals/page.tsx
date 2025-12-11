"use client";

import { CheckCircle2, ChevronLeft, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { useReferrals } from "@/modules/pioneer/hooks/use-referrals";

export default function ReferralsPage() {
	const { data, isLoading } = useReferrals();

	return (
		<main className="min-h-screen bg-background py-20 px-4">
			<div className="max-w-4xl mx-auto">
				<Button variant="ghost" size="sm" asChild className="mb-4">
					<Link href="/pioneer">
						<ChevronLeft className="h-4 w-4 mr-2" /> Back to Pioneer Program
					</Link>
				</Button>

				<h1 className="text-4xl font-bold mb-8">Referral Hub</h1>

				{isLoading ? (
					<div>Loading referral data...</div>
				) : data ? (
					<>
						{/* Stats Grid */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
							<div className="bg-card border rounded-xl p-6">
								<div className="flex items-center gap-2 text-muted-foreground mb-2">
									<Users className="h-4 w-4" />
									<span className="text-sm font-medium">Total Signups</span>
								</div>
								<div className="text-3xl font-bold">{data.stats.totalSignups}</div>
							</div>
							<div className="bg-card border rounded-xl p-6">
								<div className="flex items-center gap-2 text-muted-foreground mb-2">
									<CheckCircle2 className="h-4 w-4" />
									<span className="text-sm font-medium">Activated</span>
								</div>
								<div className="text-3xl font-bold text-green-500">{data.stats.activatedSignups}</div>
								<p className="text-xs text-muted-foreground mt-1">Hit 5 snapshots</p>
							</div>
							<div className="bg-card border rounded-xl p-6">
								<div className="flex items-center gap-2 text-muted-foreground mb-2">
									<Trophy className="h-4 w-4" />
									<span className="text-sm font-medium">Points Earned</span>
								</div>
								<div className="text-3xl font-bold text-primary">{data.stats.pointsEarned}</div>
							</div>
						</div>

						{/* Share Card */}
						<div className="bg-card border rounded-xl p-8 mb-12 text-center">
							<h2 className="text-2xl font-bold mb-2">Invite Friends, Earn Points</h2>
							<p className="text-muted-foreground mb-6">
								Earn <span className="text-foreground font-bold">200 pts</span> for every signup +{" "}
								<span className="text-foreground font-bold">100 pts</span> when they activate.
							</p>

							<div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
								<div className="bg-muted px-4 py-2 rounded-lg font-mono text-sm w-full truncate border">
									{data.referralUrl}
								</div>
								<CopyButton value={data.referralUrl} className="w-full sm:w-auto">
									Copy Link
								</CopyButton>
							</div>
						</div>

						{/* Referral List */}
						<h3 className="text-xl font-bold mb-4">Your Referrals</h3>
						<div className="bg-card border rounded-xl overflow-hidden">
							<table className="w-full">
								<thead className="bg-muted/50">
									<tr className="text-left text-sm font-medium text-muted-foreground border-b">
										<th className="py-3 px-6">User</th>
										<th className="py-3 px-6">Status</th>
										<th className="py-3 px-6 text-right">Signed Up</th>
									</tr>
								</thead>
								<tbody className="divide-y">
									{data.referrals.map((r) => (
										<tr key={r.username}>
											<td className="py-3 px-6 font-medium">@{r.username}</td>
											<td className="py-3 px-6">
												<Badge status={r.status === "activated" ? "success" : "info"}>
													{r.status}
												</Badge>
											</td>
											<td className="py-3 px-6 text-right text-muted-foreground text-sm">
												{r.signedUpAt}
											</td>
										</tr>
									))}
									{data.referrals.length === 0 && (
										<tr>
											<td colSpan={3} className="py-8 text-center text-muted-foreground">
												No referrals yet. Share your link to get started!
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</>
				) : (
					<div>Failed to load data.</div>
				)}
			</div>
		</main>
	);
}
