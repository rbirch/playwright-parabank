import { Page } from '@playwright/test';


export async function gotoApp(page: Page) {
  const baseUrl = process.env.BASE_URL;

  if (!baseUrl) {
    throw new Error('BASE_URL is not defined. Check your .env file.');
  }

  await page.goto(baseUrl);
}
