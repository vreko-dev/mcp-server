import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },

  projects: [
    // Web projects
    {
      name: 'web-chromium',
      testDir: './web/flows',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'web-firefox',
      testDir: './web/flows',
      use: { ...devices['Desktop Firefox'] },
    },
    // {
    //   name: 'web-mobile',
    //   testDir: './web/flows',
    //   use: { ...devices['iPhone 13'] },
    // },

    // Docs projects
    {
      name: 'docs-chromium',
      testDir: './docs/flows',
      use: { ...devices['Desktop Chrome'] },
    },

    // Extension project (special config will be used usually, but keeping here for visibility if needed)
    // {
    //   name: 'extension',
    //   testDir: './extension/flows',
    // },
  ],
});
