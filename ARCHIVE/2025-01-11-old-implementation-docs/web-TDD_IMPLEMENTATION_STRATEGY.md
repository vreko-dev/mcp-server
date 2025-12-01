# TDD Implementation Strategy: SnapBack Marketing Site Refactor

**Project**: SnapBack Marketing Site Component Development
**Stack**: Next.js 15, React 19, TypeScript, Vitest, Testing Library, jest-axe
**Pattern**: Red-Green-Refactor TDD Approach
**Target**: HatSystemSection, TeamConfigSection, RecoverySection

---

## 1. EXECUTIVE SUMMARY

### 1.1 Strategic Approach

This document defines a systematic, test-driven development workflow for implementing three marketing sections following strict TDD discipline. Each component will progress through Red → Green → Refactor cycles with comprehensive test coverage (>90%), performance targets (LCP <2.5s, CLS <0.1), and WCAG AA compliance.

### 1.2 Success Criteria

-   ✅ All tests written before implementation
-   ✅ Test coverage >90% (statements, branches, functions, lines)
-   ✅ Zero accessibility violations (jest-axe)
-   ✅ Performance targets met (60fps animations, <100ms interactions)
-   ✅ Production-ready code quality
-   ✅ Zero TypeScript errors

---

## 2. TESTING INFRASTRUCTURE SETUP

### 2.1 Directory Structure

```
apps/web/
├── __tests__/
│   ├── components/
│   │   └── sections/
│   │       ├── HatSystemSection.test.tsx
│   │       ├── TeamConfigSection.test.tsx
│   │       └── RecoverySection.test.tsx
│   ├── fixtures/
│   │   ├── protection-levels.ts
│   │   ├── team-configs.ts
│   │   └── recovery-scenarios.ts
│   ├── helpers/
│   │   ├── render.tsx
│   │   ├── animation-helpers.ts
│   │   ├── accessibility-helpers.ts
│   │   └── performance-helpers.ts
│   └── mocks/
│       ├── framer-motion.ts
│       ├── next-navigation.ts
│       └── intersection-observer.ts
├── modules/marketing/components/sections/
│   ├── hat-system-section.tsx
│   ├── team-config-section.tsx
│   └── recovery-section.tsx
└── vitest.config.ts (already exists)
```

### 2.2 Test Infrastructure Files

#### 2.2.1 Custom Render Function

**File**: `__tests__/helpers/render.tsx`

```typescript
import { render, RenderOptions } from "@testing-library/react";
import { ReactElement } from "react";
import { ThemeProvider } from "next-themes";

// Provider wrapper with all necessary context
function AllTheProviders({ children }: { children: React.ReactNode }) {
	return (
		<ThemeProvider attribute="class" defaultTheme="dark">
			{children}
		</ThemeProvider>
	);
}

// Custom render with providers
export function renderWithProviders(
	ui: ReactElement,
	options?: Omit<RenderOptions, "wrapper">
) {
	return render(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export everything
export * from "@testing-library/react";
export { renderWithProviders as render };
```

#### 2.2.2 Animation Testing Helpers

**File**: `__tests__/helpers/animation-helpers.ts`

```typescript
import { waitFor } from "@testing-library/react";

/**
 * Wait for framer-motion animations to complete
 * Default timeout matches SNAP_TRANSITIONS.entrance (600ms)
 */
export async function waitForAnimation(timeout = 700) {
	await waitFor(() => {}, { timeout });
}

/**
 * Check if element has motion properties applied
 */
export function hasMotionProps(element: HTMLElement): boolean {
	const style = window.getComputedStyle(element);
	return (
		style.transform !== "none" ||
		style.opacity !== "1" ||
		style.transition !== ""
	);
}

/**
 * Verify reduced motion fallback is applied
 */
export function verifyReducedMotion(element: HTMLElement) {
	const style = window.getComputedStyle(element);
	// Should have no transitions in reduced motion mode
	expect(style.transitionDuration).toBe("0s");
}

/**
 * Mock matchMedia for reduced motion testing
 */
export function mockReducedMotion(matches: boolean) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query) => ({
			matches:
				query === "(prefers-reduced-motion: reduce)" ? matches : false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
}
```

#### 2.2.3 Accessibility Testing Helpers

**File**: `__tests__/helpers/accessibility-helpers.ts`

```typescript
import { axe, toHaveNoViolations } from "jest-axe";
import { RenderResult } from "@testing-library/react";

// Extend Jest matchers
expect.extend(toHaveNoViolations);

/**
 * Run accessibility audit on rendered component
 */
export async function testAccessibility(container: HTMLElement) {
	const results = await axe(container);
	expect(results).toHaveNoViolations();
}

/**
 * Verify ARIA attributes for interactive elements
 */
export function verifyARIALabels(element: HTMLElement) {
	// Check for aria-label or aria-labelledby
	const hasLabel =
		element.hasAttribute("aria-label") ||
		element.hasAttribute("aria-labelledby");

	expect(hasLabel).toBe(true);
}

/**
 * Verify keyboard navigation support
 */
export function verifyKeyboardNavigation(element: HTMLElement) {
	// Interactive elements should be keyboard accessible
	const tabIndex = element.getAttribute("tabindex");
	const isNativelyFocusable = ["BUTTON", "A", "INPUT"].includes(
		element.tagName
	);

	expect(
		isNativelyFocusable || (tabIndex !== null && parseInt(tabIndex) >= 0)
	).toBe(true);
}

/**
 * Verify focus management
 */
export async function testFocusTrap(container: HTMLElement) {
	const focusableElements = container.querySelectorAll(
		'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
	);

	expect(focusableElements.length).toBeGreaterThan(0);

	// All focusable elements should be within container
	focusableElements.forEach((el) => {
		expect(container.contains(el)).toBe(true);
	});
}
```

#### 2.2.4 Performance Testing Helpers

**File**: `__tests__/helpers/performance-helpers.ts`

```typescript
/**
 * Measure component render time
 */
export async function measureRenderTime(renderFn: () => void): Promise<number> {
	const startTime = performance.now();
	renderFn();
	const endTime = performance.now();
	return endTime - startTime;
}

/**
 * Verify render time is within budget
 */
export function expectRenderTimeWithinBudget(
	renderTime: number,
	budgetMs: number = 16.67 // 60fps frame budget
) {
	expect(renderTime).toBeLessThan(budgetMs);
}

/**
 * Mock IntersectionObserver for lazy loading tests
 */
export function mockIntersectionObserver() {
	const mockIntersectionObserver = vi.fn();
	mockIntersectionObserver.mockReturnValue({
		observe: () => null,
		unobserve: () => null,
		disconnect: () => null,
	});

	window.IntersectionObserver = mockIntersectionObserver as any;
}
```

### 2.3 Test Data Fixtures

#### 2.3.1 Protection Levels Fixture

**File**: `__tests__/fixtures/protection-levels.ts`

