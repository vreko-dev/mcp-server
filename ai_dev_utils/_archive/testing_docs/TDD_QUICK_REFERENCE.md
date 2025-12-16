# TDD Quick Reference Guide

**Quick access guide for developers implementing marketing sections**

---

## 🚀 Quick Start

### Run Tests

```bash
# Watch mode (recommended during development)
pnpm test:watch

# Run all tests
pnpm test

# Coverage report
pnpm test:coverage

# UI mode (visual test runner)
pnpm test:ui
```

### Create New Component Test

```bash
# 1. Create test file FIRST
touch __tests__/components/sections/YourSection.test.tsx

# 2. Write failing tests (Red Phase)
# 3. Implement component (Green Phase)
# 4. Refactor (Refactor Phase)
```

---

## 📋 Test Template

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@/__tests__/helpers/render";
import userEvent from "@testing-library/user-event";
import { YourComponent } from "@/path/to/component";
import { testAccessibility } from "@/__tests__/helpers/accessibility-helpers";
import { waitForAnimation } from "@/__tests__/helpers/animation-helpers";

describe("YourComponent", () => {
	// ===== RENDERING =====
	describe("Rendering", () => {
		it("renders component heading", () => {
			render(<YourComponent />);
			expect(screen.getByRole("heading")).toBeInTheDocument();
		});
	});

	// ===== INTERACTIONS =====
	describe("Interactions", () => {
		it("handles user interaction", async () => {
			const user = userEvent.setup();
			render(<YourComponent />);

			const button = screen.getByRole("button");
			await user.click(button);

			expect(/* assertion */).toBeTruthy();
		});
	});

	// ===== ANIMATIONS =====
	describe("Animations", () => {
		it("animates on scroll", async () => {
			render(<YourComponent />);
			await waitForAnimation();

			const element = screen.getByRole("article");
			expect(element).toHaveStyle({ opacity: "1" });
		});
	});

	// ===== ACCESSIBILITY =====
	describe("Accessibility", () => {
		it("has no violations", async () => {
			const { container } = render(<YourComponent />);
			await testAccessibility(container);
		});
	});

	// ===== PERFORMANCE =====
	describe("Performance", () => {
		it("renders within budget", async () => {
			const renderTime = await measureRenderTime(() => {
				render(<YourComponent />);
			});
			expect(renderTime).toBeLessThan(16.67);
		});
	});
});
```

---

## 🎯 Testing Best Practices

### DO ✅

```typescript
// Use semantic queries
screen.getByRole("button", { name: /submit/i });
screen.getByLabelText("Email address");
screen.getByText("Welcome");

// Test user behavior
await user.click(button);
expect(screen.getByText("Success")).toBeInTheDocument();

// Use accessibility helpers
await testAccessibility(container);

// Mock only external dependencies
vi.mock("next/navigation");
```

### DON'T ❌

```typescript
// Avoid testing implementation details
expect(component.state.count).toBe(5) // ❌

// Don't use CSS selectors
container.querySelector('.my-class') // ❌

// Don't test internal state
expect(mockFn).toHaveBeenCalledWith(internalState) // ❌

// Don't skip accessibility tests
it.skip('accessibility test', ...) // ❌
```

---

## 🧪 Common Test Patterns

### Testing Animations

```typescript
import {
	waitForAnimation,
	mockReducedMotion,
} from "@/__tests__/helpers/animation-helpers";

it("animates on scroll", async () => {
	render(<Component />);

	const element = screen.getByRole("article");

	// Check initial state
	expect(element).toHaveStyle({ opacity: "0" });

	// Wait for animation
	await waitForAnimation(600);

	// Check final state
	expect(element).toHaveStyle({ opacity: "1" });
});

it("respects reduced motion", () => {
	mockReducedMotion(true);
	render(<Component />);

	const element = screen.getByRole("article");
	verifyReducedMotion(element);
});
```

### Testing User Interactions

```typescript
import userEvent from "@testing-library/user-event";

it("handles user interactions", async () => {
	const user = userEvent.setup();
	render(<Component />);

	// Click
	await user.click(screen.getByRole("button"));

	// Type
	await user.type(screen.getByRole("textbox"), "Hello");

	// Keyboard navigation
	await user.tab();
	expect(screen.getByRole("link")).toHaveFocus();

	// Hover
	await user.hover(screen.getByRole("article"));
	expect(/* hover state */).toBeTruthy();
});
```

### Testing Accessibility

```typescript
import { testAccessibility } from "@/__tests__/helpers/accessibility-helpers";

it("passes accessibility audit", async () => {
	const { container } = render(<Component />);
	await testAccessibility(container);
});

it("supports keyboard navigation", async () => {
	const user = userEvent.setup();
	render(<Component />);

	await user.tab();
	expect(screen.getByRole("button")).toHaveFocus();

	await user.keyboard("{Enter}");
	expect(/* action triggered */).toBeTruthy();
});

it("has ARIA labels", () => {
	render(<Component />);

	const button = screen.getByRole("button");
	expect(button).toHaveAccessibleName();

	const region = screen.getByRole("region");
	expect(region).toHaveAttribute("aria-labelledby");
});
```

### Testing Performance

```typescript
import { measureRenderTime } from "@/__tests__/helpers/performance-helpers";

it("renders within 60fps budget", async () => {
	const renderTime = await measureRenderTime(() => {
		render(<Component />);
	});

	expect(renderTime).toBeLessThan(16.67); // 60fps = 16.67ms per frame
});

it("lazy loads images", () => {
	render(<Component />);

	const images = screen.getAllByRole("img");
	images.forEach((img) => {
		expect(img).toHaveAttribute("loading", "lazy");
	});
});

