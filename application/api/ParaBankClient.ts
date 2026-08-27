// api/ParaBankApiClient.ts
import { APIRequestContext, expect } from '@playwright/test';

const PARABANK_BASE_URL = '/parabank/services/bank';

export interface Account {
  id: number;
  customerId: number;
  type: string;
  balance: number;
}

export class ParaBankApiClient {
  constructor(private request: APIRequestContext) {}

  /**
   * 
   * @param customerId 
   * @param newAccountType 
   * @param fromAccountId 
   * @returns new account information
   */
  async createAccount(customerId: number, newAccountType: number, fromAccountId: number): Promise<Account> {
    const response = await this.request.post(
      `${PARABANK_BASE_URL}/createAccount?customerId=${customerId}&newAccountType=${newAccountType}&fromAccountId=${fromAccountId}`
    );
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  /**
   * Fetch all accounts for a specific customer
   */
  async getAccounts(customerId: number): Promise<Account[]> {
    const response = await this.request.get(
      `${PARABANK_BASE_URL}/customers/${customerId}/accounts`
    );
    expect(response.ok()).toBeTruthy();
    return await response.json();
  }

  /**
   * Validate account balance directly via API
   */
  async verifyAccountBalance(accountId: number, expectedBalance: number) {
    const response = await this.request.get(
      `${PARABANK_BASE_URL}/accounts/${accountId}`
    );
    expect(response.ok()).toBeTruthy();
    const account: Account = await response.json();
    expect(account.balance).toBe(expectedBalance);
  }

  
}