# TDD Troubleshooting Guide

**Quick solutions to common issues during TDD implementation**

---

## 🚨 Test Execution Issues

### Issue: "Cannot find module '@/**tests**/helpers/render'"

**Symptoms:**

```bash
Error: Cannot find module '@/__tests__/helpers/render'
```

**Root Cause:** Path aliases not configured in vitest.config.ts

**Solution:**

```typescript
// vitest.config.ts
export default defineConfig({
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "."),
			"@/__tests__": path.resolve(__dirname, "__tests__"),
			"@/modules": path.resolve(__dirname, "modules"),
		},
	},
});
```

**Verification:**

```bash
pnpm test # Should resolve imports correctly
```

---

### Issue: Tests hang indefinitely

**Symptoms:**

-   Tests never complete
-   Vitest seems frozen
-   No error messages

**Root Cause:** Missing `await` on async operations or unresolved promises

**Solution:**

```typescript
// ❌ Bad - missing await
it("handles click", () => {
	user.click(button); // Promise not awaited
	expect(result).toBe(true);
});

// ✅ Good - properly awaited
it("handles click", async () => {
	await user.click(button);
	expect(result).toBe(true);
});
```

**Verification:**

```bash
pnpm test -- --reporter=verbose # Shows which test is hanging
```

---

### Issue: "ReferenceError: window is not defined"

**Symptoms:**

```bash
ReferenceError: window is not defined
```

**Root Cause:** Server-side code being tested in jsdom environment

**Solution:**

```typescript
// Add environment check
if (typeof window !== "undefined") {
	// Browser-only code
}

// Or mock window in test
beforeEach(() => {
	global.window = {
		matchMedia: vi.fn().mockImplementation((query) => ({
			matches: false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		})),
	} as any;
});
```

---

### Issue: "TypeError: Cannot read property 'matches' of undefined"

**Symptoms:**

```bash
TypeError: Cannot read property 'matches' of undefined
  at useReducedMotion
```

**Root Cause:** `window.matchMedia` not mocked

**Solution:**

```typescript
// In test setup or beforeEach
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(),
		removeListener: vi.fn(),
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});
```

**Better Solution:** Use helper

```typescript
import { mockReducedMotion } from "@/__tests__/helpers/animation-helpers";

beforeEach(() => {
	mockReducedMotion(false);
});
```

---

## 🎨 Animation Testing Issues

### Issue: Framer Motion animations don't trigger in tests

**Symptoms:**

-   Elements stay in initial state
-   No animation transitions occur
-   Tests fail expecting animated state

**Root Cause:** Framer Motion requires RAF (RequestAnimationFrame) which jsdom doesn't provide

**Solution 1:** Mock framer-motion

```typescript
vi.mock("motion/react", () => ({
	motion: {
		div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
		section: ({ children, ...props }: any) => (
			<section {...props}>{children}</section>
		),
	},
	useInView: () => true,
	useReducedMotion: () => false,
	AnimatePresence: ({ children }: any) => <>{children}</>,
}));
```

**Solution 2:** Use waitForAnimation helper

```typescript
import { waitForAnimation } from "@/__tests__/helpers/animation-helpers";

it("animates on scroll", async () => {
	render(<Component />);

	// Wait for animation to complete
	await waitForAnimation(600); // duration in ms

	expect(element).toHaveStyle({ opacity: "1" });
});
```

---

### Issue: "Expected element to have opacity: 1, received: 0"

**Symptoms:**

-   Animation assertions fail
-   Elements appear stuck in initial state

**Root Cause:** Testing animation mid-transition or not waiting for completion

**Solution:**

```typescript
// ❌ Bad - checks immediately
it("animates", () => {
	render(<Component />);
	expect(element).toHaveStyle({ opacity: "1" }); // Fails
});

// ✅ Good - waits for animation
it("animates", async () => {
	render(<Component />);
	await waitForAnimation(600);
	expect(element).toHaveStyle({ opacity: "1" }); // Passes
});
```

