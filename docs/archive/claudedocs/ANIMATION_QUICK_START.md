# Animation Quick Start Guide

**Purpose**: Immediate implementation guide for microinteraction patterns
**Target Audience**: Developers implementing UI enhancements
**Estimated Time**: 2-4 hours for core implementations

---

## 🚀 Priority 1: Motion Utilities (30 minutes)

### Create Motion Library

**File**: `apps/web/modules/ui/lib/motion.ts`

```typescript
"use client";

import { Transition, Variants } from "motion/react";
import { useEffect, useState } from "react";

// Hook: Detect reduced motion preference
export function useReducedMotion(): boolean {
	const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const mediaQuery = window.matchMedia(
			"(prefers-reduced-motion: reduce)"
		);
		setPrefersReducedMotion(mediaQuery.matches);

		const handleChange = (event: MediaQueryListEvent) => {
			setPrefersReducedMotion(event.matches);
		};

		mediaQuery.addEventListener("change", handleChange);
		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	return prefersReducedMotion;
}

// Factory: Create accessible transitions
export function createTransition(options: {
	duration?: number;
	delay?: number;
	ease?: string | number[];
}): Transition {
	const reducedMotion =
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	if (reducedMotion) {
		return { duration: 0 };
	}

	return {
		duration: options.duration ?? 0.3,
		delay: options.delay ?? 0,
		ease: options.ease ?? "easeOut",
	};
}

// Preset: Fade in from below
export const fadeInUp: Variants = {
	initial: { opacity: 0, y: 20 },
	animate: { opacity: 1, y: 0 },
	exit: { opacity: 0, y: -20 },
};

// Preset: Scale in
export const scaleIn: Variants = {
	initial: { scale: 0.95, opacity: 0 },
	animate: { scale: 1, opacity: 1 },
	exit: { scale: 0.95, opacity: 0 },
};

// Preset: Slide in from left
export const slideInLeft: Variants = {
	initial: { x: -20, opacity: 0 },
	animate: { x: 0, opacity: 1 },
	exit: { x: -20, opacity: 0 },
};

// Preset: Slide in from right
export const slideInRight: Variants = {
	initial: { x: 20, opacity: 0 },
	animate: { x: 0, opacity: 1 },
	exit: { x: 20, opacity: 0 },
};

// Constants: Animation durations (milliseconds)
export const DURATION = {
	instant: 0,
	fast: 150,
	normal: 300,
	moderate: 500,
	slow: 800,
} as const;

// Constants: Easing curves
export const EASING = {
	// Apple-style smooth easing
	apple: [0.16, 1, 0.3, 1],
	// Material Design standard
	standard: [0.4, 0.0, 0.2, 1],
	// SnapBack bouncy
	snapback: [0.34, 1.56, 0.64, 1],
} as const;
```

**Usage Example**:

```tsx
import { motion } from "motion/react";
import { fadeInUp, createTransition, DURATION } from "@ui/lib/motion";

export function MyComponent() {
	return (
		<motion.div
			variants={fadeInUp}
			initial="initial"
			animate="animate"
			transition={createTransition({ duration: DURATION.normal })}
		>
			Content
		</motion.div>
	);
}
```

---

## 🎯 Priority 2: Shimmer Button (45 minutes)

### Create Shimmer Button Component

**File**: `apps/web/modules/ui/components/shimmer-button.tsx`

```tsx
"use client";

import { cn } from "@ui/lib";
import { motion } from "motion/react";
import { ButtonHTMLAttributes, forwardRef } from "react";

export interface ShimmerButtonProps
	extends ButtonHTMLAttributes<HTMLButtonElement> {
	shimmerColor?: string;
	shimmerDuration?: string;
	className?: string;
}

const ShimmerButton = forwardRef<HTMLButtonElement, ShimmerButtonProps>(
	(
		{
			shimmerColor = "rgba(255, 255, 255, 0.5)",
			shimmerDuration = "2s",
			className,
			children,
			...props
		},
		ref
	) => {
		return (
			<motion.button
				ref={ref}
				whileHover={{ scale: 1.05 }}
				whileTap={{ scale: 0.95 }}
				transition={{ duration: 0.2, ease: "easeInOut" }}
				style={
					{
						"--shimmer-color": shimmerColor,
						"--shimmer-duration": shimmerDuration,
					} as React.CSSProperties
				}
				className={cn(
					"group relative inline-flex items-center justify-center overflow-hidden",
					"rounded-lg px-6 py-3",
					"bg-snapback-green hover:bg-snapback-green/90",
					"text-white font-medium",
					"transition-all duration-200",
					"focus-visible:outline-none focus-visible:ring-2",
					"focus-visible:ring-snapback-green focus-visible:ring-offset-2",
					"disabled:opacity-50 disabled:cursor-not-allowed",
					className
				)}
				{...props}
			>
				{/* Shimmer overlay */}
				<div
					className="absolute inset-0 overflow-hidden rounded-lg"
					aria-hidden="true"
				>
					<motion.div
						className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent"
						animate={{
							translateX: ["-100%", "100%"],
						}}
						transition={{
							duration: 2,
							repeat: Number.POSITIVE_INFINITY,
							ease: "linear",
						}}
					/>
				</div>

				<span className="relative z-10">{children}</span>
			</motion.button>
		);
	}
);

ShimmerButton.displayName = "ShimmerButton";

export { ShimmerButton };
```

