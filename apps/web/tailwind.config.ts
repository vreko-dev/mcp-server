import type { Config } from "tailwindcss";

const config: Config = {
	content: [
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"./modules/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/**/*.{js,ts,jsx,tsx,mdx}",
	],

	darkMode: "class",

	theme: {
		container: {
			center: true,
			padding: {
				DEFAULT: "1rem",
				sm: "2rem",
				lg: "4rem",
				xl: "5rem",
				"2xl": "6rem",
			},
			screens: {
				sm: "640px",
				md: "768px",
				lg: "1024px",
				xl: "1280px",
				"2xl": "1536px",
			},
		},

		extend: {
			colors: {
				// SnapBack brand colors (as direct values)
				"snapback-green": "#00FF41",
				"snapback-orange": "#FF9500",
				"snapback-dark": "#111111", // Card background
				"snapback-surface": "#1A1A1A", // Surface background

				// Semantic colors using CSS variables
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",

				// Extended SnapBack color palette with semantic variants
				green: {
					DEFAULT: "#00FF41",
					50: "#E6FFF1",
					100: "#B3FFD4",
					200: "#80FFB8",
					300: "#4DFF9C",
					400: "#1AFF80",
					500: "#00FF41", // Brand green
					600: "#00CC34",
					700: "#009927",
					800: "#00661A",
					900: "#00330D",
					light: "#4DFF70",
					dark: "#00B82F",
				},
				orange: {
					DEFAULT: "#FF9500",
					50: "#FFF4E6",
					100: "#FFE0B3",
					200: "#FFCC80",
					300: "#FFB84D",
					400: "#FFA41A",
					500: "#FF9500", // Brand orange
					600: "#CC7700",
					700: "#995900",
					800: "#663B00",
					900: "#331E00",
				},
				// Protection level colors (matching CSS vars)
				protection: {
					watched: "hsl(var(--hat-watched))", // #10b981
					protected: "hsl(var(--hat-protected))", // #fbbf24
					critical: "hsl(var(--hat-critical))", // #ef4444
				},
				// Alias for semantic use (maps to critical red)
				error: "hsl(var(--hat-critical))", // #ef4444 - bright red for highlights
			},

			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},

			fontFamily: {
				sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
				mono: ["var(--font-geist-mono)", "monospace"],
			},

			fontSize: {
				// Display sizes (hero headlines)
				"display-1": [
					"clamp(2.5rem, 5vw, 4rem)",
					{
						lineHeight: "1.2",
						letterSpacing: "-0.02em",
						fontWeight: "700",
					},
				],
				"display-2": [
					"clamp(2rem, 4vw, 3rem)",
					{
						lineHeight: "1.25",
						letterSpacing: "-0.015em",
						fontWeight: "700",
					},
				],
				// Heading sizes (section titles)
				"heading-1": [
					"clamp(1.75rem, 3.5vw, 2.5rem)",
					{
						lineHeight: "1.3",
						letterSpacing: "-0.01em",
						fontWeight: "600",
					},
				],
				"heading-2": [
					"clamp(1.5rem, 3vw, 2rem)",
					{
						lineHeight: "1.35",
						letterSpacing: "-0.005em",
						fontWeight: "600",
					},
				],
				"heading-3": [
					"clamp(1.25rem, 2.5vw, 1.5rem)",
					{
						lineHeight: "1.4",
						fontWeight: "600",
					},
				],
				// Body text
				"body-xl": [
					"clamp(1.125rem, 2.25vw, 1.25rem)",
					{
						lineHeight: "1.6",
						fontWeight: "400",
					},
				],
				"body-lg": [
					"clamp(1rem, 2vw, 1.125rem)",
					{
						lineHeight: "1.6",
						fontWeight: "400",
					},
				],
				body: [
					"1rem",
					{
						lineHeight: "1.6",
						fontWeight: "400",
					},
				],
				"body-sm": [
					"0.875rem",
					{
						lineHeight: "1.5",
						fontWeight: "400",
					},
				],
				// UI text
				caption: [
					"0.75rem",
					{
						lineHeight: "1.4",
						fontWeight: "500",
					},
				],
				overline: [
					"0.6875rem",
					{
						lineHeight: "1.3",
						letterSpacing: "0.08em",
						fontWeight: "600",
					},
				],
			},

			backgroundImage: {
				"gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
				"gradient-conic":
					"conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
			},

			keyframes: {
				"accordion-down": {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				"accordion-up": {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
			},

			animation: {
				"accordion-down": "accordion-down 0.2s ease-out",
				"accordion-up": "accordion-up 0.2s ease-out",
			},
		},
	},

	plugins: [require("tailwindcss-animate")],
};

export default config;
