import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: "class",
	content: [
		"./app/**/*.{ts,tsx,mdx}",
		"./components/**/*.{ts,tsx}",
		"./content/**/*.{md,mdx}",
		"./node_modules/fumadocs-ui/dist/**/*.js",
	],
	theme: {
		extend: {
			fontFamily: {
				sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
			},
			colors: {
				border: "hsl(var(--border))",
			},
		},
	},
	plugins: [],
};

export default config;
