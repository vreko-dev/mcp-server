import { test as base, expect } from '@playwright/test';
import { AuthFixture, createAuthFixture } from './auth.fixture';
import { ApiFixture, createApiFixture } from './api.fixture';
import { TEST_USERS, TEST_WORKSPACES } from './test-data';

export interface SnapBackFixtures {
  auth: AuthFixture;
  api: ApiFixture;
  testUser: typeof TEST_USERS.default;
  testWorkspace: typeof TEST_WORKSPACES.default;
}

export const test = base.extend<SnapBackFixtures>({
  auth: async ({ page, context }, use) => {
    const auth = createAuthFixture(page, context);
    await use(auth);
  },

  api: async ({ request }, use) => {
    const api = createApiFixture(request);
    await use(api);
  },

  testUser: async ({}, use) => {
    await use(TEST_USERS.default);
  },

  testWorkspace: async ({}, use) => {
    await use(TEST_WORKSPACES.default);
  },
});

export { expect };
