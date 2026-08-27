import { Page, Locator } from '@playwright/test';
import { PageModel } from '../model/PageModel';

export class LoginPage extends PageModel {

    private constructor(page: Page) {
        super(page.locator("div#loginPanel"));
    }

    getUsernameInput() : Locator {
        return this.container.locator("input[name='username']");
    }

    getPasswordInput() : Locator {
        return this.container.locator("input[name='password']");
    }

    getLoginButton() : Locator {
        return this.container.locator("input[type='submit'][value='Log In']");
    }

    async login(username: string, password: string): Promise<void> {
        await this.getUsernameInput().fill(username);
        await this.getPasswordInput().fill(password);
        await this.getLoginButton().click();
    }
}