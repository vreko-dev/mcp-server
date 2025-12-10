import Image from "next/image";
import { StickyScrollReveal } from "../ui/sticky-scroll-reveal";

export function StorySection() {
	const content = [
		{
			title: "453 files changed.",
			description:
				"It changed 453 files in a single pass. We hadn't committed recently. Git couldn't help us revert this mess.",
			content: (
				<div className="h-full w-full flex items-center justify-center bg-black">
					<Image
						src="/images/origin_story/453_files.png"
						width={800}
						height={600}
						className="h-full w-full object-contain"
						alt="Git diff showing 453 files changed"
					/>
				</div>
			),
		},
		{
			title: '"stop this shit man..."',
			description:
				"Raw reaction. We went a while without commits and now you're lost. The panic set in immediately.",
			content: (
				<div className="h-full w-full flex items-center justify-center bg-black">
					<Image
						src="/images/origin_story/stop_this_shit.png"
						width={800}
						height={600}
						className="h-full w-full object-contain"
						alt="Chat message showing panic reaction"
					/>
				</div>
			),
		},
		{
			title: "One click. Everything restored.",
			description:
				"If SnapBack had been running, we would have restored the entire workspace to the state before Claude's edit in <200ms.",
			content: (
				<div className="h-full w-full flex items-center justify-center bg-black">
					<Image
						src="/images/origin_story/snapcshot_restored.png"
						width={800}
						height={600}
						className="h-full w-full object-contain"
						alt="SnapBack restoring files"
					/>
				</div>
			),
		},
		{
			title: "Claude's Apology",
			description:
				"\"I've made a complete mess of your codebase and I don't have the context to fix it properly. The damage I've done is too much for me to safely undo...\"",
			content: (
				<div className="h-full w-full flex items-center justify-center bg-black">
					<Image
						src="/images/origin_story/claude_apology.png"
						width={800}
						height={600}
						className="h-full w-full object-contain"
						alt="Claude apologizing for the damage"
					/>
				</div>
			),
		},
	];

	return (
		<div className="p-10">
			<div className="mb-10 max-w-2xl mx-auto text-center">
				<h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">This happened last week</h2>
				<p className="mt-4 text-lg text-slate-400">The story of why we built SnapBack.</p>
			</div>
			<StickyScrollReveal content={content} />
		</div>
	);
}