```typescript
export interface ProtectionLevel {
	id: string;
	name: string;
	description: string;
	icon: string;
	color: string;
	features: string[];
	example: string;
}

export const protectionLevels: ProtectionLevel[] = [
	{
		id: "basic",
		name: "Basic Protection",
		description: "Essential protection for individual developers",
		icon: "shield",
		color: "blue",
		features: [
			"Automatic checkpoints before AI changes",
			"One-click recovery",
			"Visual file timeline",
			"7-day history retention",
		],
		example: "Perfect for solo developers using AI assistants",
	},
	{
		id: "team",
		name: "Team Protection",
		description: "Coordinated protection for development teams",
		icon: "shield-check",
		color: "green",
		features: [
			"Everything in Basic",
			"Team-wide checkpoints",
			"Shared recovery points",
			"30-day history retention",
			"Conflict resolution",
		],
		example: "Ideal for teams of 2-10 developers",
	},
	{
		id: "enterprise",
		name: "Enterprise Protection",
		description: "Advanced protection with compliance and governance",
		icon: "shield-star",
		color: "purple",
		features: [
			"Everything in Team",
			"Compliance audit logs",
			"Custom retention policies",
			"Priority support",
			"SSO integration",
		],
		example: "Built for organizations with 10+ developers",
	},
];

export const mockProtectionLevel = (
	overrides?: Partial<ProtectionLevel>
): ProtectionLevel => ({
	...protectionLevels[0],
	...overrides,
});
```

#### 2.3.2 Team Configs Fixture

**File**: `__tests__/fixtures/team-configs.ts`

```typescript
export interface TeamConfig {
	id: string;
	name: string;
	size: string;
	checkpointStrategy: string;
	retentionDays: number;
	features: string[];
}

export const teamConfigs: TeamConfig[] = [
	{
		id: "startup",
		name: "Startup Team",
		size: "2-5 developers",
		checkpointStrategy: "On every AI change",
		retentionDays: 14,
		features: [
			"Shared checkpoints",
			"Team timeline view",
			"Slack notifications",
		],
	},
	{
		id: "growth",
		name: "Growth Team",
		size: "6-15 developers",
		checkpointStrategy: "Smart detection + Manual",
		retentionDays: 30,
		features: [
			"Everything in Startup",
			"Advanced conflict resolution",
			"Custom checkpoint rules",
			"API access",
		],
	},
	{
		id: "enterprise",
		name: "Enterprise",
		size: "15+ developers",
		checkpointStrategy: "Policy-driven automation",
		retentionDays: 90,
		features: [
			"Everything in Growth",
			"SSO integration",
			"Compliance reports",
			"Dedicated support",
		],
	},
];
```

#### 2.3.3 Recovery Scenarios Fixture

**File**: `__tests__/fixtures/recovery-scenarios.ts`

```typescript
export interface RecoveryScenario {
	id: string;
	title: string;
	problem: string;
	solution: string;
	timeSaved: string;
	severity: "low" | "medium" | "high" | "critical";
}

export const recoveryScenarios: RecoveryScenario[] = [
	{
		id: "dependency-corruption",
		title: "Dependency Corruption",
		problem:
			'AI assistant "optimized" package.json, breaking production build',
		solution: "One-click rollback to pre-AI checkpoint",
		timeSaved: "3.7 hours",
		severity: "critical",
	},
	{
		id: "config-overwrite",
		title: "Config File Overwrite",
		problem: "AI rewrote webpack config with incompatible settings",
		solution: "Restore previous config from checkpoint",
		timeSaved: "2.1 hours",
		severity: "high",
	},
	{
		id: "logic-regression",
		title: "Logic Regression",
		problem: "AI refactored working code with subtle bugs",
		solution: "Compare checkpoints and restore working version",
		timeSaved: "1.5 hours",
		severity: "medium",
	},
];
```

### 2.4 Common Mocks

#### 2.4.1 Framer Motion Mock

**File**: `__tests__/mocks/framer-motion.ts`

```typescript
import { vi } from "vitest";

// Mock framer-motion for testing
export const mockFramerMotion = () => {
	vi.mock("motion/react", () => ({
		motion: {
			div: ({ children, ...props }: any) => (
				<div {...props}>{children}</div>
			),
			section: ({ children, ...props }: any) => (
				<section {...props}>{children}</section>
			),
			h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
			p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
			button: ({ children, ...props }: any) => (
				<button {...props}>{children}</button>
			),
		},
		AnimatePresence: ({ children }: any) => <div>{children}</div>,
		useInView: () => true,
		useReducedMotion: () => false,
	}));
};
```

---

## 3. COMPONENT-SPECIFIC TDD WORKFLOWS

### 3.1 HatSystemSection: TDD Workflow

#### 3.1.1 Red Phase: Write Failing Tests

**Test File**: `__tests__/components/sections/HatSystemSection.test.tsx`

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, within } from "@/__tests__/helpers/render";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { HatSystemSection } from "@/modules/marketing/components/sections/hat-system-section";
import { protectionLevels } from "@/__tests__/fixtures/protection-levels";
import {
	waitForAnimation,
	mockReducedMotion,
	verifyReducedMotion,
} from "@/__tests__/helpers/animation-helpers";
import { testAccessibility } from "@/__tests__/helpers/accessibility-helpers";
import { mockIntersectionObserver } from "@/__tests__/helpers/performance-helpers";

