"use client";

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import { Check, Copy, Gift, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { fadeInUp } from "@/lib/animations";
import { snapbackColors } from "@/lib/design-system";
import { useAnalytics } from "@/modules/analytics/provider/posthog";

const MILESTONES = [
	{ referrals: 1, reward: "1 month Pro", icon: <Gift className="w-5 h-5" /> },
	{ referrals: 3, reward: "3 months Pro", icon: <Gift className="w-5 h-5" /> },
	{
		referrals: 6,
		reward: "6 months Pro",
		icon: <Trophy className="w-6 h-6" />,
	},
];

export function ReferralFlow() {
	const { trackEvent } = useAnalytics();
	const [referralCode, _setReferralCode] = useState(
		`SNAPBACK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
	);
	const [copied, setCopied] = useState(false);
	const [referralCount, _setReferralCount] = useState(0);

	const referralLink = `https://snapback.dev/waitlist?ref=${referralCode}`;

	const handleCopy = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);

			// Track with PostHog
			trackEvent("referral_link_copied", {
				referralCode,
			});
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	return (
		<motion.div
			variants={fadeInUp as any}
			initial="initial"
			animate="animate"
			className="max-w-2xl mx-auto space-y-8"
		>
			{/* Referral Link Card */}
			<div className="rounded-lg border border-snapback-border bg-snapback-bg-secondary p-8 space-y-4">
				<h3 className="text-xl font-semibold text-snapback-text-primary">Your Referral Link</h3>
				<p className="text-snapback-text-secondary">
					Share this link with your friends. When they sign up, you both get 1 month of Pro free!
				</p>

				<div className="flex gap-2">
					<Input
						value={referralLink}
						readOnly
						className="bg-snapback-bg-primary border-snapback-border font-mono text-sm"
					/>
					<Button onClick={() => handleCopy(referralLink)} variant="outline" className="flex-shrink-0">
						{copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
						{copied ? "Copied!" : "Copy"}
					</Button>
				</div>

				<div className="flex gap-2">
					<Input
						value={referralCode}
						readOnly
						className="bg-snapback-bg-primary border-snapback-border font-mono text-sm"
					/>
					<Button onClick={() => handleCopy(referralCode)} variant="outline" className="flex-shrink-0">
						Copy Code
					</Button>
				</div>
			</div>

			{/* Rewards Milestones */}
			<div className="rounded-lg border border-snapback-border bg-snapback-bg-secondary p-8 space-y-6">
				<div>
					<h3 className="text-xl font-semibold text-snapback-text-primary mb-2">Unlock Rewards</h3>
					<p className="text-snapback-text-secondary">
						Invite friends to unlock Pro features. Cap at 6 months total.
					</p>
				</div>

				{/* Progress */}
				<div className="space-y-4">
					{MILESTONES.map((milestone, index) => {
						const isUnlocked = referralCount >= milestone.referrals;
						const isNext =
							referralCount < milestone.referrals &&
							(index === 0 ||
								(MILESTONES[index - 1] &&
									referralCount >= (MILESTONES[index - 1] as typeof milestone).referrals));

						return (
							<div
								key={index}
								className={cn(
									"flex items-center gap-4 rounded-lg border p-4 transition-all",
									isUnlocked
										? "border-snapback-green/30 bg-snapback-green/5"
										: isNext
											? "border-snapback-green/20 bg-snapback-bg-primary"
											: "border-snapback-border bg-snapback-bg-tertiary opacity-60",
								)}
							>
								<div
									className={cn(
										"flex h-12 w-12 items-center justify-center rounded-full",
										isUnlocked
											? "bg-snapback-green/20 text-snapback-green"
											: "bg-snapback-bg-tertiary text-snapback-text-secondary",
									)}
								>
									{milestone.icon}
								</div>
								<div className="flex-1">
									<p className="font-semibold text-snapback-text-primary">
										{milestone.referrals} Referral
										{milestone.referrals > 1 ? "s" : ""}
									</p>
									<p className="text-sm text-snapback-text-secondary">{milestone.reward}</p>
								</div>
								{isUnlocked && (
									<div
										className="flex h-8 w-8 items-center justify-center rounded-full"
										style={{ backgroundColor: snapbackColors.green.DEFAULT }}
									>
										<Check className="w-5 h-5 text-white" />
									</div>
								)}
								{isNext && !isUnlocked && (
									<div className="text-sm font-semibold text-snapback-green">Next</div>
								)}
							</div>
						);
					})}
				</div>

				{/* Stats */}
				<div className="grid grid-cols-2 gap-4 pt-4 border-t border-snapback-border">
					<div className="text-center">
						<p className="text-3xl font-bold text-snapback-green">{referralCount}</p>
						<p className="text-sm text-snapback-text-secondary">Successful Referrals</p>
					</div>
					<div className="text-center">
						<p className="text-3xl font-bold text-snapback-green">{Math.min(referralCount, 6)}</p>
						<p className="text-sm text-snapback-text-secondary">Months of Pro Unlocked</p>
					</div>
				</div>
			</div>

			{/* How It Works */}
			<div className="rounded-lg border border-snapback-border bg-snapback-bg-secondary p-8 space-y-4">
				<h3 className="text-xl font-semibold text-snapback-text-primary">How It Works</h3>
				<ol className="space-y-3 text-snapback-text-secondary">
					<li className="flex items-start gap-3">
						<span
							className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold flex-shrink-0"
							style={{
								backgroundColor: snapbackColors.green.glow,
								color: snapbackColors.green.DEFAULT,
							}}
						>
							1
						</span>
						<span>Share your referral link or code with friends</span>
					</li>
					<li className="flex items-start gap-3">
						<span
							className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold flex-shrink-0"
							style={{
								backgroundColor: snapbackColors.green.glow,
								color: snapbackColors.green.DEFAULT,
							}}
						>
							2
						</span>
						<span>They join the waitlist using your link/code</span>
					</li>
					<li className="flex items-start gap-3">
						<span
							className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold flex-shrink-0"
							style={{
								backgroundColor: snapbackColors.green.glow,
								color: snapbackColors.green.DEFAULT,
							}}
						>
							3
						</span>
						<span>You both receive 1 month of Pro when they get access</span>
					</li>
					<li className="flex items-start gap-3">
						<span
							className="flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold flex-shrink-0"
							style={{
								backgroundColor: snapbackColors.green.glow,
								color: snapbackColors.green.DEFAULT,
							}}
						>
							4
						</span>
						<span>Unlock up to 6 months total by referring 6 friends</span>
					</li>
				</ol>
			</div>
		</motion.div>
	);
}
