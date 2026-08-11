import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://apps-qa.bop.utah.gov/otrack/loginPrompt.jsp');
  await page.getByRole('link', { name: 'log in again' }).click();
  await page.getByRole('textbox', { name: 'user@utah.gov' }).fill('robertbirch@utah.gov');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('textbox', { name: 'Enter the password for' }).click();
  await page.getByRole('textbox', { name: 'Enter the password for' }).fill('m@ilKcin222628@');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Approve a request on my' }).click();
  await page.goto('https://apps-qa.bop.utah.gov/otrack/loginSelect.do');
  await page.getByRole('textbox', { name: 'Impersonate a different user' }).click();
  await page.getByRole('textbox', { name: 'Impersonate a different user' }).fill('rlizon');
  await page.getByText('RAECHEL LIZON (rlizon) - NON-').click();
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('button', { name: 'Application Logon' }).click();
  await expect(page.locator('frame[name="ot_base"]').contentFrame().locator('frame[name="ot_content"]').contentFrame().getByRole('cell', { name: 'Offender Search', exact: true })).toBeVisible();
});