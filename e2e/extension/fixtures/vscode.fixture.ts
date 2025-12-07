import { test as base, expect, type Page } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

export const test = base.extend<{
  vscode: { page: Page };
}>({
  vscode: async ({ }, use) => {
    // This fixture currently uses Electron launch directly as a fallback/alternative
    // The main extension tests use 'vscode-test-playwright' which handles this
    // This file is a placeholder for custom fixtures extending that base
    // for now we just export a simple object
    await use({ page: null as any });
  },
});

export { expect };
