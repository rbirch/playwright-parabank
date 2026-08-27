import { Page } from '@playwright/test';
import { appConfig } from '../../config';

export async function gotoApp(page: Page) {
  const baseUrl = appConfig.baseUrl;

  if (!baseUrl) {
    throw new Error('BASE_URL is not defined. Check your .env file.');
  }

  await page.goto(baseUrl);
}
