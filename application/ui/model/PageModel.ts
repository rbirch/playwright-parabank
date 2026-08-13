import { Locator, Page } from "@playwright/test";

export abstract class PageModel {
  
    protected container: Locator;

    constructor(container: Locator) {
        this.container = container;
    }

    // Visibility & State
    async isVisible(): Promise<boolean> {
        return this.container.isVisible();
    }

    async isEnabled(): Promise<boolean> {
        return this.container.isEnabled();
    }

    async waitForElement(): Promise<void> {
        await this.container.waitFor();
    }

    async getAttribute(name: string): Promise<string | null> {
        return this.container.getAttribute(name);
    }

    // Interactions
    async click(): Promise<void> {
        await this.container.click();
    }

    async hover(): Promise<void> {
        await this.container.hover();
    }

    async screenshot(name?: string): Promise<Buffer> {
        return this.container.screenshot();
    }

    // Utilities
    async getChildCount(selector: string): Promise<number> {
        return this.container.locator(selector).count();
    }

}