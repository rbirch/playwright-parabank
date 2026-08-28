import { Locator } from "@playwright/test";
import { appConfig } from '../../../config';

export abstract class PageModel {
    protected container: Locator;
    protected urlPath: string;

    constructor(container: Locator, urlPath: string) {
        this.container = container;
        this.urlPath = urlPath.replace(/^\/+/, '');
    }

    protected getFullUrl(): string {
        const baseUrl = new URL(appConfig.baseUrl.endsWith('/') ? appConfig.baseUrl : `${appConfig.baseUrl}/`);
        return new URL(this.urlPath.replace(/^\/+/, ''), baseUrl).toString();
    }

    async goto(): Promise<void> {
        await this.container.page().goto(this.getFullUrl());
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