### Add CSS for Reduced Motion

**File**: `apps/web/app/globals.css` (add to end)

```css
/* Shimmer effect accessibility */
@media (prefers-reduced-motion: reduce) {
	.shimmer-button [aria-hidden="true"] > div {
		animation: none !important;
		display: none;
	}
}
```

### Usage in Hero Component

**Update**: `apps/web/modules/marketing/home/components/Hero.tsx`

```tsx
import { ShimmerButton } from "@ui/components/shimmer-button";

// Replace existing Button with ShimmerButton for primary CTA
<ShimmerButton
	asChild
	shimmerColor="rgba(16, 185, 129, 0.5)"
	shimmerDuration="2s"
	className="h-14 rounded-lg px-8 text-lg font-semibold"
>
	<Link href="/auth/signup">
		Get SnapBack Free
		<ArrowRightIcon className="ml-2 size-5" />
	</Link>
</ShimmerButton>;
```

---

## 🔗 Priority 3: Hover Underline Animation (30 minutes)

### Enhanced NavBar Links

**Update**: `apps/web/modules/marketing/shared/components/NavBar.tsx`

Replace lines 148-166 with:

```tsx
{
	menuItems.map((menuItem) => (
		<motion.div
			key={menuItem.href}
			whileHover={{ y: -2 }}
			whileTap={{ y: 0 }}
			className="relative group"
		>
			<LocaleLink
				href={menuItem.href}
				className={cn(
					"text-sm text-white/80 hover:text-white transition-colors duration-200 font-medium",
					"pb-1 relative inline-block",
					isMenuItemActive(menuItem.href)
						? "font-bold text-white"
						: ""
				)}
				prefetch
			>
				{menuItem.label}

				{/* Animated underline */}
				<motion.span
					className="absolute bottom-0 left-0 h-0.5 bg-snapback-green"
					initial={{
						width: isMenuItemActive(menuItem.href) ? "100%" : "0%",
					}}
					whileHover={{ width: "100%" }}
					transition={{ duration: 0.3, ease: "easeOut" }}
					aria-hidden="true"
				/>
			</LocaleLink>
		</motion.div>
	));
}
```

### Alternative: Pure CSS Approach (Lighter Bundle)

```tsx
<LocaleLink
	href={menuItem.href}
	className={cn(
		"text-sm text-white/80 hover:text-white font-medium",
		"pb-1 relative inline-block",
		"after:content-[''] after:absolute after:bottom-0 after:left-0",
		"after:h-0.5 after:bg-snapback-green",
		"after:w-0 hover:after:w-full",
		"after:transition-all after:duration-300 after:ease-out",
		isMenuItemActive(menuItem.href) && "font-bold text-white after:w-full"
	)}
	prefetch
>
	{menuItem.label}
</LocaleLink>
```

---

## ♿ Priority 4: Reduced Motion Support (1 hour)

### Global CSS Fix

**File**: `apps/web/app/globals.css` (add to end)

```css
/* ============================================
   ACCESSIBILITY: Reduced Motion Support
   ============================================ */

@media (prefers-reduced-motion: reduce) {
	/* Disable all animations */
	*,
	*::before,
	*::after {
		animation-duration: 0.01ms !important;
		animation-iteration-count: 1 !important;
		transition-duration: 0.01ms !important;
		scroll-behavior: auto !important;
	}

	/* Disable Framer Motion animations */
	[data-framer-motion] {
		animation: none !important;
		transition: none !important;
	}

	/* Keep hover states but remove transitions */
	button:hover,
	a:hover {
		transition: none !important;
	}

	/* Disable specific animations */
	.animate-pulse,
	.animate-spin,
	.animate-bounce,
	.animate-logo-scroll {
		animation: none !important;
	}

	/* Disable shimmer effects */
	.shimmer-effect {
		display: none !important;
	}

	/* Disable transform animations but keep layout */
	.group-hover\/bento\:translate-x-2 {
		transform: none !important;
	}
}
```

