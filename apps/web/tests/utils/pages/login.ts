import { expect, type Page } from "@playwright/test";

/**
 * Login Page Object Model
 * Updated to match ProtectionSnapshotLogin component UI
 */
export class LoginPage {
	readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	async goto() {
		await this.page.goto("/auth/login");
	}

	async fillEmail(email: string) {
		const emailInput = this.page.getByLabel(/email address/i);
		await emailInput.fill(email);
	}

	async clickContinueWithPassword() {
		const passwordButton = this.page.getByRole("button", { name: /continue with password/i });
		await passwordButton.click();
	}

	async fillPassword(password: string) {
		const passwordInput = this.page.getByLabel(/^password$/i);
		await expect(passwordInput).toBeVisible({ timeout: 3000 });
		await passwordInput.fill(password);
	}

	async clickSignIn() {
		const signInButton = this.page.getByRole("button", { name: /sign in/i });
		await signInButton.click();
	}

	async clickMagicLink() {
		const magicLinkButton = this.page.getByRole("button", { name: /magic link/i });
		await magicLinkButton.click();
	}

	async clickGitHub() {
		const githubButton = this.page.getByRole("button", { name: /github/i });
		await githubButton.click();
	}

	async clickGoogle() {
		const googleButton = this.page.getByRole("button", { name: /google/i });
		await googleButton.click();
	}

	async login(email: string, password: string) {
		await this.fillEmail(email);
		await this.clickContinueWithPassword();
		await this.fillPassword(password);
		await this.clickSignIn();
	}

	async expectErrorMessage(message: string) {
		await expect(this.page.getByText(message)).toBeVisible();
	}

	async expectSignInFailed() {
		await expect(this.page.getByText(/sign in failed/i)).toBeVisible({ timeout: 5000 });
	}

	async expectToBeOnLoginPage() {
		await expect(this.page).toHaveURL(/.*\/auth\/login/);
	}

	async expectToBeLoggedIn() {
		await expect(this.page).not.toHaveURL(/.*\/auth\/login/);
	}

	async expectWelcomeHeading() {
		await expect(this.page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
	}

	async clickForgotPassword() {
		const forgotPasswordButton = this.page.getByRole("button", { name: /forgot password/i });
		await forgotPasswordButton.click();
	}

	async switchToSignup() {
		const createAccountButton = this.page.getByRole("button", { name: /create one/i });
		await createAccountButton.click();
	}

	async switchToSignin() {
		const signInButton = this.page.getByRole("button", { name: /sign in/i });
		await signInButton.click();
	}

	async expectSuccessMessage() {
		await expect(this.page.getByText(/welcome!/i)).toBeVisible({ timeout: 5000 });
	}

	async expectProcessingState() {
		const loader = this.page.locator('svg[class*="animate-spin"]');
		await expect(loader).toBeVisible({ timeout: 2000 });
	}

	async expectMagicLinkSent() {
		await expect(this.page.getByText(/check your email/i)).toBeVisible({ timeout: 5000 });
	}

	async clickTryAgain() {
		const tryAgainButton = this.page.getByRole("button", { name: /try again/i });
		await tryAgainButton.click();
	}

	async clickBack() {
		const backButton = this.page.getByRole("button", { name: /back/i });
		await backButton.click();
	}
}
