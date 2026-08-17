import { test as base, expect } from '@playwright/test';
import { gotoApp } from './helpers/navigation';

export const test = base.extend({
  page: async ({ page }, use) => {
    await gotoApp(page);
    await use(page);
  },
});

export { expect };
