import { Page, Locator } from '@playwright/test';
import { appConfig } from '../../../config';
import { PageModel } from '../model/PageModel';

export interface RegistrationData {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  ssn: string;
  username: string;
  password: string;
  confirmPassword: string;
}

export class RegistrationPage extends PageModel {
  private page: Page;

  // Form field locators
  private firstNameInput: Locator;
  private lastNameInput: Locator;
  private addressInput: Locator;
  private cityInput: Locator;
  private stateInput: Locator;
  private zipCodeInput: Locator;
  private phoneInput: Locator;
  private ssnInput: Locator;
  private usernameInput: Locator;
  private passwordInput: Locator;
  private confirmPasswordInput: Locator;
  private registerButton: Locator;

  constructor(page: Page) {
    super(page.locator("div#customerForm"), 'register.htm');
    this.page = page;

    // Initialize locators - using table cell structure from the form
    this.firstNameInput = page.locator('input[name="customer.firstName"]');
    this.lastNameInput = page.locator('input[name="customer.lastName"]');
    this.addressInput = page.locator('input[name="customer.address.street"]');
    this.cityInput = page.locator('input[name="customer.address.city"]');
    this.stateInput = page.locator('input[name="customer.address.state"]');
    this.zipCodeInput = page.locator('input[name="customer.address.zipCode"]');
    this.phoneInput = page.locator('input[name="customer.phoneNumber"]');
    this.ssnInput = page.locator('input[name="customer.ssn"]');
    this.usernameInput = page.locator('input[name="customer.username"]');
    this.passwordInput = page.locator('input[name="customer.password"]');
    this.confirmPasswordInput = page.locator('input[name="repeatedPassword"]');
    this.registerButton = page.locator('input[type="submit"][value="Register"]');
  }

  /**
   * Fill in all registration fields and submit the form
   */
  async register(data: RegistrationData): Promise<void> {
    await this.firstNameInput.fill(data.firstName);
    await this.lastNameInput.fill(data.lastName);
    await this.addressInput.fill(data.address);
    await this.cityInput.fill(data.city);
    await this.stateInput.fill(data.state);
    await this.zipCodeInput.fill(data.zipCode);
    await this.phoneInput.fill(data.phone);
    await this.ssnInput.fill(data.ssn);
    await this.usernameInput.fill(data.username);
    await this.passwordInput.fill(data.password);
    await this.confirmPasswordInput.fill(data.confirmPassword);
    await this.registerButton.click();
  }

  /**
   * Convenience helper for creating a new account from the registration page
   */
  async registerUser(data: RegistrationData): Promise<void> {
    await this.register(data);
  }

  /**
   * Navigate to the registration page
   */
  async goto(): Promise<void> {
    const baseUrl = appConfig.baseUrl.endsWith('/') ? appConfig.baseUrl : `${appConfig.baseUrl}/`;
    const registrationUrl = new URL(this.urlPath, baseUrl).toString();
    await this.page.goto(registrationUrl);
  }
}
