"use client";

import { InteractiveEditorDemo } from "@/components/demo/InteractiveEditorDemo";

export default function SnapBackDemoPage() {
	return (
		<div className="min-h-screen bg-slate-950 p-8">
			<div className="max-w-6xl mx-auto">
				<h1 className="text-3xl font-bold text-white mb-8">Interactive Demo</h1>
				<InteractiveEditorDemo />
			</div>
		</div>
	);
}
