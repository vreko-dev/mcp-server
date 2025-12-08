"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";

export interface PricingFeature {
	text: string | React.ReactNode;
	category: "protection" | "intelligence" | "collaboration" | "compliance";
	icon?: string;
	tooltip?: string;
}

export interface PricingCardData {
	id: string;
	name: string;
	price: number | "Custom";
	annualPrice?: number;
	description: string;
	persona: string;
	headline: string;
	popular?: boolean;

	features: {
		mustShow: PricingFeature[];
		viewMore: PricingFeature[];
	};

	limitations?: string[];
	cta: {
		text: string;
		href: string;
		variant: "primary" | "outline";
	};
}

interface PricingCardProps {
	tier: PricingCardData;
	billingCycle: "monthly" | "annual";
	index: number;
}

const categoryIcons = {
	protection: "🛡️",
	intelligence: "🧠",
	collaboration: "👥",
	compliance: "✅",
};

export const PricingCard = ({ tier, billingCycle, index }: PricingCardProps) => {
	const [expanded, setExpanded] = useState(false);

	const displayPrice =
		typeof tier.price === "number"
			? billingCycle === "annual" && tier.annualPrice
				? tier.annualPrice
				: tier.price
			: tier.price;

	const savings =
		typeof tier.price === "number" && billingCycle === "annual" && tier.annualPrice
			? Math.round(((tier.price - tier.annualPrice) / tier.price) * 100)
			: 0;

	return (
		<m.div
			initial={{ opacity: 1, y: 0 }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, margin: "-10%" }}
			transition={{
				duration: 0.5,
				delay: index * 0.08,
				ease: [0.25, 0.46, 0.45, 0.94],
			}}
			className={cn("relative h-full flex flex-col", tier.popular && "lg:-mt-8")}
		>
			{/* Popular Badge */}
			{tier.popular && (
				<div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
					<Badge className="bg-gradient-to-r from-[#FF6B35] to-[#EF4444] text-white px-4 py-1 rounded-full text-xs font-semibold border-none">
						🔥 Most Popular
					</Badge>
				</div>
			)}

			{/* Card Container */}
			<div
				className={cn(
					"relative h-full bg-[#0E0E0E] backdrop-blur-sm border rounded-2xl p-6 flex flex-col",
					"transition-all duration-300",
					tier.popular
						? "border-[#34D399] shadow-lg shadow-[#34D399]/20"
						: "border-[#222] hover:border-[#333]",
					expanded && "ring-2 ring-[#34D399]/50",
				)}
			>
				{/* Header */}
				<div className="mb-6">
					<h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>

					{/* Price Display */}
					<div className="flex items-baseline mb-2">
						<span className="text-4xl font-bold text-white">
							{typeof displayPrice === "number" ? `$${displayPrice}` : displayPrice}
						</span>
						{typeof displayPrice === "number" && <span className="text-gray-400 ml-2 text-sm">/month</span>}
					</div>

					<p className="text-sm text-gray-400 mb-2">{tier.description}</p>

					{savings > 0 && (
						<div className="text-[#10B981] text-sm font-medium">💰 Save {savings}% annually</div>
					)}
				</div>

				{/* Must-Show Features */}
				<div className="mb-4 space-y-2">
					{tier.features.mustShow.map((feature, idx) => (
						<m.div
							key={idx}
							initial={{ opacity: 1, x: 0 }}
							whileInView={{ opacity: 1, x: 0 }}
							viewport={{ once: true }}
							transition={{ delay: index * 0.08 + idx * 0.05 }}
							className="flex items-start"
						>
							<span className="text-[#10B981] mr-2 mt-0.5 flex-shrink-0">
								{categoryIcons[feature.category] || "✓"}
							</span>
							<span className="text-sm text-gray-300">{feature.text}</span>
						</m.div>
					))}
				</div>

				{/* View More Button */}
				{tier.features.viewMore.length > 0 && (
					<button
						type="button"
						onClick={() => setExpanded(!expanded)}
						className={cn(
							"flex items-center justify-center text-sm mb-4 py-2 px-3 rounded-lg",
							"text-gray-400 hover:text-white hover:bg-[#111]",
							"transition-all duration-200",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#34D399]",
						)}
					>
						{expanded ? (
							<>
								Show less
								<ChevronUpIcon className="ml-1 w-4 h-4" />
							</>
						) : (
							<>
								View all features ({tier.features.viewMore.length} more)
								<ChevronDownIcon className="ml-1 w-4 h-4" />
							</>
						)}
					</button>
				)}

				{/* Expanded Features */}
				<AnimatePresence mode="wait">
					{expanded && (
						<m.div
							key="expanded-features"
							initial={{ height: 0, opacity: 0 }}
							animate={{ height: "auto", opacity: 1 }}
							exit={{ height: 0, opacity: 0 }}
							transition={{
								duration: 0.3,
								ease: [0.25, 0.46, 0.45, 0.94],
							}}
							className="overflow-hidden mb-4"
						>
							<div className="space-y-2 pt-2 border-t border-[#333]">
								{tier.features.viewMore.map((feature, idx) => (
									<m.div
										key={idx}
										initial={{ opacity: 0, x: -10 }}
										animate={{ opacity: 1, x: 0 }}
										transition={{ delay: idx * 0.05 }}
										className="flex items-start"
									>
										<span className="text-[#10B981] mr-2 mt-0.5 flex-shrink-0">
											{categoryIcons[feature.category] || "✓"}
										</span>
										<span className="text-sm text-gray-300">{feature.text}</span>
									</m.div>
								))}
							</div>
						</m.div>
					)}
				</AnimatePresence>

				{/* Limitations */}
				{tier.limitations && tier.limitations.length > 0 && (
					<div className="mb-4 pt-4 border-t border-gray-700/50">
						<div className="text-xs text-gray-500 space-y-1">
							{tier.limitations.map((limitation, idx) => (
								<div key={idx} className="flex items-start">
									<span className="text-red-400/50 mr-2 flex-shrink-0">✗</span>
									<span>{limitation}</span>
								</div>
							))}
						</div>
					</div>
				)}

				{/* CTA Button */}
				<div className="mt-auto">
					<m.div
						whileHover={{ scale: 1.02 }}
						whileTap={{ scale: 0.98 }}
						transition={{ duration: 0.2, ease: "easeInOut" }}
					>
						<Button
							asChild
							className={cn(
								"w-full py-3 font-semibold transition-all cursor-pointer",
								tier.cta.variant === "primary"
									? "bg-gradient-to-r from-[#FF6B35] to-[#EF4444] text-white hover:shadow-lg hover:shadow-[#FF6B35]/30 border-transparent"
									: "bg-transparent border-gray-600 text-white hover:border-gray-400 hover:bg-gray-800/50",
							)}
							variant={tier.cta.variant === "primary" ? "primary" : "outline"}
							size="lg"
						>
							<a href={tier.cta.href}>{tier.cta.text}</a>
						</Button>
					</m.div>
				</div>
			</div>
		</m.div>
	);
};