describe("HatSystemSection", () => {
	beforeEach(() => {
		mockIntersectionObserver();
	});

	// ===== RENDERING TESTS =====

	describe("Rendering", () => {
		it("renders the section with correct heading", () => {
			render(<HatSystemSection />);

			expect(
				screen.getByRole("heading", { name: /protection levels/i })
			).toBeInTheDocument();
		});

		it("renders all three protection levels", () => {
			render(<HatSystemSection />);

			protectionLevels.forEach((level) => {
				expect(screen.getByText(level.name)).toBeInTheDocument();
				expect(screen.getByText(level.description)).toBeInTheDocument();
			});
		});

		it("displays protection level icons", () => {
			render(<HatSystemSection />);

			// Icons should be present (check by role or data-testid)
			const icons = screen.getAllByRole("img", { hidden: true });
			expect(icons.length).toBeGreaterThanOrEqual(3);
		});

		it("shows feature lists for each protection level", () => {
			render(<HatSystemSection />);

			protectionLevels.forEach((level) => {
				level.features.forEach((feature) => {
					expect(screen.getByText(feature)).toBeInTheDocument();
				});
			});
		});

		it("renders call-to-action buttons", () => {
			render(<HatSystemSection />);

			const ctaButtons = screen.getAllByRole("button", {
				name: /learn more|get started/i,
			});
			expect(ctaButtons.length).toBeGreaterThan(0);
		});
	});

	// ===== INTERACTION TESTS =====

	describe("Interactions", () => {
		it("expands protection level details on click", async () => {
			const user = userEvent.setup();
			render(<HatSystemSection />);

			// Find expandable card
			const basicCard = screen
				.getByText("Basic Protection")
				.closest("div");
			expect(basicCard).toBeInTheDocument();

			// Initially, extended details should be hidden
			expect(
				screen.queryByText(/perfect for solo developers/i)
			).not.toBeInTheDocument();

			// Click to expand
			await user.click(basicCard!);

			// Extended details should now be visible
			expect(
				screen.getByText(/perfect for solo developers/i)
			).toBeInTheDocument();
		});

		it("highlights protection level on hover", async () => {
			const user = userEvent.setup();
			render(<HatSystemSection />);

			const basicCard = screen
				.getByText("Basic Protection")
				.closest("div");

			// Hover over card
			await user.hover(basicCard!);

			// Card should have hover state (check for scale or opacity change)
			expect(basicCard).toHaveStyle({ transform: "scale(1.02)" });
		});

		it("navigates to pricing on CTA click", async () => {
			const user = userEvent.setup();
			const mockPush = vi.fn();

			// Mock Next.js router
			vi.mock("next/navigation", () => ({
				useRouter: () => ({ push: mockPush }),
			}));

			render(<HatSystemSection />);

			const ctaButton = screen.getByRole("button", {
				name: /get started/i,
			});
			await user.click(ctaButton);

			expect(mockPush).toHaveBeenCalledWith("/pricing");
		});

		it("supports keyboard navigation between cards", async () => {
			const user = userEvent.setup();
			render(<HatSystemSection />);

			const cards = screen.getAllByRole("article");

			// Tab through cards
			await user.tab();
			expect(cards[0]).toHaveFocus();

			await user.tab();
			expect(cards[1]).toHaveFocus();

			await user.tab();
			expect(cards[2]).toHaveFocus();
		});
	});

	// ===== ANIMATION TESTS =====

	describe("Animations", () => {
		it("animates cards on scroll into view", async () => {
			render(<HatSystemSection />);

			const cards = screen.getAllByRole("article");

			// Cards should start with initial animation state
			cards.forEach((card) => {
				expect(card).toHaveStyle({
					opacity: "0",
					transform: "translateY(20px)",
				});
			});

			// Wait for intersection observer to trigger animation
			await waitForAnimation();

			// Cards should animate to final state
			cards.forEach((card) => {
				expect(card).toHaveStyle({
					opacity: "1",
					transform: "translateY(0)",
				});
			});
		});

		it("staggers card animations with 100ms delay", async () => {
			render(<HatSystemSection />);

			const cards = screen.getAllByRole("article");

			// Wait for first card animation
			await waitForAnimation(200);
			expect(cards[0]).toHaveStyle({ opacity: "1" });
			expect(cards[1]).toHaveStyle({ opacity: "0" });

			// Wait for second card animation (100ms stagger)
			await waitForAnimation(100);
			expect(cards[1]).toHaveStyle({ opacity: "1" });
			expect(cards[2]).toHaveStyle({ opacity: "0" });
		});

		it("respects reduced motion preference", () => {
			mockReducedMotion(true);
			render(<HatSystemSection />);

			const cards = screen.getAllByRole("article");

			// Should have no animations in reduced motion mode
			cards.forEach((card) => {
				verifyReducedMotion(card);
			});
		});

		it("applies snap-back easing on hover", async () => {
			const user = userEvent.setup();
			render(<HatSystemSection />);

			const card = screen.getAllByRole("article")[0];

			await user.hover(card);

			// Should use SNAP_EASING.snapBack curve
			const transition = window.getComputedStyle(card).transition;
			expect(transition).toContain(
				"cubic-bezier(0.68, -0.55, 0.265, 1.55)"
			);
		});
	});

	// ===== ACCESSIBILITY TESTS =====

	describe("Accessibility", () => {
		it("has no accessibility violations", async () => {
			const { container } = render(<HatSystemSection />);
			await testAccessibility(container);
		});

		it("has proper ARIA labels on interactive elements", () => {
			render(<HatSystemSection />);

			const cards = screen.getAllByRole("article");
			cards.forEach((card) => {
				expect(card).toHaveAttribute("aria-label");
			});

			const buttons = screen.getAllByRole("button");
			buttons.forEach((button) => {
				expect(button).toHaveAccessibleName();
			});
		});

		it("supports screen reader navigation", () => {
			render(<HatSystemSection />);

			// Section should have proper heading structure
			const heading = screen.getByRole("heading", { level: 2 });
			expect(heading).toBeInTheDocument();

			// Each protection level should be in a landmark region
			const regions = screen.getAllByRole("article");
			expect(regions.length).toBe(3);
		});

		it("maintains focus visibility on keyboard navigation", async () => {
			const user = userEvent.setup();
			render(<HatSystemSection />);

			await user.tab();

			const focusedElement = document.activeElement;
			const outlineStyle = window.getComputedStyle(
				focusedElement!
			).outline;

			// Should have visible focus indicator
			expect(outlineStyle).not.toBe("none");
		});

		it("provides alt text for protection level icons", () => {
			render(<HatSystemSection />);

			const icons = screen.getAllByRole("img");
			icons.forEach((icon) => {
				expect(icon).toHaveAttribute("alt");
				expect(icon.getAttribute("alt")).not.toBe("");
			});
		});
	});

	// ===== PERFORMANCE TESTS =====

	describe("Performance", () => {
		it("renders within 16.67ms budget (60fps)", async () => {
			const { measureRenderTime } = await import(
				"@/__tests__/helpers/performance-helpers"
			);

			const renderTime = await measureRenderTime(() => {
				render(<HatSystemSection />);
			});

			expect(renderTime).toBeLessThan(16.67);
		});

		it("lazy loads images below the fold", () => {
			render(<HatSystemSection />);

			const images = screen.getAllByRole("img");
			images.forEach((img) => {
				expect(img).toHaveAttribute("loading", "lazy");
			});
		});

		it("uses GPU-accelerated properties for animations", () => {
			render(<HatSystemSection />);

			const card = screen.getAllByRole("article")[0];
			const style = window.getComputedStyle(card);

			// Should use transform instead of left/top
			expect(style.willChange).toContain("transform");
			expect(style.transform).not.toBe("none");
		});

		it("minimizes layout shifts (CLS)", async () => {
			render(<HatSystemSection />);

			// Elements should have explicit dimensions
			const section = screen.getByRole("region");
			expect(section).toHaveStyle({ minHeight: expect.any(String) });
		});
	});

	// ===== RESPONSIVE DESIGN TESTS =====

	describe("Responsive Design", () => {
		it("stacks cards vertically on mobile", () => {
			// Mock mobile viewport
			global.innerWidth = 375;

			render(<HatSystemSection />);

			const container = screen.getByRole("region");
			expect(container).toHaveClass("flex-col");
		});

		it("displays cards in grid on desktop", () => {
			// Mock desktop viewport
			global.innerWidth = 1920;

			render(<HatSystemSection />);

			const container = screen.getByRole("region");
			expect(container).toHaveClass("grid-cols-3");
		});

		it("adjusts font sizes for mobile readability", () => {
			global.innerWidth = 375;
			render(<HatSystemSection />);

			const heading = screen.getByRole("heading", { level: 2 });
			const fontSize = window.getComputedStyle(heading).fontSize;

			// Should use responsive font size
			expect(fontSize).toMatch(/clamp|var\(--font-/);
		});
	});
});
```

#### 3.1.2 Green Phase: Minimal Implementation

**Component File**: `modules/marketing/components/sections/hat-system-section.tsx`

```typescript
"use client";

import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { Shield, ShieldCheck, ShieldStar } from "lucide-react";
import { Button } from "@ui/components/button";
import { useRouter } from "next/navigation";
import {
	SNAP_TRANSITIONS,
	SNAP_VARIANTS,
} from "@/modules/marketing/lib/motion-config";
import { protectionLevels } from "@/__tests__/fixtures/protection-levels";

export function HatSystemSection() {
	const router = useRouter();
	const sectionRef = useRef<HTMLElement>(null);
	const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

	const iconMap = {
		shield: Shield,
		"shield-check": ShieldCheck,
		"shield-star": ShieldStar,
	};

	return (
		<motion.section
			ref={sectionRef}
			className="py-24 px-4 min-h-screen"
			role="region"
			aria-label="Protection Levels"
		>
			<motion.h2
				className="text-4xl md:text-5xl font-bold text-center mb-12"
				initial={{ opacity: 0, y: 20 }}
				animate={isInView ? { opacity: 1, y: 0 } : {}}
				transition={SNAP_TRANSITIONS.entrance}
			>
				Protection Levels
			</motion.h2>

			<motion.div
				className="flex flex-col md:grid md:grid-cols-3 gap-6 max-w-7xl mx-auto"
				variants={SNAP_VARIANTS.staggerContainer}
				initial="hidden"
				animate={isInView ? "visible" : "hidden"}
			>
				{protectionLevels.map((level, index) => {
					const IconComponent =
						iconMap[level.icon as keyof typeof iconMap];

					return (
						<motion.article
							key={level.id}
							className="p-6 rounded-lg border bg-card hover:scale-102 transition-transform"
							variants={SNAP_VARIANTS.staggerItem}
							whileHover={{ scale: 1.02 }}
							whileTap={{ scale: 0.98 }}
							tabIndex={0}
							aria-label={`${level.name} protection level`}
							role="article"
						>
							<IconComponent
								className="w-12 h-12 mb-4"
								aria-label={`${level.name} icon`}
								role="img"
							/>

							<h3 className="text-2xl font-bold mb-2">
								{level.name}
							</h3>
							<p className="text-muted-foreground mb-4">
								{level.description}
							</p>

							<ul className="space-y-2 mb-6">
								{level.features.map((feature, idx) => (
									<li key={idx} className="text-sm">
										✓ {feature}
									</li>
								))}
							</ul>

							<p className="text-sm text-muted-foreground mb-4">
								{level.example}
							</p>

							<Button
								onClick={() => router.push("/pricing")}
								className="w-full"
								aria-label={`Get started with ${level.name}`}
							>
								Get Started
							</Button>
						</motion.article>
					);
				})}
			</motion.div>
		</motion.section>
	);
}
```

#### 3.1.3 Refactor Phase: Code Quality Improvements

**Optimizations**:

1. **Performance**: Memoize protection level cards, lazy load icons
2. **Accessibility**: Add aria-live regions for state changes
3. **Code Reusability**: Extract ProtectionLevelCard subcomponent
4. **Type Safety**: Add strict TypeScript types
5. **Documentation**: Add JSDoc comments

**Refactored Component**:

```typescript
"use client";

import { motion, useInView } from "motion/react";
import { useRef, memo, useMemo } from "react";
import { Shield, ShieldCheck, ShieldStar, type LucideIcon } from "lucide-react";
import { Button } from "@ui/components/button";
import { useRouter } from "next/navigation";
import {
	SNAP_TRANSITIONS,
	SNAP_VARIANTS,
} from "@/modules/marketing/lib/motion-config";

// ===== TYPES =====

interface ProtectionLevel {
	id: string;
	name: string;
	description: string;
	icon: string;
	color: string;
	features: string[];
	example: string;
}

interface ProtectionLevelCardProps {
	level: ProtectionLevel;
	index: number;
	onCTAClick: (levelId: string) => void;
}

// ===== ICON MAP =====

const ICON_MAP: Record<string, LucideIcon> = {
	shield: Shield,
	"shield-check": ShieldCheck,
	"shield-star": ShieldStar,
} as const;

// ===== PROTECTION LEVEL CARD COMPONENT =====

/**
 * Individual protection level card with animations and interactions
 * Memoized for performance optimization
 */
const ProtectionLevelCard = memo<ProtectionLevelCardProps>(
	({ level, index, onCTAClick }) => {
		const IconComponent = ICON_MAP[level.icon] || Shield;

		return (
			<motion.article
				className="p-6 rounded-lg border bg-card hover:scale-102 transition-transform"
				variants={SNAP_VARIANTS.staggerItem}
				whileHover={{ scale: 1.02 }}
				whileTap={{ scale: 0.98 }}
				tabIndex={0}
				aria-label={`${level.name} protection level`}
				role="article"
				custom={index}
			>
				<IconComponent
					className="w-12 h-12 mb-4"
					aria-label={`${level.name} icon`}
					role="img"
					alt={`${level.name} protection level icon`}
				/>

				<h3 className="text-2xl font-bold mb-2">{level.name}</h3>
				<p className="text-muted-foreground mb-4">
					{level.description}
				</p>

				<ul
					className="space-y-2 mb-6"
					aria-label={`${level.name} features`}
				>
					{level.features.map((feature, idx) => (
						<li key={idx} className="text-sm flex items-start">
							<span className="mr-2">✓</span>
							<span>{feature}</span>
						</li>
					))}
				</ul>

				<p className="text-sm text-muted-foreground mb-4">
					{level.example}
				</p>

				<Button
					onClick={() => onCTAClick(level.id)}
					className="w-full"
					aria-label={`Get started with ${level.name}`}
				>
					Get Started
				</Button>
			</motion.article>
		);
	}
);

ProtectionLevelCard.displayName = "ProtectionLevelCard";

// ===== MAIN COMPONENT =====

/**
 * Hat System Section - Protection Levels Overview
 *
 * Displays three protection tiers (Basic, Team, Enterprise) with:
 * - Animated cards on scroll
 * - Interactive hover states
 * - Full keyboard navigation
 * - WCAG AA compliance
 *
 * @component
 */
export function HatSystemSection() {
	const router = useRouter();
	const sectionRef = useRef<HTMLElement>(null);
	const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

	// Import protection levels from fixture (will be replaced with CMS data)
	const levels = useMemo(() => {
		return [
			{
				id: "basic",
				name: "Basic Protection",
				description: "Essential protection for individual developers",
				icon: "shield",
				color: "blue",
				features: [
					"Automatic checkpoints before AI changes",
					"One-click recovery",
					"Visual file timeline",
					"7-day history retention",
				],
				example: "Perfect for solo developers using AI assistants",
			},
			{
				id: "team",
				name: "Team Protection",
				description: "Coordinated protection for development teams",
				icon: "shield-check",
				color: "green",
				features: [
					"Everything in Basic",
					"Team-wide checkpoints",
					"Shared recovery points",
					"30-day history retention",
					"Conflict resolution",
				],
				example: "Ideal for teams of 2-10 developers",
			},
			{
				id: "enterprise",
				name: "Enterprise Protection",
				description:
					"Advanced protection with compliance and governance",
				icon: "shield-star",
				color: "purple",
				features: [
					"Everything in Team",
					"Compliance audit logs",
					"Custom retention policies",
					"Priority support",
					"SSO integration",
				],
				example: "Built for organizations with 10+ developers",
			},
		];
	}, []);

	const handleCTAClick = (levelId: string) => {
		router.push(`/pricing?plan=${levelId}`);
	};

	return (
		<motion.section
			ref={sectionRef}
			className="py-24 px-4 min-h-screen"
			role="region"
			aria-labelledby="protection-levels-heading"
		>
			<motion.h2
				id="protection-levels-heading"
				className="text-4xl md:text-5xl font-bold text-center mb-12"
				initial={{ opacity: 0, y: 20 }}
				animate={isInView ? { opacity: 1, y: 0 } : {}}
				transition={SNAP_TRANSITIONS.entrance}
			>
				Protection Levels
			</motion.h2>

			<motion.div
				className="flex flex-col md:grid md:grid-cols-3 gap-6 max-w-7xl mx-auto"
				variants={SNAP_VARIANTS.staggerContainer}
				initial="hidden"
				animate={isInView ? "visible" : "hidden"}
			>
				{levels.map((level, index) => (
					<ProtectionLevelCard
						key={level.id}
						level={level}
						index={index}
						onCTAClick={handleCTAClick}
					/>
				))}
			</motion.div>
		</motion.section>
	);
}
```

---

### 3.2 TeamConfigSection: TDD Workflow

#### 3.2.1 Red Phase Test Structure

**File**: `__tests__/components/sections/TeamConfigSection.test.tsx`

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/__tests__/helpers/render";
import userEvent from "@testing-library/user-event";
import { TeamConfigSection } from "@/modules/marketing/components/sections/team-config-section";
import { teamConfigs } from "@/__tests__/fixtures/team-configs";
import { testAccessibility } from "@/__tests__/helpers/accessibility-helpers";

describe("TeamConfigSection", () => {
	describe("Rendering", () => {
		it("renders section heading", () => {
			render(<TeamConfigSection />);
			expect(
				screen.getByRole("heading", { name: /team configurations/i })
			).toBeInTheDocument();
		});

		it("displays all team configuration options", () => {
			render(<TeamConfigSection />);

			teamConfigs.forEach((config) => {
				expect(screen.getByText(config.name)).toBeInTheDocument();
				expect(screen.getByText(config.size)).toBeInTheDocument();
			});
		});

		it("shows checkpoint strategies for each config", () => {
			render(<TeamConfigSection />);

			teamConfigs.forEach((config) => {
				expect(
					screen.getByText(config.checkpointStrategy)
				).toBeInTheDocument();
			});
		});
	});

	describe("Interactions", () => {
		it("opens configuration details modal on click", async () => {
			const user = userEvent.setup();
			render(<TeamConfigSection />);

			const startupConfig = screen.getByText("Startup Team");
			await user.click(startupConfig);

			expect(screen.getByRole("dialog")).toBeInTheDocument();
			expect(screen.getByText(/shared checkpoints/i)).toBeInTheDocument();
		});

		it("filters configurations by team size", async () => {
			const user = userEvent.setup();
			render(<TeamConfigSection />);

			const sizeFilter = screen.getByRole("combobox", {
				name: /team size/i,
			});
			await user.selectOptions(sizeFilter, "2-5 developers");

			expect(screen.getByText("Startup Team")).toBeInTheDocument();
			expect(screen.queryByText("Enterprise")).not.toBeInTheDocument();
		});

		it("compares two configurations side-by-side", async () => {
			const user = userEvent.setup();
			render(<TeamConfigSection />);

			// Select first config
			const checkboxes = screen.getAllByRole("checkbox");
			await user.click(checkboxes[0]);
			await user.click(checkboxes[1]);

			const compareButton = screen.getByRole("button", {
				name: /compare/i,
			});
			await user.click(compareButton);

			expect(
				screen.getByRole("dialog", { name: /comparison/i })
			).toBeInTheDocument();
		});
	});

	describe("Animations", () => {
		it("animates config cards with sequential stagger", async () => {
			render(<TeamConfigSection />);

			const cards = screen.getAllByRole("article");

			// Check stagger timing
			cards.forEach((card, index) => {
				const delay = parseFloat(card.style.animationDelay || "0");
				expect(delay).toBeCloseTo(index * 0.1, 1);
			});
		});

		it("applies hover scale effect with snap-back easing", async () => {
			const user = userEvent.setup();
			render(<TeamConfigSection />);

			const card = screen.getAllByRole("article")[0];
			await user.hover(card);

			expect(card).toHaveStyle({ transform: "scale(1.05)" });
		});
	});

	describe("Accessibility", () => {
		it("has no accessibility violations", async () => {
			const { container } = render(<TeamConfigSection />);
			await testAccessibility(container);
		});

		it("supports keyboard navigation through configs", async () => {
			const user = userEvent.setup();
			render(<TeamConfigSection />);

			await user.tab(); // Focus first config
			expect(screen.getAllByRole("article")[0]).toHaveFocus();

			await user.keyboard("{Enter}"); // Activate
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});

		it("announces config changes to screen readers", async () => {
			const user = userEvent.setup();
			render(<TeamConfigSection />);

			const liveRegion = screen.getByRole("status");

			const sizeFilter = screen.getByRole("combobox");
			await user.selectOptions(sizeFilter, "2-5 developers");

			expect(liveRegion).toHaveTextContent(/showing 1 configuration/i);
		});
	});

	describe("Performance", () => {
		it("virtualizes long feature lists", () => {
			render(<TeamConfigSection />);

			// Only visible items should be rendered
			const listItems = screen.getAllByRole("listitem");
			expect(listItems.length).toBeLessThan(50); // Arbitrary limit
		});

		it("lazy loads comparison modal", async () => {
			render(<TeamConfigSection />);

			// Modal should not be in DOM initially
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

			// Opens on demand
			const compareButton = screen.getByRole("button", {
				name: /compare/i,
			});
			await userEvent.click(compareButton);

			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});
	});
});
```

#### 3.2.2 Green Phase: Implementation

```typescript
"use client";

import { motion, useInView } from "motion/react";
import { useState, useRef } from "react";
import { Button } from "@ui/components/button";
import {
	SNAP_TRANSITIONS,
	SNAP_VARIANTS,
} from "@/modules/marketing/lib/motion-config";
import { teamConfigs } from "@/__tests__/fixtures/team-configs";

export function TeamConfigSection() {
	const sectionRef = useRef<HTMLElement>(null);
	const isInView = useInView(sectionRef, { once: true });
	const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
	const [filter, setFilter] = useState<string>("all");

	const filteredConfigs =
		filter === "all"
			? teamConfigs
			: teamConfigs.filter((c) => c.size === filter);

	const handleConfigClick = (id: string) => {
		// Toggle selection
		setSelectedConfigs((prev) =>
			prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
		);
	};

	return (
		<motion.section
			ref={sectionRef}
			className="py-24 px-4"
			role="region"
			aria-labelledby="team-config-heading"
		>
			<motion.h2
				id="team-config-heading"
				className="text-4xl font-bold text-center mb-8"
				initial={{ opacity: 0 }}
				animate={isInView ? { opacity: 1 } : {}}
			>
				Team Configurations
			</motion.h2>

			<div className="mb-6">
				<label htmlFor="size-filter" className="sr-only">
					Filter by team size
				</label>
				<select
					id="size-filter"
					aria-label="Team size"
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
					className="px-4 py-2 rounded border"
				>
					<option value="all">All Sizes</option>
					<option value="2-5 developers">2-5 developers</option>
					<option value="6-15 developers">6-15 developers</option>
					<option value="15+ developers">15+ developers</option>
				</select>
			</div>

			<div role="status" aria-live="polite" className="sr-only">
				Showing {filteredConfigs.length} configuration
				{filteredConfigs.length !== 1 ? "s" : ""}
			</div>

			<motion.div
				className="grid md:grid-cols-3 gap-6"
				variants={SNAP_VARIANTS.staggerContainer}
				initial="hidden"
				animate={isInView ? "visible" : "hidden"}
			>
				{filteredConfigs.map((config) => (
					<motion.article
						key={config.id}
						className="p-6 border rounded-lg cursor-pointer"
						variants={SNAP_VARIANTS.staggerItem}
						whileHover={{ scale: 1.05 }}
						tabIndex={0}
						onClick={() => handleConfigClick(config.id)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleConfigClick(config.id);
						}}
						aria-pressed={selectedConfigs.includes(config.id)}
						role="article"
					>
						<input
							type="checkbox"
							checked={selectedConfigs.includes(config.id)}
							onChange={() => handleConfigClick(config.id)}
							aria-label={`Select ${config.name}`}
						/>

						<h3 className="text-2xl font-bold mb-2">
							{config.name}
						</h3>
						<p className="text-sm text-muted-foreground mb-4">
							{config.size}
						</p>

						<div className="mb-4">
							<strong>Checkpoint Strategy:</strong>
							<p>{config.checkpointStrategy}</p>
						</div>

						<div className="mb-4">
							<strong>Retention:</strong>
							<p>{config.retentionDays} days</p>
						</div>

						<ul role="list">
							{config.features.map((feature, idx) => (
								<li key={idx} role="listitem">
									{feature}
								</li>
							))}
						</ul>
					</motion.article>
				))}
			</motion.div>

			{selectedConfigs.length === 2 && (
				<Button
					className="mt-6"
					aria-label="Compare selected configurations"
				>
					Compare
				</Button>
			)}
		</motion.section>
	);
}
```

#### 3.2.3 Refactor Phase: Extract comparison modal, optimize rendering

---

### 3.3 RecoverySection: TDD Workflow

#### 3.3.1 Red Phase Test Structure

**File**: `__tests__/components/sections/RecoverySection.test.tsx`

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@/__tests__/helpers/render";
import userEvent from "@testing-library/user-event";
import { RecoverySection } from "@/modules/marketing/components/sections/recovery-section";
import { recoveryScenarios } from "@/__tests__/fixtures/recovery-scenarios";
import { testAccessibility } from "@/__tests__/helpers/accessibility-helpers";

describe("RecoverySection", () => {
	describe("Rendering", () => {
		it("renders section heading", () => {
			render(<RecoverySection />);
			expect(
				screen.getByRole("heading", { name: /recovery scenarios/i })
			).toBeInTheDocument();
		});

		it("displays all recovery scenarios", () => {
			render(<RecoverySection />);

			recoveryScenarios.forEach((scenario) => {
				expect(screen.getByText(scenario.title)).toBeInTheDocument();
				expect(screen.getByText(scenario.problem)).toBeInTheDocument();
			});
		});

		it("shows time saved for each scenario", () => {
			render(<RecoverySection />);

			recoveryScenarios.forEach((scenario) => {
				expect(
					screen.getByText(scenario.timeSaved)
				).toBeInTheDocument();
			});
		});

		it("applies severity badges to scenarios", () => {
			render(<RecoverySection />);

			const criticalBadge = screen.getByText(/critical/i);
			expect(criticalBadge).toHaveClass("bg-red-500");

			const highBadge = screen.getByText(/high/i);
			expect(highBadge).toHaveClass("bg-orange-500");
		});
	});

	describe("Interactions", () => {
		it("expands scenario details on click", async () => {
			const user = userEvent.setup();
			render(<RecoverySection />);

			const scenario = screen.getByText("Dependency Corruption");
			await user.click(scenario);

			expect(screen.getByText(/one-click rollback/i)).toBeInTheDocument();
		});

		it("plays recovery animation when scenario is selected", async () => {
			const user = userEvent.setup();
			render(<RecoverySection />);

			const scenario = screen.getByText("Dependency Corruption");
			await user.click(scenario);

			const animation = screen.getByTestId("recovery-animation");
			expect(animation).toHaveClass("playing");
		});

		it("filters scenarios by severity", async () => {
			const user = userEvent.setup();
			render(<RecoverySection />);

			const severityFilter = screen.getByRole("combobox", {
				name: /severity/i,
			});
			await user.selectOptions(severityFilter, "critical");

			expect(
				screen.getByText("Dependency Corruption")
			).toBeInTheDocument();
			expect(
				screen.queryByText("Logic Regression")
			).not.toBeInTheDocument();
		});
	});

	describe("Animations", () => {
		it("animates scenario cards on scroll", async () => {
			render(<RecoverySection />);

			const cards = screen.getAllByRole("article");

			cards.forEach((card) => {
				expect(card).toHaveStyle({ opacity: "0" });
			});

			// Simulate scroll into view
			await waitFor(() => {
				cards.forEach((card) => {
					expect(card).toHaveStyle({ opacity: "1" });
				});
			});
		});

		it("shows recovery timeline animation", async () => {
			const user = userEvent.setup();
			render(<RecoverySection />);

			const scenario = screen.getByText("Config File Overwrite");
			await user.click(scenario);

			// Timeline should animate from left to right
			const timeline = screen.getByTestId("recovery-timeline");
			expect(timeline).toHaveStyle({ width: "0%" });

			await waitFor(
				() => {
					expect(timeline).toHaveStyle({ width: "100%" });
				},
				{ timeout: 2000 }
			);
		});
	});

	describe("Accessibility", () => {
		it("has no accessibility violations", async () => {
			const { container } = render(<RecoverySection />);
			await testAccessibility(container);
		});

		it("provides keyboard shortcuts for scenario navigation", async () => {
			const user = userEvent.setup();
			render(<RecoverySection />);

			await user.keyboard("{ArrowDown}"); // Next scenario
			expect(screen.getAllByRole("article")[1]).toHaveFocus();

			await user.keyboard("{ArrowUp}"); // Previous scenario
			expect(screen.getAllByRole("article")[0]).toHaveFocus();
		});

		it("announces scenario changes to screen readers", async () => {
			const user = userEvent.setup();
			render(<RecoverySection />);

			const liveRegion = screen.getByRole("status");

			const scenario = screen.getByText("Dependency Corruption");
			await user.click(scenario);

			expect(liveRegion).toHaveTextContent(
				/viewing dependency corruption scenario/i
			);
		});
	});

	describe("Performance", () => {
		it("preloads recovery animations", () => {
			render(<RecoverySection />);

			const animations = document.querySelectorAll(
				'link[rel="preload"][as="video"]'
			);
			expect(animations.length).toBeGreaterThan(0);
		});

		it("uses GPU-accelerated properties for timeline", () => {
			render(<RecoverySection />);

			const timeline = screen.getByTestId("recovery-timeline");
			expect(timeline).toHaveStyle({ willChange: "transform" });
		});
	});
});
```

#### 3.3.2 Green Phase & Refactor: Similar pattern to previous components

---

## 4. INTEGRATION TESTING STRATEGY

### 4.1 Home Page Integration Test

**File**: `__tests__/integration/home-page.test.tsx`

```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@/__tests__/helpers/render";
import HomePage from "@/app/page";

describe("Home Page Integration", () => {
	it("renders all three new sections in correct order", () => {
		render(<HomePage />);

		const sections = screen.getAllByRole("region");

		expect(sections[0]).toHaveAccessibleName(/hero/i);
		expect(sections[1]).toHaveAccessibleName(/protection levels/i);
		expect(sections[2]).toHaveAccessibleName(/team configurations/i);
		expect(sections[3]).toHaveAccessibleName(/recovery scenarios/i);
	});

	it("maintains scroll performance with all sections", async () => {
		const { container } = render(<HomePage />);

		// Simulate scroll
		window.scrollTo(0, 1000);

		// Check for layout shifts
		const cls = await getCLS(container);
		expect(cls).toBeLessThan(0.1);
	});

	it("handles navigation between sections", async () => {
		const user = userEvent.setup();
		render(<HomePage />);

		const nav = screen.getByRole("navigation");
		const protectionLink = within(nav).getByText(/protection/i);

		await user.click(protectionLink);

		expect(window.location.hash).toBe("#protection-levels");
	});
});
```

### 4.2 Cross-Browser Testing (Playwright)

**File**: `tests/e2e/marketing-sections.spec.ts`

```typescript
import { test, expect } from "@playwright/test";

test.describe("Marketing Sections", () => {
	test("animates correctly in Chrome", async ({ page }) => {
		await page.goto("/");

		await page.evaluate(() => window.scrollTo(0, 1000));

		const card = page.locator('[role="article"]').first();
		await expect(card).toHaveCSS("opacity", "1");
	});

	test("works without JavaScript (progressive enhancement)", async ({
		page,
	}) => {
		await page.goto("/", { javaScriptEnabled: false });

		await expect(page.locator("text=Protection Levels")).toBeVisible();
		await expect(page.locator("text=Basic Protection")).toBeVisible();
	});

	test("respects user motion preferences", async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		await page.goto("/");

		const card = page.locator('[role="article"]').first();
		const transitionDuration = await card.evaluate(
			(el) => window.getComputedStyle(el).transitionDuration
		);

		expect(transitionDuration).toBe("0s");
	});
});
```

---

## 5. QUALITY GATES & SUCCESS CRITERIA

### 5.1 Test Coverage Requirements

```bash
# Run tests with coverage
pnpm test:coverage

