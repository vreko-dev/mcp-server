import { defineConfig } from '@playwright/test';
import type { VSCodeTestOptions, VSCodeWorkerOptions } from 'vscode-test-playwright';
import path from 'path';

// Absolute path to the extension root
const extensionPath = path.resolve(__dirname, '../../apps/vscode');

export default defineConfig<VSCodeTestOptions, VSCodeWorkerOptions>({
  testDir: './flows',
  fullyParallel: false, // Sequential for VS Code stability
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for Extension Development Host
  timeout: 60000,

  reporter: [
    ['html', { outputFolder: '../../playwright-report/extension' }],
    ['json', { outputFile: '../../test-results/extension.json' }],
    ['list']
  ],

  use: {
    // Point to the extension we want to test
    extensionDevelopmentPath: extensionPath,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Open a workspace to ensure extension activates correctly
    // @ts-ignore
    launchArgs: [path.resolve(extensionPath, 'test-workspace')],
  },

  projects: [
    {
      name: 'vscode-insiders',
      use: { vscodeVersion: 'insiders' },
    },
    {
      name: 'vscode-stable',
      use: { vscodeVersion: 'stable' },
    },
  ],
});
