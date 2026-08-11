import { Page, Locator, FrameLocator } from '@playwright/test';

export abstract class PageModel {
    protected static readonly TIMEOUT = 20000; // 20 seconds in milliseconds
    protected page: Page;
    protected container?: Locator;

    constructor(page: Page) {
        this.page = page;
    }

    protected async waitForElement(selector: string, timeout: number = 20000): Promise<Locator> {
        const locator = this.page.locator(selector);
        await locator.waitFor({ state: 'attached', timeout });
        return locator;
    }

    protected static async waitForElementToBeDisplayed(page: Page, selector: string): Promise<void> {
        await page.locator(selector).waitFor({ state: 'visible', timeout: PageModel.TIMEOUT });
    }

    protected static async waitForElementToBeClickable(locator: Locator): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 500));
        await locator.waitFor({ state: 'visible', timeout: PageModel.TIMEOUT });
    }

    protected static async waitForInvisibilityOfElement(page: Page, selector: string): Promise<void> {
        try {
            await page.locator(selector).waitFor({ state: 'hidden', timeout: PageModel.TIMEOUT });
        } catch (error) {
            // Ignore UnhandledAlertException equivalent
        }
    }

    protected static async waitForPageLoad(page: Page, selector: string): Promise<void> {
        try {
            await page.locator(selector).waitFor({ state: 'hidden', timeout: PageModel.TIMEOUT });
        } catch (error) {
            // Ignore errors during page load wait
        }
    }

    protected async waitForStaleElement(selector: string): Promise<void> {
        await this.page.locator(selector).waitFor({ state: 'visible', timeout: 20000 });
    }

    protected static async selectAll(locator: Locator): Promise<void> {
        await locator.press('Control+a');
    }

    protected static async selectRandomOption(selectLocator: Locator): Promise<string> {
        let selections: string[] = [];

        while (selections.length === 0) {
            try {
                const options = await selectLocator.locator('option').allTextContents();
                selections = options.filter(text => !text.includes('...'));
            } catch (error) {
                selections = [];
            }
        }

        // Shuffle array
        const shuffled = selections.sort(() => Math.random() - 0.5);
        const selection = shuffled[0];
        await selectLocator.selectOption({ label: selection });
        return selection;
    }

    protected static async enterRandomDate(
        dateInput: Locator,
        minDaysToAdd: number = 0,
        maxDaysToAdd: number = 1,
        datePattern: string = 'MM/dd/yyyy'
    ): Promise<string> {
        const classAttr = await dateInput.getAttribute('class');

        if (classAttr?.toLowerCase().includes('datepicker')) {
            const today = new Date();
            const days = Math.floor(Math.random() * (maxDaysToAdd - minDaysToAdd)) + minDaysToAdd;
            const date = new Date(today);
            date.setDate(today.getDate() + days);

            await dateInput.click();
            const formattedDate = this.formatDate(date, datePattern);
            await dateInput.fill(formattedDate);
            await dateInput.press('Tab');

            if (!datePattern.includes('/dd/')) {
                date.setDate(1); // First day of month
            }

            return date.toISOString().split('T')[0];
        }

        return '';
    }

    private static formatDate(date: Date, pattern: string): string {
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();

        return pattern
            .replace('MM', month)
            .replace('dd', day)
            .replace('yyyy', String(year));
    }

    protected static async acceptAlert(page: Page): Promise<void> {
        await new Promise(resolve => setTimeout(resolve, 100));
        try {
            page.once('dialog', dialog => dialog.accept());
        } catch (error) {
            // Ignore if no alert present
        }
    }
}