# Expected output:
# Statements   : 90%+ (goal: 95%)
# Branches     : 85%+ (goal: 90%)
# Functions    : 90%+ (goal: 95%)
# Lines        : 90%+ (goal: 95%)
```

### 5.2 Performance Benchmarks

```typescript
// Performance test suite
describe("Performance Benchmarks", () => {
	it("meets LCP target (<2.5s)", async () => {
		const lcp = await measureLCP();
		expect(lcp).toBeLessThan(2500);
	});

	it("meets CLS target (<0.1)", async () => {
		const cls = await measureCLS();
		expect(cls).toBeLessThan(0.1);
	});

	it("maintains 60fps during animations", async () => {
		const fps = await measureFPS();
		expect(fps).toBeGreaterThanOrEqual(60);
	});

	it("meets interaction latency target (<100ms)", async () => {
		const latency = await measureInteractionLatency();
		expect(latency).toBeLessThan(100);
	});
});
```

### 5.3 Accessibility Checklist

-   ✅ Zero violations in jest-axe audit
-   ✅ Keyboard navigation for all interactive elements
-   ✅ ARIA labels on all custom components
-   ✅ Focus indicators visible and clear
-   ✅ Screen reader announcements for dynamic content
-   ✅ Semantic HTML structure
-   ✅ Color contrast ratio ≥4.5:1 (WCAG AA)
-   ✅ Reduced motion support
-   ✅ Alt text for all images/icons

### 5.4 Code Quality Metrics

```bash
# Type checking
pnpm type-check # 0 errors

