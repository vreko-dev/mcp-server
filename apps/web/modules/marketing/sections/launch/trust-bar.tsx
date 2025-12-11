"use client";

export function TrustBar() {
	return (
		<section className="relative py-12 border-y border-[#222222] bg-[#0A0A0A]">
			<div className="container mx-auto px-4">
				<div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12">
					{/* AI Tool Logos */}
					<div className="flex items-center justify-center gap-4 flex-wrap">
						<span className="text-xs font-semibold text-[#A0A0A0] uppercase tracking-wider">
							Works with:
						</span>
						<div className="flex items-center gap-3">
							{/* Cursor */}
							<div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10">
								<span className="text-[10px] font-semibold text-white">⌘ Cursor</span>
							</div>
							{/* Copilot */}
							<div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10">
								<span className="text-[10px] font-semibold text-white">🤖 Copilot</span>
							</div>
							{/* Claude */}
							<div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10">
								<span className="text-[10px] font-semibold text-white">✨ Claude</span>
							</div>
							{/* Windsurf */}
							<div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/5 border border-white/10">
								<span className="text-[10px] font-semibold text-white">🌬️ Windsurf</span>
							</div>
						</div>
					</div>

					<div className="w-px h-8 bg-[#222222] hidden md:block" />

					{/* Stats */}
					<div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
						<div className="flex items-center gap-2">
							<span className="text-white font-semibold">2,847</span>
							<span className="text-[#A0A0A0] text-sm">Developers</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-white font-semibold">12,453</span>
							<span className="text-[#A0A0A0] text-sm">Restores/month</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-white font-semibold">&lt;200ms</span>
							<span className="text-[#A0A0A0] text-sm">Recovery</span>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
