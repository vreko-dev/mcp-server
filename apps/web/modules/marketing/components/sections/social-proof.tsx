"use client";

import { InfiniteMovingCards } from "@marketing/components/ui/infinite-moving-cards";
import { useContent } from "@marketing/hooks/use-content";
import { m } from "motion/react";
import { useEffect, useMemo, useState } from "react";

const DEFAULT_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://snapback.dev";

function AnimatedCounter({
	value,
	prefix = "",
	suffix = "",
	duration = 2000,
}: {
	value: number;
	prefix?: string | undefined;
	suffix?: string | undefined;
	duration?: number;
}) {
	const [count, setCount] = useState(0);
	const [isInView, setIsInView] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (!isInView) {
			return;
		}

		const startTime = Date.now();
		const startValue = 0;

		const updateCounter = () => {
			const elapsed = Date.now() - startTime;
			const progress = Math.min(elapsed / duration, 1);

			const easeOut = 1 - (1 - progress) ** 3;
			const currentValue = Math.floor(startValue + value * easeOut);

			setCount(currentValue);

			if (progress < 1) {
				requestAnimationFrame(updateCounter);
			}
		};

		requestAnimationFrame(updateCounter);
	}, [isInView, value, duration]);

	return (
		<m.div
			initial={isMounted ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
			whileInView={{
				opacity: 1,
				scale: 1,
				transition: {
					duration: 0.5,
					type: "spring",
					stiffness: 300,
					damping: 20,
					onComplete: () => setIsInView(true),
				},
			}}
			viewport={{ once: true }}
			className="text-center"
			whileHover={{
				scale: 1.05,
				transition: { duration: 0.3 },
			}}
		>
			<div className="text-4xl md:text-6xl font-bold text-white mb-2">
				{prefix}
				{count.toLocaleString()}
				{suffix}
			</div>
		</m.div>
	);
}

