"use client";

export function TrustBar() {
	return (
		<section className="relative py-12 border-y border-[#222222] bg-[#0A0A0A]">
			<div className="container mx-auto px-4">
				<div className="flex flex-wrap items-center justify-center gap-8 text-sm">
					{/* Metrics */}
					<div className="flex items-center gap-2">
						<span className="text-2xl">⭐</span>
						<span className="text-white font-semibold">★ 4.5k</span>
						<span className="text-[#A0A0A0]">on GitHub</span>
					</div>

					<div className="w-px h-6 bg-[#222222]" />

					<div className="flex items-center gap-2">
						<span className="text-[#FF9500]">🚀</span>
						<span className="text-white font-semibold">Y Combinator</span>
						<span className="text-[#A0A0A0]">W25</span>
					</div>

					<div className="w-px h-6 bg-[#222222]" />

					<div className="flex items-center gap-2">
						<span className="text-[#34D399]">✓</span>
						<span className="text-white font-semibold">Works with Cursor</span>
						<span className="text-[#A0A0A0]">& VS Code</span>
					</div>

					<div className="w-px h-6 bg-[#222222]" />

					{/* Testimonial */}
					<div className="flex items-center gap-2 max-w-md">
						<span className="text-[#A0A0A0]">
							&quot;Cursor rewrote my config. SnapBack recovered it in 3 seconds.&quot;
						</span>
						<span className="text-[#34D399]">@brent_redd</span>
					</div>
				</div>
			</div>
		</section>
	);
}
