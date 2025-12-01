import { expect, type Page } from "@playwright/test";

export class LoginPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async goto() {
		await this.page.goto("/auth/login");
	}

	async fillEmail(email: string) {
		await this.page.getByLabel("Email").fill(email);
	}

	async fillPassword(password: string) {
		await this.page.getByLabel("Password").fill(password);
	}

	async clickSignIn() {
		await this.page.getByRole("button", { name: "Sign in" }).click();
	}

	async login(email: string, password: string) {
		await this.fillEmail(email);
		await this.fillPassword(password);
		await this.clickSignIn();
	}

	async expectErrorMessage(message: string) {
		await expect(this.page.getByText(message)).toBeVisible();
	}

	async expectToBeOnLoginPage() {
		await expect(this.page).toHaveURL(/.*\/auth\/login/);
	}

	async expectToBeLoggedIn() {
		await expect(this.page).not.toHaveURL(/.*\/auth\/login/);
	}

	async clickForgotPassword() {
		await this.page.getByRole("link", { name: "Forgot password?" }).click();
	}

	async clickSignUp() {
		await this.page.getByRole("link", { name: "Sign up" }).click();
	}
}
