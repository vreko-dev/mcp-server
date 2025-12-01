# Playwright UI Testing Implementation Guide

This document provides comprehensive guidance on the Playwright UI testing implementation for the SnapBack application, covering visual regression testing, accessibility testing, interaction behavior testing, and responsive design validation.

## Overview

The Playwright testing suite is designed to capture and prevent loss of functionality by freezing UI behaviors, look and feel, and interactions through comprehensive snapshot testing and accessibility validation.

## Test Structure

The Playwright tests are organized in the following structure:

```
apps/web/tests/e2e/
├── critical/                    # Critical user path tests
├── ui-behavior-snapshot.spec.ts # UI behavior and snapshot testing
├── comprehensive-accessibility.spec.ts # Accessibility testing
├── component-snapshots.spec.ts  # Component-level snapshot testing
├── interaction-behaviors.spec.ts # Interaction behavior testing
├── responsive-design.spec.ts    # Responsive design testing
└── comprehensive-ui-testing.spec.ts # End-to-end journey testing
```

## Available Test Suites

### 1. UI Behavior and Snapshot Testing (`ui-behavior-snapshot.spec.ts`)

This test suite focuses on:

-   Visual regression testing with `toHaveScreenshot()`
-   Accessibility structure validation with `toMatchAriaSnapshot()`
-   UI state capture across different user interactions

**Key Features:**

-   Homepage visual regression testing
-   Dashboard state validation
-   Form validation and error states
-   Navigation and responsive behavior testing
-   Interactive component behavior validation

### 2. Comprehensive Accessibility Testing (`comprehensive-accessibility.spec.ts`)

This test suite provides thorough accessibility validation:

-   WCAG 2.0/2.1 A/AA compliance checking
-   Keyboard navigation testing
-   Screen reader compatibility
-   Color contrast validation
-   ARIA attribute verification
-   Form accessibility validation

**Note:** For full axe-core integration, run `pnpm install:accessibility` to install `@axe-core/playwright`.

### 3. Component Snapshots (`component-snapshots.spec.ts`)

This test suite validates individual UI components:

-   Button variants and states
-   Form elements and validation states
-   Card components and layouts
-   Navigation components
-   Data display components

### 4. Interaction Behaviors (`interaction-behaviors.spec.ts`)

This test suite captures dynamic UI behaviors:

-   Form validation workflows
-   Dropdown and select interactions
-   Modal and overlay behaviors
-   Accordion and expandable content
-   Loading and skeleton states

### 5. Responsive Design Testing (`responsive-design.spec.ts`)

This test suite validates responsive behavior:

-   Cross-viewport compatibility
-   Mobile-first design validation
-   Touch interaction testing
-   Responsive navigation patterns
-   Data table responsiveness

### 6. Comprehensive UI Testing (`comprehensive-ui-testing.spec.ts`)

This test suite provides end-to-end journey validation:

-   Full user signup to API usage flow
-   Error handling and recovery
-   Keyboard navigation validation
-   Performance and loading states
-   Internationalization readiness

## Running Tests

### All Playwright Tests

```bash
cd apps/web
pnpm e2e
```

### Specific Test Suites

```bash
# UI Behavior and Snapshot Tests
pnpm e2e:ui

# Accessibility Tests
pnpm e2e:accessibility

# Component Snapshot Tests
pnpm e2e:components

# Interaction Behavior Tests
pnpm e2e:interactions

# Responsive Design Tests
pnpm e2e:responsive

# Comprehensive UI Tests
pnpm e2e:comprehensive

# Critical Path Tests
pnpm e2e:critical
```

### Installing Accessibility Dependencies

```bash
cd apps/web
pnpm install:accessibility
```

## Configuration

The Playwright configuration has been optimized for snapshot testing:

### Key Configuration Options

1. **Screenshot Settings:**

    - `maxDiffPixels`: 50 (maximum allowed pixel differences)
    - `maxDiffPixelRatio`: 0.01 (1% maximum difference ratio)
    - `animations`: "disabled" (consistent screenshots)
    - `caret`: "hide" (hide cursor for consistency)

2. **Timeout Settings:**

    - `expect.timeout`: 10000ms (10 seconds for assertions)

3. **Snapshot Paths:**
    - Custom path template for ARIA snapshots
    - Organized snapshot directory structure

## Best Practices

### 1. Visual Regression Testing

-   Use `toHaveScreenshot()` for page and component snapshots
-   Set appropriate `maxDiffPixels` based on expected variations
-   Test across multiple viewports for responsive validation
-   Use `fullPage: true` for comprehensive page captures

### 2. Accessibility Testing

-   Use `toMatchAriaSnapshot()` for structural validation
-   Test keyboard navigation flows
-   Validate ARIA attributes and roles
-   Check color contrast ratios
-   Verify proper heading hierarchy

### 3. Interaction Testing

-   Capture state changes through screenshots
-   Test hover, focus, and active states
-   Validate form validation workflows
-   Test error handling and recovery

### 4. Responsive Testing

-   Test across common device viewports
-   Validate mobile-specific interactions
-   Check content reflow and adaptation
-   Test touch-friendly interactions

## Snapshot Management

### Updating Snapshots

When UI changes are intentional, update snapshots using:

```bash
pnpm exec playwright test --update-snapshots
```

### Snapshot Organization

Snapshots are organized by:

-   Test file name
-   Test case name
-   Viewport size (for responsive tests)
-   Interaction state

## Integration with CI/CD

The Playwright tests are configured to:

-   Run in headless mode in CI environments
-   Generate HTML reports for test results
-   Capture videos of failed tests
-   Generate trace files for debugging
-   Retry failed tests once in CI

## Future Enhancements

### 1. Cross-Browser Testing

Additional browser projects can be enabled in `playwright.config.ts`:

-   Firefox support
-   Safari/WebKit support
-   Mobile browser testing

### 2. Advanced Accessibility Testing

With `@axe-core/playwright` installed:

-   Automated WCAG compliance checking
-   Custom rule configuration
-   Violation fingerprinting for stable tests

### 3. Performance Testing Integration

-   Load testing scenarios
-   Performance regression detection
-   Resource usage monitoring

## Troubleshooting

### Common Issues

1. **Snapshot Differences:**

    - Review visual changes in HTML report
    - Update snapshots if changes are intentional
    - Check for unintended visual regressions

2. **Accessibility Failures:**

    - Review ARIA snapshot differences
    - Validate HTML structure changes
    - Check for missing accessibility attributes

3. **Timeout Issues:**
    - Increase timeout values for slow interactions
    - Add explicit waits for dynamic content
    - Check network conditions

### Debugging Tips

1. **Run in UI Mode:**

    ```bash
    pnpm e2e --ui
    ```

2. **Enable Debug Logging:**

    ```bash
    DEBUG=pw:api pnpm e2e
    ```

3. **View Trace Files:**
    ```bash
    pnpm exec playwright show-trace test-results/<trace-file>
    ```

## Conclusion

This Playwright testing implementation provides comprehensive coverage for UI behavior, look and feel, and interaction validation. By leveraging visual regression testing, accessibility validation, and interaction behavior capture, the test suite effectively prevents loss of functionality and maintains UI consistency across changes.
