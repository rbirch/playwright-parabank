import { test, expect } from './fixtures';

test('user can transfer funds', async ({ page }) => {
  await expect(page).toHaveURL(/parabank/);
});