import { Page } from "@playwright/test";
import { PageModel } from "./PageModel";

export class LeftMenu extends PageModel {

    private constructor(page: Page) {
        super(page.locator("ul.leftmenu"));
    }

    getMenuItems() {
        return this.container.locator("//li");
    }

    async clickMenuItemByText(text: string): Promise<void> {
        await this.container.locator(`//a[contains(text(), '${text}')]`).click();
    }

    async getMenuItemCount(): Promise<number> {
        return this.container.locator("//li").count();
    }
}
