import { AlphaBadge } from "@marketing/components/ui/alpha-badge";
import { SocialProofMetrics } from "@marketing/components/ui/social-proof-metrics";
import { Tabs } from "@marketing/components/ui/tabs";
import { WaitlistFlow } from "@marketing/waitlist/components/WaitlistFlow";
import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Join SnapBack Private Alpha | Get 6 Months Pro Free",
	description:
		"Limited to 5,000 developers. Get early access to SnapBack Pro features with 6 months free. Priority access for early adopters.",
	openGraph: {
		title: "Join SnapBack Private Alpha - 6 Months Pro Free",
		description:
			"Limited alpha access for developers. Get 6 months of SnapBack Pro free and shape the future of AI-powered development safety.",
		type: "website",
	},
};

const FAQ_ITEMS = [
	{
		question: "How long until I'm approved?",
		answer:
			"Most developers get access within 48-72 hours. Complete queue tasks to move up faster - some get access same-day.",
	},
	{
		question: "What do I get as an alpha user?",
		answer:
			"• Full VS Code extension (Pro features)\n• Cloud backup (10GB)\n• Priority support (< 2hr response)\n• 6 months Pro free ($174 value)\n• Exclusive Founders Discord\n• Vote on roadmap features",
	},
	{
		question: "How does the referral system work?",
		answer:
			"Both you and your friend get 1 month of Pro when they sign up. You can unlock up to 6 months total through referrals.",
	},
	{
		question: "Is the free tier always free?",
		answer:
			"Yes! Open-source core is always free. Pro features are $29/mo after your 6-month alpha bonus.",
	},
	{
		question: "Do you access my code?",
		answer:
			"Never. SnapBack is 100% local-first. Only metadata (file counts, timestamps) for analytics. Zero code content ever leaves your machine.",
	},
	{
		question: "Can I use SnapBack with Cursor/Copilot?",
		answer:
			"Yes! That's the point. SnapBack protects you FROM AI assistants breaking things. It works alongside any AI tool.",
	},
];

export default function WaitlistPage() {
	const tabItems = [
		{
			title: "Request Access",
			value: "request",
			content: <WaitlistFlow />,
		},
		// Temporarily hidden - will be enabled later
		// {
		// 	title: "Invite Friends",
		// 	value: "invite",
		// 	content: <ReferralFlow />,
		// },
	];

	return (
		<div className="relative min-h-screen bg-snapback-bg-primary py-16">
			<div className="container mx-auto px-4 max-w-4xl">
				{/* Header */}
				<div className="text-center mb-12 space-y-6">
					<div className="flex justify-center">
						<AlphaBadge />
					</div>

					<div className="space-y-4">
						<h1 className="text-5xl md:text-6xl font-bold text-snapback-text-primary">
							Join SnapBack Private Alpha
						</h1>

						<h2 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-[#00FF41] via-[#34D399] to-[#00FF41] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(0,255,65,0.3)]">
							✨ Get 6 Months Pro Free
						</h2>
					</div>

					<p className="text-lg text-snapback-text-secondary max-w-2xl mx-auto">
						Limited to 5,000 developers. Priority access for early adopters. Get
						early access to SnapBack Pro features and be part of shaping the
						future of AI-powered development safety.
					</p>

					<div className="pt-4">
						<SocialProofMetrics variant="compact" />
					</div>
				</div>

				{/* Content - Only show tabs when multiple options exist */}
				<div className="mb-16">
					{tabItems.length > 1 ? (
						<Tabs tabs={tabItems} />
					) : (
						tabItems[0]?.content
					)}
				</div>

				{/* FAQ */}
				<div className="mt-16">
					<h2 className="text-3xl font-bold text-center mb-8 text-snapback-text-primary">
						Frequently Asked Questions
					</h2>
					<div className="space-y-4">
						{FAQ_ITEMS.map((item, index) => (
							<details
								key={index}
								className="group rounded-lg border border-snapback-border bg-snapback-bg-secondary p-6"
							>
								<summary className="flex cursor-pointer items-center justify-between font-semibold text-snapback-text-primary">
									{item.question}
									<span className="ml-4 flex-shrink-0 text-snapback-green group-open:rotate-180 transition-transform">
										▼
									</span>
								</summary>
								<div className="mt-4 text-snapback-text-secondary whitespace-pre-line">
									{item.answer}
								</div>
							</details>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