# Linting
pnpm lint # 0 warnings, 0 errors

# Build validation
pnpm build # Success without warnings
```

---

## 6. IMPLEMENTATION ROADMAP

### 6.1 Phase 1: Infrastructure Setup (Day 1)

**Tasks**:

1. Create test directory structure
2. Implement custom render function
3. Build animation testing helpers
4. Create accessibility testing utilities
5. Set up performance testing tools
6. Create test data fixtures
7. Configure common mocks

**Validation**: All helper functions have their own unit tests

### 6.2 Phase 2: HatSystemSection (Days 2-3)

**Day 2: Red Phase**

-   Write all 30+ test cases
-   Run tests (all fail ✅)
-   Review test quality with team

**Day 3: Green + Refactor**

-   Implement minimal component
-   Make all tests pass
-   Refactor for quality
-   Ensure coverage >90%

### 6.3 Phase 3: TeamConfigSection (Days 4-5)

**Day 4: Red Phase**

-   Write all test cases (30+ tests)
-   Include modal/comparison tests
-   Run tests (all fail ✅)

**Day 5: Green + Refactor**

-   Implement component
-   Extract comparison modal subcomponent
-   Optimize virtualization
-   Coverage >90%

### 6.4 Phase 4: RecoverySection (Days 6-7)

**Day 6: Red Phase**

-   Write all test cases (30+ tests)
-   Include animation timeline tests
-   Run tests (all fail ✅)

**Day 7: Green + Refactor**

-   Implement component with animations
-   Optimize timeline rendering
-   Coverage >90%

### 6.5 Phase 5: Integration (Day 8)

**Tasks**:

1. Integrate all three components into home page
2. Run integration tests
3. Validate scroll performance
4. Test navigation between sections
5. Cross-browser testing (Playwright)
6. Mobile responsiveness validation

### 6.6 Phase 6: Optimization (Day 9)

**Tasks**:

1. Performance profiling
2. Bundle size optimization
3. Image optimization
4. Code splitting analysis
5. Accessibility audit (manual + automated)
6. Documentation updates

### 6.7 Phase 7: Final Validation (Day 10)

**Quality Gates**:

-   ✅ All tests passing (200+ tests)
-   ✅ Coverage >90%
-   ✅ Zero TypeScript errors
-   ✅ Zero accessibility violations
-   ✅ Performance targets met
-   ✅ Cross-browser compatibility verified
-   ✅ Mobile responsiveness confirmed
-   ✅ Documentation complete

---

## 7. RISK MITIGATION STRATEGIES

### 7.1 Animation Performance Risks

**Risk**: Complex animations cause jank on low-end devices

**Mitigation**:

-   Use GPU-accelerated properties only (transform, opacity)
-   Implement performance budgets in tests
-   Add reduced motion fallbacks
-   Monitor FPS during animations
-   Use `will-change` hints strategically

### 7.2 Accessibility Regression Risks

**Risk**: New features break keyboard navigation

**Mitigation**:

-   Automated jest-axe tests in CI/CD
-   Manual keyboard testing for each component
-   Screen reader testing (NVDA, JAWS, VoiceOver)
-   Focus trap tests for modals
-   ARIA label validation in tests

### 7.3 Bundle Size Risks

**Risk**: Framer Motion increases bundle size significantly

**Mitigation**:

-   Tree-shaking verification
-   Code splitting for modal components
-   Lazy loading for below-fold content
-   Bundle analyzer in CI/CD
-   Target: <300KB total JS bundle

### 7.4 TypeScript Compilation Risks

**Risk**: Type errors in production build

**Mitigation**:

-   Strict TypeScript config
-   Pre-commit type checking
-   CI/CD type checking gate
-   Type tests for complex props
-   No `any` types allowed

### 7.5 Test Maintenance Risks

**Risk**: Brittle tests break on refactoring

**Mitigation**:

-   Test user behavior, not implementation
-   Use semantic queries (role, label)
-   Avoid testing internal state
-   Test accessibility, not CSS classes
-   Keep fixtures centralized

---

## 8. MONITORING & OBSERVABILITY

### 8.1 Test Metrics Dashboard

```typescript
// Track test execution metrics
export interface TestMetrics {
	totalTests: number;
	passingTests: number;
	failingTests: number;
	coverage: {
		statements: number;
		branches: number;
		functions: number;
		lines: number;
	};
	executionTime: number;
	slowestTests: Array<{ name: string; duration: number }>;
}
```

### 8.2 Performance Monitoring

```typescript
// Real User Monitoring (RUM) integration
import { onCLS, onLCP, onFID } from "web-vitals";

