export default {
	project: {
		link: "https://github.com/MarcelleLabs/snapback.dev",
	},
	docsRepositoryBase: "https://github.com/MarcelleLabs/snapback.dev",
	titleSuffix: " – SnapBack Documentation",
	navigation: true,
	darkMode: true,
	footer: {
		text: `MIT ${new Date().getFullYear()} © SnapBack by Marcelle Labs`,
		copyright: (
			<>
				<p>AI-aware code protection. Automatic checkpoints. Instant recovery.</p>
				<p className="mt-2 text-sm text-gray-500">
					SnapBack helps developers safely experiment with AI coding assistants while preserving the ability
					to roll back changes.
				</p>
			</>
		),
	},
	editLink: {
		text: "Edit this page on GitHub",
	},
	logo: (
		<>
			<span className="font-bold">🧢 SnapBack</span>
		</>
	),
	head: (
		<>
			<meta name="viewport" content="width=device-width, initial-scale=1.0" />
			<meta
				name="description"
				content="SnapBack: AI-safe code snapshots with intelligent risk detection and seamless reversal"
			/>
			<meta name="og:title" content="SnapBack Documentation - AI-safe code snapshots" />
			<meta
				name="og:description"
				content="Protect your code from AI coding assistants with automatic snapshots, intelligent risk detection, and instant recovery."
			/>
		</>
	),
	search: {
		placeholder: "Search documentation...",
	},
	nextThemes: {
		defaultTheme: "dark",
	},
	// Define primary brand color
	themeColor: "#10B981", // Use accessible green (#10B981)
};
