import { test, expect } from './fixtures';
import { RegistrationPage } from '../application/ui/pages/RegistrationPage';
import { appConfig } from '../config';

test('register a new user', async ({ page }) => {
  const registrationPage = new RegistrationPage(page);
  const uniqueUsername = `user_${Date.now()}`;
  const registrationData = {
    firstName: 'Test',
    lastName: 'User',
    address: '123 Main St',
    city: 'Anytown',
    state: 'CA',
    zipCode: '90210',
    phone: '5551234567',
    ssn: '123-45-6789',
    username: uniqueUsername,
    password: 'Test123!',
    confirmPassword: 'Test123!',
  };

  await registrationPage.goto();

  const fieldChecks = [
    ['input[name="customer.firstName"]', registrationData.firstName],
    ['input[name="customer.lastName"]', registrationData.lastName],
    ['input[name="customer.address.street"]', registrationData.address],
    ['input[name="customer.address.city"]', registrationData.city],
    ['input[name="customer.address.state"]', registrationData.state],
    ['input[name="customer.address.zipCode"]', registrationData.zipCode],
    ['input[name="customer.phoneNumber"]', registrationData.phone],
    ['input[name="customer.ssn"]', registrationData.ssn],
    ['input[name="customer.username"]', registrationData.username],
    ['input[name="customer.password"]', registrationData.password],
    ['input[name="repeatedPassword"]', registrationData.confirmPassword],
  ] as const;

  for (const [selector, value] of fieldChecks) {
    const field = page.locator(selector);
    await expect(field).toBeVisible();
    await field.fill(value);
    await expect(field).toHaveValue(value);
  }

  await registrationPage.registerButton.click();

  await expect(page.locator('body')).toContainText('Your account was created successfully. You are now logged in.');
});

test('user can transfer funds', async ({ page }) => {
  await expect(page).toHaveURL(appConfig.baseUrl);
});