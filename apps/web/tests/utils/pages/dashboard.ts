import { expect, type Page } from "@playwright/test";

export class DashboardPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async goto() {
		await this.page.goto("/app/dashboard");
	}

	async expectToBeOnDashboard() {
		await expect(this.page).toHaveURL(/.*\/app\/dashboard/);
	}

	async expectWelcomeMessage(name: string) {
		await expect(
			this.page.getByRole("heading", { name: `Welcome, ${name}` }),
		).toBeVisible();
	}

	async clickApiKeyMenu() {
		await this.page.getByRole("link", { name: "API Keys" }).click();
	}

	async clickSettingsMenu() {
		await this.page.getByRole("link", { name: "Settings" }).click();
	}

	async clickProfileMenu() {
		await this.page.getByRole("button", { name: "User menu" }).click();
	}

	async clickLogout() {
		await this.clickProfileMenu();
		await this.page.getByRole("menuitem", { name: "Sign out" }).click();
	}

	async expectMetricCardVisible(metricName: string) {
		await expect(this.page.getByTestId(`metric-${metricName}`)).toBeVisible();
	}

	async expectMetricValue(metricName: string, value: string) {
		await expect(this.page.getByTestId(`metric-${metricName}`)).toContainText(
			value,
		);
	}

	async clickEmptyStateCta() {
		await this.page.getByTestId("empty-state-cta").click();
	}

	async expectEmptyStateVisible() {
		await expect(this.page.getByTestId("empty-dashboard")).toBeVisible();
	}
}