export function SocialProof() {
	const content = useContent();
	const [isMounted, setIsMounted] = useState(false);
	const [siteOrigin, setSiteOrigin] = useState(DEFAULT_SITE_URL);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		if (typeof window !== "undefined") {
			setSiteOrigin(window.location.origin);
		}
	}, []);

	const testimonialItems = content.social_proof.testimonials.map((testimonial) => ({
		quote: testimonial.quote,
		name: testimonial.author,
		title: testimonial.role,
	}));

	const structuredData = useMemo(() => {
		const offers =
			content.pricing?.tiers
				.filter((tier) => typeof tier.price === "number")
				.map((tier) => ({
					"@type": "Offer",
					name: tier.name,
					price: tier.price,
					priceCurrency: "USD",
					description: tier.description,
					availability: "https://schema.org/InStock",
					url: `${siteOrigin}/auth/signup?plan=${tier.id}`,
				})) ?? [];

		return {
			"@context": "https://schema.org",
			"@type": "SoftwareApplication",
			name: "SnapBack",
			applicationCategory: "DeveloperApplication",
			operatingSystem: "Web, macOS, Windows, Linux",
			url: siteOrigin,
			offers,
			aggregateRating: {
				"@type": "AggregateRating",
				ratingValue: "4.9",
				ratingCount: String(content.social_proof.stats?.[0]?.value ?? 1800),
			},
			review: testimonialItems.slice(0, 3).map((testimonial) => ({
				"@type": "Review",
				reviewBody: testimonial.quote,
				author: {
					"@type": "Person",
					name: testimonial.name,
				},
			})),
		};
	}, [content.pricing?.tiers, content.social_proof.stats, testimonialItems, siteOrigin]);

	return (
		<section className="relative py-20 px-4 bg-gradient-to-b from-black to-slate-900 z-10 mt-16">
			<div className="max-w-7xl mx-auto">
				{/* Stats Section */}
				<m.div
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{
						duration: 0.8,
						type: "spring",
						stiffness: 100,
						damping: 15,
					}}
					className="text-center mb-20"
				>
					<h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
						The Numbers Don't{" "}
						<span className="bg-gradient-to-r from-[#00FF41] to-[#10B981] bg-clip-text text-transparent">
							Lie
						</span>
					</h2>
					<p className="text-xl text-gray-300 max-w-3xl mx-auto mb-16">
						Real developers. Real protection. Real savings.
					</p>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{content.social_proof.stats.map((stat, index) => (
							<m.div
								key={stat.label}
								initial={isMounted ? { opacity: 0, y: 30, scale: 0.9 } : { opacity: 1, y: 0, scale: 1 }}
								whileInView={{
									opacity: 1,
									y: 0,
									scale: 1,
									transition: {
										delay: index * 0.2,
										type: "spring",
										stiffness: 200,
										damping: 20,
									},
								}}
								viewport={{ once: true }}
								whileHover={{
									y: -10,
									scale: 1.05,
									transition: {
										type: "spring",
										stiffness: 300,
										damping: 20,
									},
								}}
								className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700"
							>
								<AnimatedCounter
									value={stat.value}
									prefix={stat.prefix || ""}
									suffix={stat.suffix || ""}
									duration={2000 + index * 500}
								/>
								<p className="text-gray-400 text-lg font-medium">{stat.label}</p>
							</m.div>
						))}
					</div>
				</m.div>

				{/* Testimonials Section */}
				<m.div
					initial={isMounted ? { opacity: 0 } : { opacity: 1 }}
					whileInView={{
						opacity: 1,
						transition: {
							duration: 0.8,
							type: "spring",
							stiffness: 100,
							damping: 15,
						},
					}}
					viewport={{ once: true }}
					className="mb-16"
				>
					<h3 className="text-3xl md:text-4xl font-bold text-white text-center mb-12">
						What Protected Developers Say
					</h3>

					<InfiniteMovingCards items={testimonialItems} direction="right" speed="slow" className="mb-8" />

					<div className="mx-auto grid max-w-5xl gap-6 text-left lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
						<div className="rounded-3xl border border-gray-700/70 bg-gray-900/60 p-6 md:p-8">
							<p className="text-xs uppercase tracking-wide text-emerald-300">Case Study</p>
							<h4 className="mt-2 text-2xl font-semibold text-white">
								Luma Labs eliminated $12K weekly AI outages
							</h4>
							<p className="mt-3 text-sm text-gray-300 leading-relaxed">
								After a Cursor refactor deleted their env vars, Luma Labs rolled SnapBack across 24
								repos. Critical hats blocked AI from touching secrets, while protected hats gave
								engineers self-service rollbacks in under three seconds.
							</p>
							<ul className="mt-5 space-y-2 text-sm text-gray-300">
								<li>• 38% faster incident response</li>
								<li>• 0 production rollbacks in the last 90 days</li>
								<li>• Slack + PagerDuty notifications wired automatically</li>
							</ul>
						</div>
						<div className="rounded-3xl border border-gray-700/70 bg-gray-900/60 p-6 md:p-8">
							<p className="text-xs uppercase tracking-wide text-sky-300">Teams shipping with SnapBack</p>
							<div className="mt-4 grid grid-cols-2 gap-4 text-sm text-gray-300">
								<span>Stripe platform security</span>
								<span>Vercel DX enablement</span>
								<span>Mercury banking</span>
								<span>Linear product ops</span>
							</div>
							<p className="mt-6 text-xs text-gray-400">
								Need references? We&apos;ll connect you with a team running SnapBack at scale.
							</p>
						</div>
					</div>
				</m.div>

				{/* Developer Savings Highlights */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{content.social_proof.testimonials.map((testimonial, index) => (
						<m.div
							key={testimonial.author}
							initial={
								isMounted
									? {
											opacity: 0,
											x: index % 2 === 0 ? -50 : 50,
											y: 30,
											scale: 0.9,
										}
									: { opacity: 1, x: 0, y: 0, scale: 1 }
							}
							whileInView={{
								opacity: 1,
								x: 0,
								y: 0,
								scale: 1,
								transition: {
									delay: index * 0.2,
									type: "spring",
									stiffness: 200,
									damping: 20,
								},
							}}
							viewport={{ once: true }}
							whileHover={{
								y: -10,
								scale: 1.02,
								transition: {
									type: "spring",
									stiffness: 300,
									damping: 20,
								},
							}}
							className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 relative overflow-hidden"
						>
							<blockquote className="text-gray-300 text-lg mb-4 break-words leading-relaxed">
								"{testimonial.quote}"
							</blockquote>

							{/* Saved amount badge - moved to bottom right */}
							<div className="absolute bottom-4 right-4">
								<div className="bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1">
									<span className="text-green-400 font-bold text-sm">
										+$
										{testimonial.saved.toLocaleString()} saved
									</span>
								</div>
							</div>

							<div className="flex items-center">
								<div className="w-10 h-10 bg-gradient-to-r from-[#00FF41] to-[#10B981] rounded-full flex items-center justify-center text-black font-bold text-sm mr-3">
									{testimonial.author
										.split(" ")
										.map((n) => n[0])
										.join("")}
								</div>
								<div>
									<div className="font-semibold text-white">{testimonial.author}</div>
									<div className="text-gray-400 text-sm">{testimonial.role}</div>
								</div>
							</div>
						</m.div>
					))}
				</div>
			</div>

			<script
				type="application/ld+json"
				suppressHydrationWarning
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(structuredData),
				}}
			/>
		</section>
	);
}