it("uses GPU-accelerated properties", () => {
	render(<Component />);

	const element = screen.getByRole("article");
	const style = window.getComputedStyle(element);

	expect(style.willChange).toContain("transform");
	expect(style.transform).not.toBe("none");
});
```

---

## 🎨 Component Implementation Checklist

### Before Starting

-   [ ] Read test file to understand requirements
-   [ ] Review fixtures and mocks
-   [ ] Understand animation requirements
-   [ ] Check accessibility requirements

### During Implementation

-   [ ] Import required dependencies
-   [ ] Add proper TypeScript types
-   [ ] Use motion components from framer-motion
-   [ ] Apply SNAP_TRANSITIONS and SNAP_VARIANTS
-   [ ] Add ARIA labels and roles
-   [ ] Support keyboard navigation
-   [ ] Handle reduced motion preference

### After Implementation

-   [ ] All tests pass (0 failing)
-   [ ] Coverage >90%
-   [ ] Zero TypeScript errors
-   [ ] Zero accessibility violations
-   [ ] Performance targets met
-   [ ] Code reviewed and refactored

---

## 🔧 Common Issues & Solutions

### Issue: "Cannot find module '@/**tests**/helpers/render'"

**Solution**: Check vitest.config.ts path aliases

```typescript
// vitest.config.ts
resolve: {
  alias: {
    '@': path.resolve(__dirname, '.'),
    '@/__tests__': path.resolve(__dirname, './__tests__'),
  },
}
```

### Issue: "Framer Motion animations not working in tests"

**Solution**: Mock framer-motion properly

```typescript
vi.mock("motion/react", () => ({
	motion: {
		div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
	},
	useInView: () => true,
	useReducedMotion: () => false,
}));
```

### Issue: "IntersectionObserver is not defined"

**Solution**: Use helper to mock it

```typescript
import { mockIntersectionObserver } from "@/__tests__/helpers/performance-helpers";

beforeEach(() => {
	mockIntersectionObserver();
});
```

### Issue: "Tests pass but coverage is low"

**Solution**: Check untested branches

```bash
pnpm test:coverage

# Open coverage report
open coverage/index.html

# Identify untested lines and add tests
```

---

## 📊 Quality Gates

### Must Pass Before PR

```bash
# Type checking
pnpm type-check # ✅ 0 errors

# Linting
pnpm lint # ✅ 0 warnings

# Tests
pnpm test # ✅ All passing

# Coverage
pnpm test:coverage # ✅ >90%

# Build
pnpm build # ✅ No warnings
```

### Performance Targets

-   **LCP**: <2.5s
-   **CLS**: <0.1
-   **FPS**: ≥60fps
-   **Interaction Latency**: <100ms
-   **Bundle Size**: <300KB JS

### Accessibility Requirements

-   **jest-axe**: Zero violations
-   **Keyboard Navigation**: All interactive elements accessible
-   **Screen Readers**: All content announced
-   **Focus Management**: Visible focus indicators
-   **Contrast Ratio**: ≥4.5:1 (WCAG AA)

---

## 🎓 Additional Resources

### Testing Library

-   [Common Mistakes](https://testing-library.com/docs/queries/about)
-   [Query Priority](https://testing-library.com/docs/queries/about#priority)
-   [User Events](https://testing-library.com/docs/user-event/intro)

### Accessibility

-   [ARIA Guide](https://www.w3.org/WAI/ARIA/apg/)
-   [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
-   [jest-axe Documentation](https://github.com/nickcolley/jest-axe)

### Performance

-   [Web Vitals](https://web.dev/vitals/)
-   [Framer Motion Performance](https://www.framer.com/motion/guide-performance/)
-   [React Performance](https://react.dev/learn/render-and-commit)

---

## 💡 Pro Tips

1. **Write tests first** - Forces you to think about API design
2. **Use data-testid sparingly** - Prefer semantic queries
3. **Test behavior, not implementation** - Tests should survive refactoring
4. **Keep tests simple** - One assertion per test when possible
5. **Use describe blocks** - Organize tests by category
6. **Mock external dependencies** - Keep tests fast and isolated
7. **Run tests in watch mode** - Get instant feedback
8. **Check coverage regularly** - Identify untested code early

---

## 🚨 Common Mistakes to Avoid

1. ❌ **Testing implementation details**

    ```typescript
    // Bad
    expect(component.state.isOpen).toBe(true);

    // Good
    expect(screen.getByRole("dialog")).toBeVisible();
    ```

2. ❌ **Using brittle selectors**

    ```typescript
    // Bad
    container.querySelector(".modal-content");

    // Good
    screen.getByRole("dialog");
    ```

3. ❌ **Not waiting for async operations**

    ```typescript
    // Bad
    click(button);
    expect(text).toBeInTheDocument();

    // Good
    await user.click(button);
    await waitFor(() => expect(text).toBeInTheDocument());
    ```

4. ❌ **Skipping accessibility tests**

    ```typescript
    // Bad
    it.skip('accessibility', ...)

    // Good
    it('has no a11y violations', async () => {
      await testAccessibility(container)
    })
    ```

5. ❌ **Forgetting to clean up**

    ```typescript
    // Bad
    afterEach(() => {
    	// No cleanup
    });

    // Good
    afterEach(() => {
    	cleanup();
    	vi.clearAllMocks();
    });
    ```

---

**Need Help?** Check the full TDD Implementation Strategy document or ask the team!

**Version**: 1.0
**Last Updated**: 2025-10-11