### Root Layout Integration

**File**: `apps/web/app/(marketing)/[locale]/layout.tsx`

```tsx
import { MotionConfig } from "motion/react";
import { useReducedMotion } from "@ui/lib/motion";

export function MarketingLayout({ children }) {
	// This hook will work on client-side
	const shouldReduceMotion = useReducedMotion();

	return (
		<MotionConfig reducedMotion={shouldReduceMotion ? "always" : "never"}>
			{children}
		</MotionConfig>
	);
}
```

### Update Existing Components

**File**: `apps/web/modules/marketing/components/ui/typewriter-effect.tsx`

Add at the beginning of component:

```tsx
import { useReducedMotion } from "@ui/lib/motion";

export const TypewriterEffect = ({
	words,
	className,
}: TypewriterEffectProps) => {
	const reducedMotion = useReducedMotion();
	const [scope, animate] = useAnimate();
	const isInView = useInView(scope);

	useEffect(() => {
		if (!isInView) return;

		// Show instantly if reduced motion
		if (reducedMotion) {
			animate(
				"span",
				{
					display: "inline-block",
					opacity: 1,
					width: "fit-content",
				},
				{ duration: 0 }
			);
			return;
		}

		// Normal animation
		animate(
			"span",
			{
				display: "inline-block",
				opacity: 1,
				width: "fit-content",
			},
			{
				duration: 0.3,
				delay: stagger(0.1),
				ease: "easeInOut",
			}
		);
	}, [isInView, animate, reducedMotion]);

	// ... rest of component
};
```

---

## 🎨 Priority 5: Neon Effects (30 minutes)

### Enhanced CSS Utilities

**File**: `apps/web/app/globals.css` (add to end)

```css
/* ============================================
   NEON EFFECTS
   ============================================ */

/* Neon text effect */
.text-neon {
	color: var(--snapback-green);
	text-shadow: 0 0 10px rgba(16, 185, 129, 0.5), 0 0 20px rgba(16, 185, 129, 0.3),
		0 0 30px rgba(16, 185, 129, 0.2);
}

/* Animated neon pulse */
.text-neon-pulse {
	color: var(--snapback-green);
	animation: neon-pulse 2s ease-in-out infinite;
}

@keyframes neon-pulse {
	0%,
	100% {
		text-shadow: 0 0 10px rgba(16, 185, 129, 0.5), 0 0 20px rgba(16, 185, 129, 0.3);
	}
	50% {
		text-shadow: 0 0 15px rgba(16, 185, 129, 0.7), 0 0 30px rgba(16, 185, 129, 0.5),
			0 0 45px rgba(16, 185, 129, 0.3);
	}
}

/* Enhanced neon card */
.card-neon-enhanced {
	position: relative;
	border: 1px solid rgba(16, 185, 129, 0.2);
	background: rgba(15, 15, 15, 0.7);
	backdrop-filter: blur(12px);
	box-shadow: 0 0 20px rgba(16, 185, 129, 0.1), inset 0 0 20px rgba(255, 255, 255, 0.05);
	transition: all 0.3s ease;
}

.card-neon-enhanced:hover {
	border-color: rgba(16, 185, 129, 0.4);
	box-shadow: 0 0 30px rgba(16, 185, 129, 0.3), 0 0 60px rgba(16, 185, 129, 0.15),
		inset 0 0 30px rgba(255, 255, 255, 0.1);
	transform: translateY(-5px);
}

/* Animated neon border */
.border-neon-animated {
	position: relative;
	border: 1px solid rgba(16, 185, 129, 0.3);
}

.border-neon-animated::before {
	content: "";
	position: absolute;
	inset: -2px;
	border-radius: inherit;
	padding: 2px;
	background: linear-gradient(
		90deg,
		rgba(16, 185, 129, 0.5),
		rgba(16, 185, 129, 0),
		rgba(16, 185, 129, 0.5)
	);
	background-size: 200% 100%;
	mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
	mask-composite: exclude;
	-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(
			#fff 0 0
		);
	-webkit-mask-composite: xor;
	animation: border-flow 3s linear infinite;
	pointer-events: none;
}

@keyframes border-flow {
	0% {
		background-position: 0% 50%;
	}
	100% {
		background-position: 200% 50%;
	}
}

/* Respect reduced motion */
@media (prefers-reduced-motion: reduce) {
	.text-neon-pulse {
		animation: none;
		text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
	}

	.border-neon-animated::before {
		animation: none;
	}

	.card-neon-enhanced {
		transition: none;
	}

	.card-neon-enhanced:hover {
		transform: none;
	}
}
```

