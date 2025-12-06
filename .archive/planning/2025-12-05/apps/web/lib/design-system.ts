// apps/web/lib/design-system.ts
export const snapbackColors = {
	// Primary
	green: {
		DEFAULT: "#00FF41", // Neon/Matrix Green
		light: "#4DFF70",
		dark: "#00B82F",
		glow: "rgba(0, 255, 65, 0.3)",
	},

	// Status
	warning: "#FF6B35",
	danger: "#EF4444",
	success: "#00FF41",

	// Backgrounds (Dark theme only)
	bg: {
		primary: "#0A0A0A",
		secondary: "#111111",
		tertiary: "#1A1A1A",
		elevated: "#262626",
	},

	// Text
	text: {
		primary: "#FAFAFA",
		secondary: "#A1A1AA",
		tertiary: "#71717A",
		muted: "#52525B",
	},

	// Borders
	border: {
		DEFAULT: "#27272A",
		subtle: "#27272A",
		strong: "#3F3F46",
		emphasis: "#52525B",
	},
} as const;

export const typography = {
	// Display (Hero)
	display: {
		xl: "text-7xl md:text-8xl font-bold tracking-tight leading-[0.95]", // 72px/96px
		lg: "text-6xl md:text-7xl font-bold tracking-tight leading-[0.95]", // 60px/72px
		md: "text-5xl md:text-6xl font-bold tracking-tight leading-[1]", // 48px/60px
	},

	// Headings
	h1: "text-4xl md:text-5xl font-bold tracking-tight leading-tight", // 36px/48px
	h2: "text-3xl md:text-4xl font-bold tracking-tight leading-tight", // 30px/36px
	h3: "text-2xl md:text-3xl font-semibold tracking-tight leading-snug", // 24px/30px
	h4: "text-xl md:text-2xl font-semibold leading-snug", // 20px/24px

	// Body
	body: {
		lg: "text-lg leading-relaxed", // 18px
		DEFAULT: "text-base leading-normal", // 16px
		sm: "text-sm leading-normal", // 14px
		xs: "text-xs leading-tight", // 12px
	},

	// Code/Mono
	mono: "font-mono text-sm",
} as const;

export const spacing = {
	section: {
		sm: "py-16 md:py-20", // 64px/80px
		md: "py-20 md:py-28", // 80px/112px
		lg: "py-28 md:py-36", // 112px/144px
		xl: "py-36 md:py-48", // 144px/192px
	},

	container: {
		sm: "max-w-4xl", // 896px
		md: "max-w-5xl", // 1024px
		lg: "max-w-6xl", // 1152px
		xl: "max-w-7xl", // 1280px
	},

	gap: {
		xs: "gap-2", // 8px
		sm: "gap-4", // 16px
		md: "gap-6", // 24px
		lg: "gap-8", // 32px
		xl: "gap-12", // 48px
	},
} as const;