---

### Issue: IntersectionObserver is not defined

**Symptoms:**

```bash
ReferenceError: IntersectionObserver is not defined
```

**Root Cause:** jsdom doesn't implement IntersectionObserver

**Solution:**

```typescript
import { mockIntersectionObserver } from "@/__tests__/helpers/performance-helpers";

beforeEach(() => {
	mockIntersectionObserver();
});
```

**Manual Mock:**

```typescript
beforeEach(() => {
	global.IntersectionObserver = class IntersectionObserver {
		constructor(private callback: Function) {}
		observe() {
			// Immediately trigger as visible
			this.callback([{ isIntersecting: true }]);
		}
		unobserve() {}
		disconnect() {}
	} as any;
});
```

---

## ♿ Accessibility Testing Issues

### Issue: jest-axe reports violations but tests pass

**Symptoms:**

-   Console shows accessibility violations
-   Tests still pass
-   No assertion failures

**Root Cause:** Not properly asserting on axe results

**Solution:**

```typescript
// ❌ Bad - doesn't assert
it("has no violations", async () => {
	const { container } = render(<Component />);
	const results = await axe(container); // No assertion
});

// ✅ Good - proper assertion
it("has no violations", async () => {
	const { container } = render(<Component />);
	const results = await axe(container);
	expect(results).toHaveNoViolations(); // Fails if violations exist
});
```

**Or use helper:**

```typescript
import { testAccessibility } from "@/__tests__/helpers/accessibility-helpers";

it("has no violations", async () => {
	const { container } = render(<Component />);
	await testAccessibility(container);
});
```

---

### Issue: "Element must have accessible name"

**Symptoms:**

```bash
✗ Elements must have an accessible name
  Fix: Add aria-label or aria-labelledby attribute
```

**Root Cause:** Interactive elements missing accessible names

**Solution:**

```typescript
// ❌ Bad - no accessible name
<button onClick={handleClick}>
  <Icon />
</button>

// ✅ Good - aria-label
<button onClick={handleClick} aria-label="Submit form">
  <Icon />
</button>

// ✅ Good - aria-labelledby
<button onClick={handleClick} aria-labelledby="submit-label">
  <Icon />
  <span id="submit-label" className="sr-only">Submit form</span>
</button>

// ✅ Good - visible text
<button onClick={handleClick}>
  <Icon />
  <span>Submit</span>
</button>
```

---

### Issue: "Color contrast ratio is insufficient"

**Symptoms:**

```bash
✗ Elements must have sufficient color contrast
  Contrast ratio: 3.2:1 (Required: 4.5:1)
```

**Root Cause:** Text/background color combination doesn't meet WCAG AA standards

**Solution:**

```css
/* ❌ Bad - insufficient contrast */
.text-muted {
	color: #999; /* 3.2:1 on white background */
}

/* ✅ Good - sufficient contrast */
.text-muted {
	color: #666; /* 5.7:1 on white background */
}
```

**Tools to check:**

