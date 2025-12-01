# Mobile UI Testing Guidelines

This document outlines the testing strategies and best practices to prevent mobile UI issues like hidden elements, detached menus, and animation problems.

## Common Mobile UI Issues

### 1. Hidden Elements Due to Opacity/Transform

Elements may become invisible on mobile due to:

-   `opacity: 0` styles not being properly managed
-   `transform: rotate()` or other transforms causing elements to be positioned off-screen
-   Animation libraries not resolving states correctly on mobile devices

### 2. Detached Menus

Menus may detach from their anchor points due to:

-   Incorrect positioning (fixed vs absolute)
-   Viewport height calculations including browser UI
-   Scroll position changes not being accounted for

### 3. Animation Performance Issues

Animations may cause problems on mobile:

-   Complex animations causing jank or freezing
-   Animation libraries not respecting reduced motion preferences
-   Memory leaks from improperly cleaned up animations

## Prevention Strategies

### 1. Linting Rules

We've implemented custom linting rules to catch common issues:

```bash
# Run mobile-specific linting
npm run lint:mobile
```

This will check for:

-   Elements with potentially problematic opacity/transform combinations
-   Missing button types
-   Accessibility issues

### 2. Unit Testing

Unit tests should verify:

-   Mobile menu button visibility and functionality
-   Correct icon display based on menu state
-   Proper aria attributes for accessibility
-   No hidden elements with opacity 0

Example test pattern:

```typescript
it("should not have hidden elements with opacity 0", () => {
	render(<Component />);

	const element = screen.getByTestId("mobile-element");
	const style = window.getComputedStyle(element);
	expect(style.opacity).not.toBe("0");
});
```

### 3. End-to-End Testing

Playwright tests should verify:

-   Menu toggle functionality on mobile viewports
-   Menu closing when clicking outside
-   Proper positioning of mobile elements
-   No detached menus

Example test pattern:

```typescript
test("should toggle mobile menu visibility", async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 667 });

	const menuButton = page.locator("#mobile-menu-button");
	await expect(menuButton).toBeVisible();

	await menuButton.click();
	const mobileMenu = page.locator("#mobile-menu");
	await expect(mobileMenu).toBeVisible();
});
```

### 4. Manual Testing Checklist

Before deploying mobile UI changes, verify:

-   [ ] Menu opens and closes correctly on various mobile devices
-   [ ] Menu is properly positioned and doesn't detach
-   [ ] Icons display correctly (no hidden SVG elements)
-   [ ] No performance issues or jank
-   [ ] Works with reduced motion preferences
-   [ ] Properly handles screen orientation changes
-   [ ] No overlapping elements
-   [ ] Touch targets are appropriately sized

## Best Practices

### 1. Simplify Mobile Animations

-   Avoid complex motion libraries for simple state changes
-   Use CSS transitions instead of JavaScript animations when possible
-   Always respect `prefers-reduced-motion` media query

### 2. Proper Positioning

-   Use `position: fixed` with explicit top/left/right values
-   Avoid `100vh` units which include browser UI on mobile
-   Test on actual devices, not just simulators

### 3. Accessibility

-   Always include proper aria attributes
-   Ensure sufficient touch target sizes (minimum 44px)
-   Maintain keyboard navigation support

### 4. Performance

-   Lazy load non-critical components
-   Use `will-change` CSS property for animated elements
-   Debounce resize and scroll events

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific mobile component tests
npm run test:unit -- MobileMenu.test.tsx
```

### End-to-End Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific mobile tests
npm run test:e2e -- mobile-menu.test.ts
```

### Linting

```bash
# Run standard linting
npm run lint

# Run mobile-specific linting
npm run lint:mobile
```

## Troubleshooting

### Hidden Elements

If elements appear hidden:

1. Check for `opacity: 0` styles in dev tools
2. Verify transform properties aren't moving elements off-screen
3. Simplify animation implementations
4. Test on actual mobile devices

### Detached Menus

If menus detach:

1. Verify positioning strategy (fixed vs absolute)
2. Check viewport height calculations
3. Test with various screen sizes
4. Ensure proper scroll handling

### Performance Issues

If animations are janky:

1. Reduce animation complexity
2. Use hardware-accelerated CSS properties (transform, opacity)
3. Implement proper cleanup of event listeners
4. Test on lower-end devices

## Continuous Integration

All mobile UI tests are run automatically in CI:

-   Unit tests on every push
-   E2E tests on pull requests
-   Linting checks on every commit
-   Visual regression tests for critical components

This ensures that mobile UI issues are caught early in the development process.
