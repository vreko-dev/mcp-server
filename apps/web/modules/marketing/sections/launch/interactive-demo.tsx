"use client";

import { siteSpec } from "@marketing/config/site-config";
import { InteractiveEditorDemo } from "@/components/demo/InteractiveEditorDemo";

export function InteractiveDemo() {
	const { interactive_demo } = siteSpec.pages.home.sections;

	return (
		<section id="demo" className="py-24 bg-[#0A0A0A] overflow-hidden">
			<div className="container mx-auto px-4">
				<div className="text-center mb-16 space-y-4">
					<div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-medium uppercase tracking-wider">
						{interactive_demo.content.label}
					</div>
					<h2 className="text-3xl lg:text-5xl font-bold text-white">{interactive_demo.content.headline}</h2>
					<p className="text-lg text-[#A0A0A0] max-w-2xl mx-auto">{interactive_demo.content.description}</p>
				</div>

				{/* Interactive Code Editor Demo */}
				<InteractiveEditorDemo />
			</div>
		</section>
	);
}
