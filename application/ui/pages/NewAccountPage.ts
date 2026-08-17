import { Page, Locator } from '@playwright/test';
import { PageModel } from '../model/PageModel';

export class NewAccountPage extends PageModel {

    private constructor(page: Page) {
        super(page.locator("div#openAccountForm"));
    }

    getAccountTypeSelect() : Locator {
        return this.container.locator("select#type");
    }

    getFromAccountSelect() : Locator {
        return this.container.locator("select#fromAccountId");
    }

    getOpenNewAccountButton() : Locator {
        return this.container.locator("input[type='submit'][value='Open New Account']");
    }
}