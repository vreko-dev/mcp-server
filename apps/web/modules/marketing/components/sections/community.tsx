"use client";
import { m } from "motion/react";
import { useEffect, useState } from "react";

export function CommunitySection() {
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	const communityCards = [
		{
			title: "Snapback Saturdays",
			description:
				"Weekly community features showcasing amazing recoveries and developer stories",
			icon: <IconCalendar />,
			action: "Join weekly features",
			gradient: "from-primary/20 to-secondary/20",
			border: "border-primary/30",
		},
		{
			title: "Recovery Stories",
			description:
				"Share your saves, learn from others, and celebrate those 'phew!' moments",
			icon: <IconStories />,
			action: "Share your story",
			gradient: "from-accent/20 to-primary/20",
			border: "border-accent/30",
		},
		{
			title: "Get Your Cap",
			description:
				"Join Pro and get exclusive SnapBack swag delivered to your door",
			icon: <IconCap />,
			action: "Claim your cap",
			gradient: "from-warning/20 to-accent/20",
			border: "border-warning/30",
		},
	];

	return (
		<div className="container mx-auto">
			<div className="text-center mb-16">
				<h2 className="text-display font-black text-white mb-6">
					Join the SnapBack Squad
				</h2>
				<p className="text-xl text-muted-foreground max-w-2xl mx-auto">
					Connect with developers who understand the chaos of AI-assisted coding
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
				{communityCards.map((card, index) => (
					<CommunityCard
						key={index}
						card={card}
						index={index}
						isMounted={isMounted}
					/>
				))}
			</div>

			<div className="text-center mt-16">
				<div className="inline-flex items-center space-x-6 p-6 bg-card/30 rounded-2xl border border-border/50">
					<div className="flex -space-x-2">
						{[1, 2, 3, 4, 5].map((i) => (
							<div
								key={i}
								className="w-10 h-10 bg-primary/20 border-2 border-background rounded-full flex items-center justify-center"
							>
								<span className="text-xs text-primary font-semibold">
									{String.fromCharCode(64 + i)}
								</span>
							</div>
						))}
					</div>
					<div className="text-left">
						<div className="text-white font-semibold">50,000+ developers</div>
						<div className="text-muted-foreground text-sm">
							Already part of the community
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

const CommunityCard = ({
	card,
	index,
	isMounted,
}: {
	card: any;
	index: number;
	isMounted: boolean;
}) => {
	return (
		<m.div
			className={`relative bg-gradient-to-br ${card.gradient} p-6 rounded-2xl border ${card.border} group cursor-pointer overflow-hidden`}
			initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.1 }}
			whileHover={{
				y: -5,
				transition: { type: "spring", stiffness: 300 },
			}}
		>
			{/* 3D tilt effect background */}
			<m.div
				className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
				style={{
					background:
						"radial-gradient(circle at 50% 0%, rgba(255,255,255,0.1), transparent 50%)",
				}}
			/>

			<div className="relative z-10">
				<div className="mb-6">
					<div className="p-3 bg-background/30 rounded-lg w-fit mb-4 group-hover:scale-110 transition-transform">
						{card.icon}
					</div>
					<h3 className="text-xl font-bold text-white mb-3">{card.title}</h3>
					<p className="text-muted-foreground leading-relaxed">
						{card.description}
					</p>
				</div>

				<m.button
					className="text-white font-medium flex items-center space-x-2 group-hover:text-primary transition-colors"
					whileHover={{ x: 5 }}
				>
					<span>{card.action}</span>
					<m.svg
						width="16"
						height="16"
						viewBox="0 0 16 16"
						fill="none"
						animate={{ x: [0, 3, 0] }}
						transition={{
							repeat: Number.POSITIVE_INFINITY,
							duration: 2,
						}}
					>
						<path
							d="M6 3L10 8L6 13"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</m.svg>
				</m.button>
			</div>
		</m.div>
	);
};

// Icon components
const IconCalendar = () => (
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		className="text-primary"
	>
		<rect
			x="3"
			y="4"
			width="18"
			height="18"
			rx="2"
			stroke="currentColor"
			strokeWidth="2"
		/>
		<path
			d="M16 2v4M8 2v4M3 10h18"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</svg>
);

const IconStories = () => (
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		className="text-primary"
	>
		<path
			d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
		<path
			d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</svg>
);

const IconCap = () => (
	<svg
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		className="text-primary"
	>
		<path
			d="M12 2L2 7l10 5 10-5-10-5z"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
		<path
			d="M2 17l10 5 10-5"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
		/>
	</svg>
);