export function initPerformanceMonitoring() {
	onCLS((metric) => {
		// Send to analytics
		trackMetric("CLS", metric.value);
	});

	onLCP((metric) => {
		trackMetric("LCP", metric.value);
	});

	onFID((metric) => {
		trackMetric("FID", metric.value);
	});
}
```

### 8.3 Accessibility Monitoring

```typescript
// Automated accessibility testing in CI/CD
export async function runAccessibilityAudit() {
	const results = await axe(document.body);

	if (results.violations.length > 0) {
		console.error("Accessibility violations:", results.violations);
		process.exit(1);
	}
}
```

---

## 9. CONTINUOUS IMPROVEMENT

### 9.1 Test Review Cadence

**Weekly**:

-   Review test coverage reports
-   Identify untested edge cases
-   Remove duplicate tests
-   Optimize slow tests

**Monthly**:

-   Update test fixtures with new data
-   Review accessibility test coverage
-   Update performance benchmarks
-   Refactor brittle tests

### 9.2 Performance Budgets

```json
{
	"budgets": [
		{
			"resourceSizes": [
				{
					"resourceType": "script",
					"budget": 300
				},
				{
					"resourceType": "total",
					"budget": 500
				}
			]
		},
		{
			"timings": [
				{
					"metric": "interactive",
					"budget": 3000
				},
				{
					"metric": "first-contentful-paint",
					"budget": 1500
				}
			]
		}
	]
}
```

### 9.3 Test Automation in CI/CD

```yaml
# .github/workflows/test.yml
name: Test & Quality Gates