### Usage Examples

```tsx
// Neon text
<h2 className="text-neon-pulse text-4xl font-bold">
  SnapBack Protection
</h2>

// Neon card
<div className="card-neon-enhanced rounded-xl p-6">
  <h3 className="text-neon">Feature Title</h3>
  <p>Feature description</p>
</div>

// Animated neon border
<button className="border-neon-animated rounded-lg px-6 py-3">
  Discover More
</button>
```

---

## ⚡ Quick Wins (15 minutes each)

### 1. Add Will-Change for Smooth Animations

**File**: `tailwind.config.ts` (add to theme.extend)

```typescript
theme: {
  extend: {
    // ... existing config
    willChange: {
      transform: "transform",
      opacity: "opacity",
      "transform-opacity": "transform, opacity",
    },
  },
}
```

**Usage**:

```tsx
<motion.div
  className="will-change-transform"
  whileHover={{ scale: 1.05 }}
>
```

### 2. Add Animation Delay Utilities

**File**: `tailwind.config.ts`

```typescript
theme: {
  extend: {
    transitionDelay: {
      '0': '0ms',
      '75': '75ms',
      '100': '100ms',
      '150': '150ms',
      '200': '200ms',
      '300': '300ms',
      '500': '500ms',
      '700': '700ms',
      '1000': '1000ms',
    },
  },
}
```

### 3. Optimize Background Beams for Mobile

**File**: `apps/web/modules/marketing/components/ui/background-beams.tsx`

```tsx
import { useMediaQuery } from "usehooks-ts";

export const BackgroundBeams = React.memo(
	({ className }: { className?: string }) => {
		const isMobile = useMediaQuery("(max-width: 768px)");

		// Reduce paths on mobile for performance
		const pathCount = isMobile ? 10 : 20;
		const paths = useMemo(
			() =>
				// Take only first `pathCount` paths
				allPaths.slice(0, pathCount),
			[pathCount]
		);

		// ... rest of component
	}
);
```

---

## 📊 Performance Checklist

Before deploying animations:

-   [ ] All animations respect `prefers-reduced-motion`
-   [ ] GPU-accelerated properties used (transform, opacity)
-   [ ] No layout-triggering animations (width, height, top, left)
-   [ ] `will-change` added to frequently animated elements
-   [ ] Animation durations ≤ 500ms for UI interactions
-   [ ] Reduced complexity on mobile devices
-   [ ] Lighthouse performance score ≥ 90
-   [ ] Core Web Vitals: CLS < 0.1, LCP < 2.5s
-   [ ] Frame rate maintained at 60fps on desktop
-   [ ] No janky animations during page load

---

## 🧪 Testing Checklist

-   [ ] Visual regression tests for hover states
-   [ ] Keyboard navigation works with animations
-   [ ] Focus states visible and accessible
-   [ ] Reduced motion preference tested in browser
-   [ ] Mobile performance tested on real devices
-   [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
-   [ ] Screen reader compatibility verified
-   [ ] Animation frame rate profiled in DevTools

---

## 🚀 Deployment Steps

1. **Run Tests**

    ```bash
    pnpm test
    pnpm e2e
    ```

2. **Type Check**

    ```bash
    pnpm type-check
    ```

3. **Performance Audit**

    ```bash
    pnpm build
    pnpm start
    # Open Lighthouse in Chrome DevTools
    ```

4. **Accessibility Audit**

    ```bash
    # Run axe DevTools extension
    # Check WCAG 2.1 AA compliance
    ```

5. **Deploy**
    ```bash
    git add .
    git commit -m "feat: add microinteraction patterns with accessibility"
    git push
    ```

---

## 📚 Additional Resources

-   **Full Analysis**: See `MICROINTERACTION_PATTERN_ANALYSIS.md` for detailed breakdown
-   **Framer Motion Docs**: https://www.framer.com/motion/
-   **Accessibility Guide**: https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions
-   **Performance Tips**: https://web.dev/animations-guide/

---

**Next Steps**:

1. Implement motion utilities library (30 min)
2. Add shimmer button to primary CTAs (45 min)
3. Enhance NavBar with underline animation (30 min)
4. Add global reduced motion support (1 hour)
5. Test and validate all animations (1 hour)

**Total Implementation Time**: 3-4 hours for complete enhancement
