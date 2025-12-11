This is the final piece of the puzzle.

Running VS Code Extension tests (Electron) in a headless CI environment (like GitHub Actions) is notorious for failing because Electron requires a display server to render the UI, even if you aren't looking at it.

Here is the robust **GitHub Actions Workflow** that handles the **XVFB (X Virtual Framebuffer)** setup, **Turborepo caching**, and the specific execution order you requested.

### The Workflow File

**File:** `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: ["main"]
  pull_request:
    branches: ["main"]

# optimize: cancel previous runs if a new commit is pushed to the same PR
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ========================================================================
  # JOB 1: Code Quality (Fastest Feedback)
  # Lint, Format, Typecheck, and Unit Tests
  # ========================================================================
  quality:
    name: 🔍 Quality & Unit Tests
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4

      - name: Setup Node.js & pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint & Typecheck (Turbo)
        # Assumes you have these scripts in your root package.json or turbo pipeline
        run: pnpm turbo run lint type-check

      - name: Unit Tests
        run: pnpm test # Runs vitest suite

  # ========================================================================
  # JOB 2: E2E Testing (The Heavy Lifter)
  # Builds the App & Extension, then runs Playwright in XVFB
  # ========================================================================
  e2e-tests:
    name: 🎭 E2E Integration
    needs: quality # Only run if quality checks pass
    runs-on: ubuntu-latest
    timeout-minutes: 20 # Safety cap
    container:
      # Use the official Playwright container to avoid dependency hell
      # It comes pre-installed with browsers and necessary system libs
      image: mcr.microsoft.com/playwright:v1.44.0-jammy

    steps:
      - name: Checkout Repo
        uses: actions/checkout@v4

      # Note: We need to reinstall node/pnpm because we are in a fresh container
      - name: Setup Node.js & pnpm
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install -g pnpm

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      # --------------------------------------------------------------------
      # 1. Build Phase
      # --------------------------------------------------------------------
      - name: Build Web & Extension
        run: pnpm turbo run build
        env:
          # Ensure Next.js builds in production mode for the test
          NEXT_PUBLIC_API_URL: http://localhost:3000

      # --------------------------------------------------------------------
      # 2. Setup VS Code for Testing
      # --------------------------------------------------------------------
      # If your tests need a real VS Code binary, we can fetch a stable version.
      # (Optional: If your 'cross-surface.spec.ts' relies on a specific path)
      - name: Setup VS Code (Optional)
        run: |
          npx @vscode/test-electron --help # Or use a script to fetch the binary if needed
          # Ensure VSCODE_EXECUTABLE_PATH is set if you downloaded it manually

      # --------------------------------------------------------------------
      # 3. Run E2E Tests (with XVFB)
      # --------------------------------------------------------------------
      - name: Run Playwright Tests
        # xvfb-run creates a virtual display (server :99) for Electron/Chrome
        run: xvfb-run --auto-servernum --server-args="-screen 0 1280x960x24" pnpm test:e2e
        env:
          # Inject CI-specific Env Vars
          CI: true
          # VS Code often needs this to run headlessly without GPU issues
          ELECTRON_ENABLE_LOGGING: true

      # --------------------------------------------------------------------
      # 4. Artifacts (Debugging)
      # --------------------------------------------------------------------
      - name: Upload Playwright Report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### Key Technical Decisions Explained

1.  **The Playwright Container (`mcr.microsoft.com/playwright`)**

      * **Why:** Installing browser dependencies (libraries, codecs) on a raw Ubuntu runner is slow and flaky. The official container guarantees that WebKit, Chromium, and Firefox will work immediately.
      * **Benefit:** Reduces CI runtime by 2–3 minutes per run.

2.  **`xvfb-run` (The Critical Piece)**

      * **Why:** VS Code is an Electron app. Electron *requires* a display server to launch, even in "headless" testing scenarios. GitHub Actions runners are headless (no monitor).
      * **How it works:** `xvfb-run` creates a virtual screen in memory. The arguments `-screen 0 1280x960x24` give it a virtual resolution high enough to render your dashboard and VS Code side-by-side without responsive layout quirks hiding elements.

3.  **`needs: quality`**

      * **Strategy:** E2E tests are expensive (time and compute). We fail fast if the linting or unit tests break, saving you "billable minutes" on GitHub Actions.

### Final Verification

You have now successfully implemented the entire "Demo-Ready" E2E Infrastructure Plan:

1.  **Fixed Extension Auth:** `SnapBackExplorerTreeProvider.ts` is robust.
2.  **Unified Config:** `playwright.config.ts` handles the "Test Pyramid."
3.  **Cross-Surface Test:** `cross-surface.spec.ts` verifies the full loop.
4.  **Web Auth Flows:** `auth.spec.ts` covers the front door.
5.  **CI/CD Pipeline:** `.github/workflows/ci.yml` automates it all.

### Your Next Step

Commit these files. When you push, navigate to the **Actions** tab in GitHub.

If the `E2E Integration` job passes, your project is officially **Demo-Ready** with enterprise-grade quality assurance.

