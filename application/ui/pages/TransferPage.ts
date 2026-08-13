import { Page, Locator } from "@playwright/test";
import { PageModel } from "../model/PageModel";

export class TransferPage extends PageModel {

    constructor(page: Page) {
        super(page.locator("div#transferApp"));
    }

    getAmountInput() : Locator {
        return this.container.locator("input#amount");
    }

    getFromAccountSelect() : Locator {
        return this.container.locator("select#fromAccountId");
    }

    getToAccountSelect() : Locator {
        return this.container.locator("select#toAccountId");
    }

    getTransferButton() : Locator {
        return this.container.locator("input[type='submit'][value='Transfer']");
    }

    getTransferMessage() : Locator {
        return this.container.locator("div#showResult > p");
    }

    async transferFunds(amount: string, fromAccount: string, toAccount: string): Promise<void> {
        await this.getAmountInput().fill(amount);
        await this.getFromAccountSelect().selectOption({ label: fromAccount });
        await this.getToAccountSelect().selectOption({ label: toAccount });
        await this.getTransferButton().click();
    }

}

