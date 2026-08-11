import { Page, Frame } from '@playwright/test';
import { PageModel } from './PageModel';

export abstract class BoppPageModel extends PageModel {
    private static readonly PAGE_LOAD_FINDER = '//td[@align="center" and contains(text(), "Project is Loading")]';
    protected static readonly OUTER_FRAME_FINDER = '//frame[@name="ot_base"]';
    protected static readonly CONTENT_FRAME_FINDER = './/frame[@name="ot_content"]';
    protected static readonly TABS_FRAME_FINDER = './/frame[@name="ot_tabs"]';
    protected static readonly MENU_FRAME_FINDER = './/frame[@name="ot_menu"]';

    private outerFrame?: Frame;
    private contentFrame?: Frame;
    private tabsFrame?: Frame;
    private menuFrame?: Frame;

    constructor(page: Page) {
        super(page);
        this.initialize();
    }

    private async initialize(): Promise<void> {
        await this.handleAlert();
        await BoppPageModel.waitForPageLoad(this.page, BoppPageModel.PAGE_LOAD_FINDER);
        await this.switchToDefault();

        try {
            this.container = this.page.locator('//body');
        } catch (error) {
            // Ignore error
        }
    }

    protected static async handleAlert(page?: Page): Promise<void> {
        try {
            if (page) {
                page.once('dialog', dialog => dialog.accept());
            }
        } catch (error) {
            // Ignore if no alert present
        }
    }

    private async handleAlert(): Promise<void> {
        await BoppPageModel.handleAlert(this.page);
    }

    protected async switchToDefault(): Promise<void> {
        // In Playwright, we work with the main page context
        // Frame references are maintained separately
        this.outerFrame = undefined;
        this.contentFrame = undefined;
        this.tabsFrame = undefined;
        this.menuFrame = undefined;
    }

    private async switchToOuterFrame(): Promise<void> {
        await this.switchToDefault();

        try {
            this.outerFrame = this.page.frame({ name: 'ot_base' }) ?? undefined;
        } catch (error) {
            // Ignore error
        }
    }

    protected async switchToTabsFrame(): Promise<void> {
        await this.switchToDefault();

        try {
            this.tabsFrame = this.page.frame({ name: 'ot_tabs' }) ?? undefined;
            if (this.tabsFrame) {
                this.container = this.tabsFrame.locator('.//body');
            }
        } catch (error) {
            // Ignore error
        }
    }

    protected async switchToMenuFrame(): Promise<void> {
        await this.switchToOuterFrame();

        try {
            if (this.outerFrame) {
                this.menuFrame = this.outerFrame.childFrames().find(f => f.name() === 'ot_menu');
                if (this.menuFrame) {
                    this.container = this.menuFrame.locator('.//body');
                }
            }
        } catch (error) {
            // Ignore error
        }
    }

    protected async switchToContentFrame(): Promise<void> {
        await this.switchToOuterFrame();

        try {
            if (this.outerFrame) {
                this.contentFrame = this.outerFrame.childFrames().find(f => f.name() === 'ot_content');
                if (this.contentFrame) {
                    await this.contentFrame.locator('.//body').waitFor({ state: 'attached' });
                    this.container = this.contentFrame.locator('.//body');
                }
            }
        } catch (error) {
            // Ignore error
        }
    }

    protected async isDisplayed(): Promise<boolean> {
        if (!this.container) {
            return false;
        }
        return await this.container.isVisible();
    }
}