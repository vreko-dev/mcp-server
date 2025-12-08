import { Button } from "@ui/components/button";
import { Check, Copy, Twitter } from "lucide-react";
import { useState } from "react";

// Using embedded Progress implementation from the prompt as it is custom styled for the "commit graph" look
// and doesn't match standard progress bars.

const REFERRAL_MILESTONES = [
	{ count: 1, label: "Alpha Badge", icon: "🛡️" },
	{ count: 3, label: "Skip Queue", icon: "🚀" },
	{ count: 5, label: "Instant Access", icon: "⚡" },
];

export const ReferralFlow = ({
	referralCode = "dev_x92z",
	currentReferrals = 0,
}: {
	referralCode?: string;
	currentReferrals?: number;
}) => {
	const [copied, setCopied] = useState(false);

	const referralLink = `https://snapback.dev/join/${referralCode}`;

	// The "Hacker" Copy - Optimized for Twitter/Discord
	const shareText = `Finally found a local-first tool that undoes Copilot's bad hallucinations. 🛡️\n\nI'm trying to get alpha access to SnapBack. Join the waitlist here:`;

	const handleCopy = () => {
		navigator.clipboard.writeText(referralLink);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleSocialShare = (platform: "twitter" | "linkedin") => {
		const text = encodeURIComponent(shareText);
		const url = encodeURIComponent(referralLink);

		if (platform === "twitter") {
			window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
		}
	};

	// Calculate Progress Logic
	const lastMilestone = REFERRAL_MILESTONES[REFERRAL_MILESTONES.length - 1]!;
	const nextMilestone = REFERRAL_MILESTONES.find((m) => m.count > currentReferrals) ?? lastMilestone;
	const progressPercent = Math.min((currentReferrals / 5) * 100, 100);

	return (
		<div className="w-full max-w-2xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
			{/* 1. The Hook */}
			<div className="bg-snapback-bg-secondary border border-snapback-border rounded-xl p-6 md:p-8 text-center space-y-4 relative overflow-hidden">
				<div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-snapback-bg-secondary via-snapback-green to-snapback-bg-secondary opacity-50" />

				<h3 className="text-2xl font-bold text-white">
					Don't wait. <span className="text-snapback-green">Hack the queue.</span>
				</h3>
				<p className="text-snapback-text-secondary">
					Invite <strong>{nextMilestone.count - currentReferrals} more developers</strong> to unlock
					<span className="text-white font-mono ml-2 px-2 py-1 bg-white/10 rounded text-sm">
						{nextMilestone.icon} {nextMilestone.label}
					</span>
				</p>

				{/* Progress Bar */}
				<div className="py-4 space-y-2">
					<div className="flex justify-between text-xs font-mono text-snapback-text-secondary uppercase tracking-widest">
						<span>Start</span>
						<span>Instant Access</span>
					</div>
					<div className="h-4 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
						<div
							className="h-full bg-gradient-to-r from-green-600 to-green-400 transition-all duration-1000 ease-out"
							style={{ width: `${progressPercent}%` }}
						/>
						{/* Ticks */}
						{[20, 60, 100].map((tick) => (
							<div
								key={tick}
								className="absolute top-0 h-full w-[1px] bg-black/50"
								style={{ left: `${tick}%` }}
							/>
						))}
					</div>
					<div className="flex justify-between pt-2">
						{REFERRAL_MILESTONES.map((m) => (
							<div
								key={m.count}
								className={`text-xs flex flex-col items-center gap-1 ${currentReferrals >= m.count ? "text-green-400" : "text-gray-500"}`}
							>
								<span className="bg-snapback-bg-primary border border-current p-1 rounded-full w-6 h-6 flex items-center justify-center">
									{currentReferrals >= m.count ? <Check size={12} /> : m.count}
								</span>
								<span className="hidden md:block">{m.label}</span>
							</div>
						))}
					</div>
				</div>
			</div>

			{/* 2. The Tools (Copy/Paste Area) */}
			<div className="space-y-4">
				<div className="flex flex-col md:flex-row gap-3">
					<div className="relative flex-grow group">
						<div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
							<span className="text-snapback-text-secondary font-mono text-sm">$ link:</span>
						</div>
						<input
							readOnly
							value={referralLink}
							className="w-full bg-black/40 border border-snapback-border rounded-lg py-3 pl-16 pr-12 text-snapback-green font-mono text-sm focus:outline-none focus:border-snapback-green/50 transition-all"
						/>
						<button
							onClick={handleCopy}
							className="absolute inset-y-1 right-1 p-2 bg-snapback-bg-primary hover:bg-white/10 rounded-md text-snapback-text-secondary transition-colors"
						>
							{copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
						</button>
					</div>

					<Button
						onClick={() => handleSocialShare("twitter")}
						className="bg-[#1DA1F2] hover:bg-[#1DA1F2]/90 text-white font-semibold gap-2"
					>
						<Twitter size={18} />
						Post
					</Button>
				</div>

				{/* 3. The "Developer" Manual Copy Block */}
				<div className="bg-black/20 rounded-lg p-4 border border-white/5">
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs font-mono text-snapback-text-secondary uppercase">
							Discord / Slack Copy
						</span>
						<button
							onClick={() => {
								navigator.clipboard.writeText(shareText);
								setCopied(true);
							}}
							className="text-xs text-snapback-green hover:underline"
						>
							Copy Text
						</button>
					</div>
					<p className="font-mono text-sm text-gray-400 leading-relaxed break-words selection:bg-green-900 selection:text-white">
						{shareText} <span className="text-snapback-green">{referralLink}</span>
					</p>
				</div>
			</div>
		</div>
	);
};