-   [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
-   Chrome DevTools > Inspect > Accessibility panel

---

## 🎭 Component Rendering Issues

### Issue: "Unable to find role="button""

**Symptoms:**

```bash
TestingLibraryElementError: Unable to find an accessible element with the role "button"
```

**Root Cause:** Element doesn't have expected role or isn't rendered

**Solution:**

```typescript
// Debug what's actually rendered
it("renders button", () => {
	const { debug } = render(<Component />);
	debug(); // Prints DOM tree

	// Check if element exists differently
	expect(screen.queryByRole("button")).toBeNull(); // Not found
});

// Check actual roles
screen.logTestingPlaygroundURL(); // Opens interactive playground
```

**Common fixes:**

```typescript
// ❌ Bad - div isn't a button
<div onClick={handleClick}>Click me</div>

// ✅ Good - semantic button
<button onClick={handleClick}>Click me</button>

// ✅ Good - div with button role
<div role="button" tabIndex={0} onClick={handleClick} onKeyDown={handleKeyDown}>
  Click me
</div>
```

---

### Issue: "Multiple elements with the same role"

**Symptoms:**

```bash
TestingLibraryElementError: Found multiple elements with the role "button"
```

**Root Cause:** Query is too generic

**Solution:**

```typescript
// ❌ Bad - ambiguous query
const button = screen.getByRole('button')

// ✅ Good - specific with accessible name
const button = screen.getByRole('button', { name: /submit/i })

// ✅ Good - get all and select specific
const buttons = screen.getAllByRole('button')
const submitButton = buttons.find(btn => btn.textContent === 'Submit')

// ✅ Good - use test IDs for complex cases
<button data-testid="submit-button">Submit</button>
const button = screen.getByTestId('submit-button')
```

---

### Issue: Component doesn't update after state change

**Symptoms:**

-   User interaction triggers state change
-   Component doesn't re-render
-   Tests fail expecting updated UI

**Root Cause:** Not using `act()` or `waitFor()` for async updates

**Solution:**

```typescript
import { waitFor } from "@testing-library/react";

// ❌ Bad - checks immediately
it("updates on click", async () => {
	render(<Component />);
	await user.click(button);
	expect(screen.getByText("Updated")).toBeInTheDocument(); // Fails
});

// ✅ Good - waits for update
it("updates on click", async () => {
	render(<Component />);
	await user.click(button);

	await waitFor(() => {
		expect(screen.getByText("Updated")).toBeInTheDocument();
	});
});
```

---

## 📦 Mock & Import Issues

### Issue: "Cannot access 'Component' before initialization"

**Symptoms:**

```bash
ReferenceError: Cannot access 'Component' before initialization
```

**Root Cause:** Circular dependency or hoisting issue with vi.mock()

**Solution:**

```typescript
// ❌ Bad - hoisted mock conflicts with import
import { Component } from "./Component";
vi.mock("./Component");

// ✅ Good - correct order
vi.mock("./Component", () => ({
	Component: vi.fn(() => <div>Mocked</div>),
}));
import { Component } from "./Component";
```

---

### Issue: Mock not being used in test

**Symptoms:**

-   Real implementation runs instead of mock
-   Mock assertions fail
-   Side effects occur that shouldn't

**Root Cause:** Mock not properly registered or cleared between tests

**Solution:**

```typescript
// Ensure mock is registered before imports
vi.mock("next/navigation");
import { useRouter } from "next/navigation";

// Clear mocks between tests
afterEach(() => {
	vi.clearAllMocks();
});

// Reset mocks if needed
afterEach(() => {
	vi.resetAllMocks(); // Clears mock history AND implementation
});
```

---

### Issue: "TypeError: vi.fn() is not a function"

**Symptoms:**

```bash
TypeError: vi.fn() is not a function
```

**Root Cause:** Using `vi` instead of importing from 'vitest'

**Solution:**

```typescript
// ❌ Bad - vi not imported
it("test", () => {
	const mock = vi.fn();
});

// ✅ Good - import vi
import { vi } from "vitest";

it("test", () => {
	const mock = vi.fn();
});
```

---

## ⚡ Performance Testing Issues

### Issue: Performance tests are flaky

**Symptoms:**

-   Tests pass/fail inconsistently
-   Performance metrics vary widely
-   Hard to reproduce failures

**Root Cause:** Environment variability, other processes, GC pauses

**Solution:**

```typescript
// ❌ Bad - strict timing
it("renders fast", async () => {
	const start = performance.now();
	render(<Component />);
	const duration = performance.now() - start;
	expect(duration).toBeLessThan(16.67); // Flaky!
});

// ✅ Good - average over multiple runs
it("renders fast", async () => {
	const durations: number[] = [];

	for (let i = 0; i < 10; i++) {
		const start = performance.now();
		render(<Component />);
		durations.push(performance.now() - start);
		cleanup();
	}

	const avgDuration = durations.reduce((a, b) => a + b) / durations.length;
	expect(avgDuration).toBeLessThan(20); // More lenient
});

// ✅ Better - use performance helper
import {
	measureRenderTime,
	expectRenderTimeWithinBudget,
} from "@/__tests__/helpers/performance-helpers";

it("renders fast", async () => {
	const renderTime = await measureRenderTime(() => render(<Component />));
	expectRenderTimeWithinBudget(renderTime, 20); // Allows 20% overhead
});
```

---

### Issue: Bundle size tests fail in CI but pass locally

**Symptoms:**

-   Local build: 295KB
-   CI build: 310KB
-   Bundle size test fails in CI

**Root Cause:** Different build optimization settings or dependencies

**Solution:**

```bash
# Ensure consistent build environment
# In package.json
{
  "scripts": {
    "build:test": "NODE_ENV=production next build",
    "test:bundle": "pnpm build:test && bundlesize"
  }
}

# In bundlesize config
{
  "files": [
    {
      "path": ".next/static/**/*.js",
      "maxSize": "310KB", // Add buffer for CI
      "compression": "gzip"
    }
  ]
}
```

---

## 🔄 TypeScript Issues

### Issue: "Property 'toBeInTheDocument' does not exist"

**Symptoms:**

```bash
TS2339: Property 'toBeInTheDocument' does not exist on type 'JestMatchers'
```

**Root Cause:** @testing-library/jest-dom types not imported

**Solution:**

```typescript
// In vitest.setup.ts
import "@testing-library/jest-dom";

// Or in test file
import "@testing-library/jest-dom";
```

**If still not working:**

```typescript
// In tsconfig.json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

---

### Issue: "Type 'Element | null' is not assignable"

**Symptoms:**

```bash
TS2345: Argument of type 'Element | null' is not assignable to parameter of type 'Element'
```

**Root Cause:** Query returns potentially null element

**Solution:**

```typescript
// ❌ Bad - might be null
const button = screen.queryByRole("button");
await user.click(button); // Type error

// ✅ Good - use getBy (throws if not found)
const button = screen.getByRole("button");
await user.click(button);

// ✅ Good - null check
const button = screen.queryByRole("button");
if (button) {
	await user.click(button);
}

// ✅ Good - non-null assertion (use sparingly)
const button = screen.queryByRole("button")!;
await user.click(button);
```

---

### Issue: Generic type errors with fixtures

**Symptoms:**

```bash
TS2345: Argument of type 'ProtectionLevel' is not assignable to parameter of type '{ id: string; ... }'
```

**Root Cause:** Type mismatch between fixture and component props

**Solution:**

```typescript
// Define shared types
// types/protection.ts
export interface ProtectionLevel {
	id: string;
	name: string;
	// ... other properties
}

// Use in fixture
// __tests__/fixtures/protection-levels.ts
import type { ProtectionLevel } from "@/types/protection";

export const protectionLevels: ProtectionLevel[] = [
	// ...
];

// Use in component
// components/hat-system-section.tsx
import type { ProtectionLevel } from "@/types/protection";

interface Props {
	levels: ProtectionLevel[];
}
```

---

## 🐛 Coverage Issues

### Issue: Coverage doesn't reach 90%

**Symptoms:**

```bash
Statements   : 85.5%
Branches     : 82.3%
Functions    : 88.1%
Lines        : 86.2%
```

**Root Cause:** Untested code paths

**Solution:**

```bash
# Generate detailed coverage report
pnpm test:coverage

# Open HTML report
open coverage/index.html

# Identify untested lines (shown in red)
# Add tests for those specific cases
```

**Common untested cases:**

```typescript
// Error boundaries
try {
	// tested code
} catch (error) {
	// ❌ untested error handling
	handleError(error);
}

// Add error test:
it("handles errors", () => {
	// Mock function to throw
	vi.mocked(someFunction).mockImplementation(() => {
		throw new Error("Test error");
	});

	render(<Component />);
	// Assert error handling
});

// Edge cases
if (items.length === 0) {
	// ❌ untested empty state
	return <EmptyState />;
}

// Add empty state test:
it("renders empty state", () => {
	render(<Component items={[]} />);
	expect(screen.getByText(/no items/i)).toBeInTheDocument();
});
```

---

### Issue: Coverage report shows files that shouldn't be tested

**Symptoms:**

-   Test files appear in coverage
-   Config files appear in coverage
-   Inflated coverage numbers

**Root Cause:** Coverage config not properly excluding files

**Solution:**

```typescript
// vitest.config.ts
export default defineConfig({
	test: {
		coverage: {
			include: ["modules/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
			exclude: [
				"**/*.d.ts",
				"**/*.config.*",
				"**/*.test.{ts,tsx}",
				"**/*.spec.{ts,tsx}",
				"**/types/**",
				"**/__tests__/**",
				"**/*.stories.{ts,tsx}",
			],
		},
	},
});
```

---

## 🔍 Debug Strategies

### Strategy 1: Use screen.debug()

```typescript
it("test", () => {
	render(<Component />);

	// Print entire DOM
	screen.debug();

	// Print specific element
	const button = screen.getByRole("button");
	screen.debug(button);

	// Print with size limit
	screen.debug(undefined, 50000); // 50KB limit
});
```

---

### Strategy 2: Use Testing Playground

```typescript
it("test", () => {
	render(<Component />);

	// Opens interactive playground in browser
	screen.logTestingPlaygroundURL();

	// Shows suggested queries for elements
});
```

---

### Strategy 3: Verbose Test Output

```bash
# Run single test with verbose output
pnpm test -- ComponentName.test.tsx --reporter=verbose

# Run with UI
pnpm test:ui

# Run with coverage highlighting
pnpm test:coverage -- ComponentName.test.tsx
```

---

### Strategy 4: Check Rendered Output

```typescript
it("test", () => {
	const { container } = render(<Component />);

	// Get outerHTML
	console.log(container.outerHTML);

	// Get pretty printed HTML
	console.log(container.innerHTML);

	// Query specific elements
	console.log(container.querySelector('[role="button"]'));
});
```

---

## 📋 Pre-Flight Checklist

Before creating a PR, verify:

```bash
# 1. All tests pass
pnpm test
# Expected: All tests passing ✅

# 2. Coverage meets target
pnpm test:coverage
# Expected: >90% coverage ✅

# 3. No TypeScript errors
pnpm type-check
# Expected: 0 errors ✅

# 4. No lint warnings
pnpm lint
# Expected: 0 warnings, 0 errors ✅

# 5. Build succeeds
pnpm build
# Expected: Successful build ✅

# 6. E2E tests pass (if applicable)
pnpm e2e:ci
# Expected: All E2E tests passing ✅
```

---

## 🆘 Still Stuck?

### Step 1: Check Documentation

-   Review TDD_IMPLEMENTATION_STRATEGY.md
-   Check TDD_QUICK_REFERENCE.md
-   Search existing test files for similar patterns

### Step 2: Isolate the Problem

```typescript
// Create minimal reproduction
it.only("minimal test case", () => {
	render(<MinimalComponent />);
	expect(true).toBe(true); // Start simple
});
```

### Step 3: Ask for Help

````markdown
**Issue:** [Brief description]

**Expected:** [What should happen]

**Actual:** [What actually happens]

**Code:**

```typescript
// Minimal reproduction
```
````

**Attempted Solutions:**

1. [What you tried]
2. [What happened]

**Environment:**

-   Node version: [version]
-   pnpm version: [version]
-   OS: [operating system]

```

### Step 4: Escalation Path
1. **Local Issue** → Team member review
2. **Blocking Issue** → Team lead discussion
3. **Critical Issue** → Architecture team escalation

---

## 📚 Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [jest-axe](https://github.com/nickcolley/jest-axe)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Version**: 1.0
**Last Updated**: 2025-10-11
**Author**: System Architect Agent
```
