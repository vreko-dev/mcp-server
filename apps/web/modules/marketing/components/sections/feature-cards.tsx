"use client";

import { BentoGrid, BentoGridItem } from "@marketing/components/ui/bento-grid";
import { useContent } from "@marketing/hooks/use-content";
import { m } from "motion/react";
import { useEffect, useState } from "react";

function getFeatureIcon(iconName: string) {
	switch (iconName) {
		case "radar":
			return (
				<m.div
					animate={{ rotate: 360 }}
					transition={{
						duration: 4,
						repeat: Number.POSITIVE_INFINITY,
						ease: "linear",
					}}
					className="text-[#00FF41] text-2xl"
				>
					📡
				</m.div>
			);
		case "shield":
			return (
				<m.div
					animate={{ scale: [1, 1.1, 1] }}
					transition={{
						duration: 2,
						repeat: Number.POSITIVE_INFINITY,
					}}
					className="text-[#10B981] text-2xl"
				>
					🛡️
				</m.div>
			);
		case "rewind":
			return (
				<m.div
					animate={{ rotate: [0, -360] }}
					transition={{
						duration: 3,
						repeat: Number.POSITIVE_INFINITY,
						ease: "easeInOut",
					}}
					className="text-[#FF6B35] text-2xl"
				>
					⏮️
				</m.div>
			);
		default:
			return <div className="text-2xl">⚡</div>;
	}
}

export function FeatureCards() {
	const content = useContent();
	const [isMounted, setIsMounted] = useState(false);

	// Set mounted state after component mounts
	useEffect(() => {
		setIsMounted(true);
	}, []);

	return (
		<section id="features" className="py-20 px-4 bg-gradient-to-b from-slate-900 to-black">
			<div className="max-w-7xl mx-auto">
				<m.div
					initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					className="text-center mb-16"
				>
					<h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
						Three Lines of{" "}
						<span className="bg-gradient-to-r from-[#00FF41] to-[#10B981] bg-clip-text text-transparent">
							Defense
						</span>
					</h2>
					<p className="text-xl text-gray-300 max-w-3xl mx-auto">
						Every AI action triggers our protection protocol. Detection, checkpoint, recovery.
					</p>
				</m.div>

				<BentoGrid className="max-w-4xl mx-auto">
					{content.features.core.map((feature, index) => (
						<m.div
							key={feature.name}
							initial={isMounted ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true }}
							transition={{ delay: index * 0.2 }}
						>
							<BentoGridItem
								title={feature.name}
								description={feature.description}
								header={
									<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 relative overflow-hidden">
										<div className="absolute inset-0 flex items-center justify-center">
											{getFeatureIcon(feature.icon)}
										</div>

										{/* Animated grid background */}
										<div className="absolute inset-0 bg-[url('/ui/grid.svg')] bg-center opacity-20" />

										{/* Glow effect based on feature */}
										<div
											className="absolute inset-0 opacity-20"
											style={{
												background: `radial-gradient(circle at center, ${
													feature.icon === "radar"
														? "#00FF41"
														: feature.icon === "shield"
															? "#10B981"
															: "#FF6B35"
												} 0%, transparent 70%)`,
											}}
										/>
									</div>
								}
								icon={
									<div className="space-y-2">
										<div className="flex items-center gap-2 text-sm text-green-400 font-mono">
											<span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
											{feature.proof}
										</div>
									</div>
								}
								className="transition-all duration-300 hover:border-opacity-50"
							/>
						</m.div>
					))}
				</BentoGrid>
			</div>
		</section>
	);
}
