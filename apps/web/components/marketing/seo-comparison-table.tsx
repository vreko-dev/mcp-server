"use client";

// Comparison data structured for both visual display and Schema markup
const comparisons = [
	{
		feature: "Automatic Snapshots",
		git: { value: false, note: "Requires manual commits" },
		snapback: { value: true, note: "Every save captured automatically" },
	},
	{
		feature: "AI Activity Detection",
		git: { value: false, note: "No awareness of AI tools" },
		snapback: { value: true, note: "Detects Copilot, Cursor, Claude" },
	},
	{
		feature: "Instant Restore (<1 second)",
		git: { value: false, note: "Requires checkout/reset commands" },
		snapback: { value: true, note: "One-click restore, 200ms average" },
	},
	{
		feature: "Pre-AI-Change Protection",
		git: { value: false, note: "No proactive safety net" },
		snapback: { value: true, note: "Checkpoint before AI edits" },
	},
	{
		feature: "Visual Diff Preview",
		git: { value: true, note: "Via CLI or external tools" },
		snapback: { value: true, note: "Built-in VS Code diff viewer" },
	},
	{
		feature: "Storage Location",
		git: { value: "Repository", note: ".git directory" },
		snapback: { value: "Local", note: "Private .snapback directory" },
	},
	{
		feature: "Works Offline",
		git: { value: true, note: "Local repository" },
		snapback: { value: true, note: "All snapshots stored locally" },
	},
	{
		feature: "Guardian Security Scan",
		git: { value: false, note: "No built-in security analysis" },
		snapback: { value: true, note: "Detects secrets, mocks, phantom deps" },
	},
	{
		feature: "Learning Curve",
		git: { value: "High", note: "Complex commands, concepts" },
		snapback: { value: "Zero", note: "Automatic, no commands needed" },
	},
	{
		feature: "Purpose",
		git: { value: "Version Control", note: "Collaborative development" },
		snapback: { value: "Safety Net", note: "Personal code protection" },
	},
];

export function ComparisonTable() {
	// Schema.org comparison structured data
	const schemaData = {
		"@context": "https://schema.org",
		"@type": "ComparisonTable",
		name: "SnapBack vs Git Comparison",
		description:
			"Feature comparison between SnapBack code protection and Git version control for VS Code developers",
	};

	return (
		<section className="py-20 bg-black">
			{/* Schema markup */}
			<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }} />

			<div className="container mx-auto px-4">
				<div className="max-w-5xl mx-auto">
					{/* Header */}
					<div className="text-center mb-12">
						<h2 className="text-4xl font-bold mb-4">SnapBack vs Git: What's the Difference?</h2>
						<p className="text-xl text-zinc-400 max-w-2xl mx-auto">
							Git is for version control. SnapBack is for instant protection. They work together—SnapBack
							protects you <em>before</em> you commit.
						</p>
					</div>

					{/* Comparison Table */}
					<div className="bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden">
						{/* Table Header */}
						<div className="grid grid-cols-3 gap-4 p-6 border-b border-zinc-800 bg-zinc-900">
							<div className="text-zinc-500 text-sm font-medium">Feature</div>
							<div className="text-center">
								<div className="text-lg font-semibold text-zinc-400">Git</div>
								<div className="text-xs text-zinc-600">Version Control</div>
							</div>
							<div className="text-center">
								<div className="text-lg font-semibold text-emerald-400">SnapBack</div>
								<div className="text-xs text-emerald-700">AI Protection</div>
							</div>
						</div>

						{/* Table Rows */}
						<div className="divide-y divide-zinc-800">
							{comparisons.map((comparison, index) => (
								<div
									key={index}
									className="grid grid-cols-3 gap-4 p-6 hover:bg-zinc-900/50 transition-colors"
								>
									{/* Feature Name */}
									<div>
										<div className="font-medium text-white mb-1">{comparison.feature}</div>
									</div>

									{/* Git Column */}
									<div className="text-center">
										{typeof comparison.git.value === "boolean" ? (
											<div className="flex flex-col items-center gap-2">
												{comparison.git.value ? (
													<svg
														className="w-6 h-6 text-emerald-500"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
															clipRule="evenodd"
														/>
													</svg>
												) : (
													<svg
														className="w-6 h-6 text-zinc-600"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
															clipRule="evenodd"
														/>
													</svg>
												)}
												<span className="text-xs text-zinc-500">{comparison.git.note}</span>
											</div>
										) : (
											<div className="flex flex-col items-center gap-2">
												<span className="text-white font-medium">{comparison.git.value}</span>
												<span className="text-xs text-zinc-500">{comparison.git.note}</span>
											</div>
										)}
									</div>

									{/* SnapBack Column */}
									<div className="text-center">
										{typeof comparison.snapback.value === "boolean" ? (
											<div className="flex flex-col items-center gap-2">
												{comparison.snapback.value ? (
													<svg
														className="w-6 h-6 text-emerald-500"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
															clipRule="evenodd"
														/>
													</svg>
												) : (
													<svg
														className="w-6 h-6 text-zinc-600"
														fill="currentColor"
														viewBox="0 0 20 20"
													>
														<path
															fillRule="evenodd"
															d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
															clipRule="evenodd"
														/>
													</svg>
												)}
												<span className="text-xs text-zinc-500">
													{comparison.snapback.note}
												</span>
											</div>
										) : (
											<div className="flex flex-col items-center gap-2">
												<span className="text-emerald-400 font-medium">
													{comparison.snapback.value}
												</span>
												<span className="text-xs text-zinc-500">
													{comparison.snapback.note}
												</span>
											</div>
										)}
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Bottom CTA */}
					<div className="mt-12 text-center">
						<div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 inline-block">
							<p className="text-lg text-zinc-400 mb-4">
								<strong className="text-white">TL;DR:</strong> Keep using Git for commits. Add SnapBack
								for instant protection.
							</p>
							<button className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-black font-semibold rounded-xl transition-colors">
								Get Protected Now →
							</button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

// Alternative: Simple Markdown table for docs/blog posts
export const ComparisonMarkdown = `
## SnapBack vs Git: Feature Comparison

| Feature | Git | SnapBack |
|---------|-----|----------|
| **Automatic Snapshots** | ❌ Requires manual commits | ✅ Every save captured |
| **AI Activity Detection** | ❌ No AI awareness | ✅ Detects Copilot, Cursor, Claude |
| **Instant Restore** | ❌ Requires commands | ✅ One-click, <1 second |
| **Pre-AI Protection** | ❌ No proactive safety | ✅ Checkpoint before AI edits |
| **Guardian Security** | ❌ No built-in scanning | ✅ Detects secrets, mocks, deps |
| **Learning Curve** | High (commands, concepts) | Zero (automatic) |
| **Purpose** | Version control | Personal safety net |

**Bottom line:** Git is for commits. SnapBack is for instant protection. They work together.
`;
