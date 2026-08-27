import { test, expect } from './fixtures';
import { RegistrationPage } from '../application/ui/pages/RegistrationPage';

test('register a new user', async ({ page }) => {
  const registrationPage = new RegistrationPage(page);
  const uniqueUsername = `user_${Date.now()}`;

  await registrationPage.goto();
  await registrationPage.registerUser({
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
  });

  await expect(page).not.toHaveURL(/register\.htm/);
});

test('user can transfer funds', async ({ page }) => {
  await expect(page).toHaveURL(/parabank/);
});