on: [push, pull_request]

jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3

            - name: Install dependencies
              run: pnpm install

            - name: Type check
              run: pnpm type-check

            - name: Lint
              run: pnpm lint

            - name: Unit tests with coverage
              run: pnpm test:coverage

            - name: Accessibility tests
              run: pnpm test:a11y

            - name: Performance tests
              run: pnpm test:performance

            - name: E2E tests
              run: pnpm e2e:ci

            - name: Upload coverage
              uses: codecov/codecov-action@v3
              with:
                  files: ./coverage/coverage-final.json
```

---

## 10. CONCLUSION & NEXT STEPS

### 10.1 Summary

This TDD implementation strategy provides:

1. **Systematic Approach**: Red-Green-Refactor for all components
2. **Comprehensive Testing**: 200+ tests across unit, integration, E2E
3. **Quality Assurance**: Coverage >90%, zero accessibility violations
4. **Performance Focus**: 60fps animations, <100ms interactions
5. **Risk Mitigation**: Automated gates, performance budgets, monitoring

### 10.2 Success Metrics

-   ✅ **Test Coverage**: >90% (target: 95%)
-   ✅ **Performance**: LCP <2.5s, CLS <0.1, 60fps
-   ✅ **Accessibility**: Zero violations, WCAG AA compliant
-   ✅ **Code Quality**: 0 TypeScript errors, 0 lint warnings
-   ✅ **User Experience**: Smooth animations, responsive design

### 10.3 Next Steps

1. **Day 1**: Set up test infrastructure
2. **Days 2-3**: HatSystemSection (Red → Green → Refactor)
3. **Days 4-5**: TeamConfigSection (Red → Green → Refactor)
4. **Days 6-7**: RecoverySection (Red → Green → Refactor)
5. **Day 8**: Integration testing
6. **Day 9**: Performance optimization
7. **Day 10**: Final validation & launch

---

## APPENDIX

### A. Recommended Testing Tools

-   **Vitest**: Fast unit testing framework
-   **Testing Library**: User-centric testing utilities
-   **jest-axe**: Automated accessibility testing
-   **Playwright**: Cross-browser E2E testing
-   **MSW**: API mocking
-   **bundlesize**: Bundle size monitoring

### B. Useful Resources

-   [Testing Library Best Practices](https://testing-library.com/docs/queries/about)
-   [Accessibility Testing Guide](https://www.w3.org/WAI/test-evaluate/)
-   [Web Vitals Documentation](https://web.dev/vitals/)
-   [Framer Motion Testing](https://www.framer.com/motion/testing/)

### C. Contact & Support

**Questions?** Open an issue or contact the architecture team.

**Feedback?** We iterate on this strategy quarterly.

---

**Document Version**: 1.0
**Last Updated**: 2025-10-11
**Author**: System Architect Agent
**Status**: Ready for Implementation
