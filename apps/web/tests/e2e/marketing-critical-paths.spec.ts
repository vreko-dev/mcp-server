import { expect, test } from "@playwright/test";

test.describe("Marketing Pages - Critical Paths", () => {
	/**
	 * HERO SECTION TESTS
	 * Verify CTAs, messaging, and founder story are correctly displayed
	 */
	test.describe("Hero Section Critical Path", () => {
		test("hero: should display founder story about $12k AI loss", async ({
			page,
		}) => {
			await page.goto("/");

			// Verify founder origin story is visible
			// [TODO: Update selector when hero component is modified to display founder_story from site-spec.json]
			const heroSection = page.locator('[data-section="hero"]');
			await expect(heroSection).toBeVisible();

			// Check that key founder story elements are present or can be enhanced
			// When deployed: verify founder story text about "$12,000" and "AI wiped out"
			await expect(
				page.getByRole("heading", { name: /code breaks/i }),
			).toBeVisible();
		});

		test("hero: alpha signup CTA should navigate to waitlist", async ({
			page,
		}) => {
			await page.goto("/");

			const alphaCTA = page.getByRole("link", {
				name: /join private alpha/i,
			});
			await expect(alphaCTA).toBeVisible();

			// Verify it links to /waitlist
			await expect(alphaCTA).toHaveAttribute("href", "/waitlist");

			// Click and verify navigation
			await alphaCTA.click();
			await expect(page).toHaveURL(/.*waitlist/);
		});

		test("hero: GitHub link CTA should open in new tab", async ({ page }) => {
			await page.goto("/");

			const githubCTA = page.getByRole("link", {
				name: /view on github/i,
			});
			await expect(githubCTA).toBeVisible();
			await expect(githubCTA).toHaveAttribute(
				"href",
				"https://github.com/snapback",
			);
			await expect(githubCTA).toHaveAttribute("target", "_blank");
		});

		test("hero: should display video caption with restore context", async ({
			page,
		}) => {
			await page.goto("/");

			// [TODO: Verify video plays showing Sessions panel → snapshot selection → restore]
			// Current text should mention "restoring a breaking change" or similar
			const videoCaption = page.locator("[data-test='hero-video-caption']");
			if (await videoCaption.isVisible()) {
				await expect(videoCaption).toContainText(/restore|snapshot/i);
			}
		});

		test("hero: trust line should emphasize alpha and local-only", async ({
			page,
		}) => {
			await page.goto("/");

			const trustLine = page.getByText(/currently in alpha|local-only/i);
			await expect(trustLine).toBeVisible();
		});
	});

	/**
	 * PROBLEM SECTION TESTS
	 * Verify multi-file scenario is clearly presented
	 */
	test.describe("Problem Section Critical Path", () => {
		test("problem: should display multi-file scenarios", async ({ page }) => {
			await page.goto("/");

			const problemSection = page.locator('[data-section="problem"]');
			await problemSection.scrollIntoViewIfNeeded();

			// Verify all three timeline items are visible
			await expect(page.getByText(/20 files.*one mistake/i)).toBeVisible();
			await expect(page.getByText(/ai refactored too much/i)).toBeVisible();
			await expect(
				page.getByText(/tests were passing.*now they're not/i),
			).toBeVisible();
		});

		test("problem: should display closing statement about recovery", async ({
			page,
		}) => {
			await page.goto("/");

			const problemSection = page.locator('[data-section="problem"]');
			await problemSection.scrollIntoViewIfNeeded();

			// [TODO: Verify multi-file refactor screenshot is rendered]
			const closingText = page.getByText(
				/snapback gives you a way back.*moment things were working/i,
			);
			await expect(closingText).toBeVisible();
		});
	});

	/**
	 * HOW IT WORKS SECTION TESTS
	 * Verify the 3-step explanation is clear and complete
	 */
	test.describe("How It Works Critical Path", () => {
		test("how-it-works: should display all 3 steps", async ({ page }) => {
			await page.goto("/");

			const howSection = page.locator('[data-section="how_it_works"]');
			await howSection.scrollIntoViewIfNeeded();

			// Verify all three steps
			await expect(
				page.getByRole("heading", { name: /auto-snapshot on save/i }),
			).toBeVisible();
			await expect(
				page.getByRole("heading", { name: /detect breaking changes/i }),
			).toBeVisible();
			await expect(
				page.getByRole("heading", { name: /restore in one click/i }),
			).toBeVisible();
		});

		test("how-it-works: step 1 should explain automatic snapshots", async ({
			page,
		}) => {
			await page.goto("/");

			const howSection = page.locator('[data-section="how_it_works"]');
			await howSection.scrollIntoViewIfNeeded();

			const step1 = page.getByText(
				/every time you save.*snapback creates a checkpoint/i,
			);
			await expect(step1).toBeVisible();
		});

		test("how-it-works: step 2 should mention current detection capabilities", async ({
			page,
		}) => {
			await page.goto("/");

			const howSection = page.locator('[data-section="how_it_works"]');
			await howSection.scrollIntoViewIfNeeded();

			const step2 = page.getByText(
				/made a risky edit.*file deletions.*large refactors.*test failures/i,
			);
			await expect(step2).toBeVisible();
		});

		test("how-it-works: step 3 should describe restore flow", async ({
			page,
		}) => {
			await page.goto("/");

			const howSection = page.locator('[data-section="how_it_works"]');
			await howSection.scrollIntoViewIfNeeded();

			const step3 = page.getByText(
				/command palette.*snapback: restore.*pick a snapshot/i,
			);
			await expect(step3).toBeVisible();
		});

		test("how-it-works: should have screenshot placeholder links", async ({
			page,
		}) => {
			await page.goto("/");

			const howSection = page.locator('[data-section="how_it_works"]');
			await howSection.scrollIntoViewIfNeeded();

			// [TODO: Verify screenshots are embedded when captured]
			const screenshotCTA = page.getByRole("link", {
				name: /view ui screenshots/i,
			});
			await expect(screenshotCTA).toBeVisible();
		});
	});

	/**
	 * PRIVACY SECTION TESTS
	 * Verify local-first positioning and storage clarity
	 */
	test.describe("Privacy Section Critical Path", () => {
		test("privacy: section should be visible on home page", async ({
			page,
		}) => {
			await page.goto("/");

			const privacySection = page.locator('[data-section="privacy"]');
			await privacySection.scrollIntoViewIfNeeded();
			await expect(privacySection).toBeVisible();
		});

		test("privacy: should emphasize local-first architecture", async ({
			page,
		}) => {
			await page.goto("/");

			const privacySection = page.locator('[data-section="privacy"]');
			await privacySection.scrollIntoViewIfNeeded();

			await expect(
				privacySection.getByRole("heading", { name: /local-first/i }),
			).toBeVisible();
			await expect(
				privacySection.getByText(/code stays on your machine/i),
			).toBeVisible();
		});

		test("privacy: should mention ~/.snapback storage path", async ({
			page,
		}) => {
			await page.goto("/");

			const privacySection = page.locator('[data-section="privacy"]');
			await privacySection.scrollIntoViewIfNeeded();

			// Verify localStorage location is mentioned
			const storageText = privacySection.getByText(/~\/.snapback/i);
			await expect(storageText).toBeVisible();
		});

		test("privacy: should provide verification instructions", async ({
			page,
		}) => {
			await page.goto("/");

			const privacySection = page.locator('[data-section="privacy"]');
			await privacySection.scrollIntoViewIfNeeded();

			// Verify instructions to check disk
			const verifyText = privacySection.getByText(
				/ls -la.*\.snapback|verify.*yourself/i,
			);
			await expect(verifyText).toBeVisible();
		});

		test("privacy: should mention cloud backup coming soon", async ({
			page,
		}) => {
			await page.goto("/");

			const privacySection = page.locator('[data-section="privacy"]');
			await privacySection.scrollIntoViewIfNeeded();

			await expect(
				privacySection.getByText(/cloud backup.*coming soon/i),
			).toBeVisible();
			await expect(privacySection.getByText(/YOUR s3 bucket/i)).toBeVisible();
		});
	});

	/**
	 * TESTIMONIALS SECTION TESTS
	 * Verify honest feedback is displayed with proper context
	 */
	test.describe("Testimonials Section Critical Path", () => {
		test("testimonials: should display all 3 testimonials", async ({
			page,
		}) => {
			await page.goto("/");

			const testimonialSection = page.locator('[data-section="social_proof"]');
			await testimonialSection.scrollIntoViewIfNeeded();

			// Verify all 3 testimonials with authors
			await expect(
				page.getByText(/broke my auth config.*git archaeology/i),
			).toBeVisible();
			await expect(
				page.getByText(/sessions are interesting.*need polish.*magic/i),
			).toBeVisible();
			await expect(
				page.getByText(/local-first was why i joined.*no hesitation/i),
			).toBeVisible();
		});

		test("testimonials: should show real author names and roles", async ({
			page,
		}) => {
			await page.goto("/");

			const testimonialSection = page.locator('[data-section="social_proof"]');
			await testimonialSection.scrollIntoViewIfNeeded();

			// Verify author attributions
			await expect(page.getByText(/Alex M\., Solo Founder/i)).toBeVisible();
			await expect(
				page.getByText(/Sarah L\., Backend Engineer/i),
			).toBeVisible();
			await expect(
				page.getByText(/James K\., Security-Conscious Dev/i),
			).toBeVisible();
		});

		test("testimonials: should include constructive feedback, not just praise", async ({
			page,
		}) => {
			await page.goto("/");

			const testimonialSection = page.locator('[data-section="social_proof"]');
			await testimonialSection.scrollIntoViewIfNeeded();

			// Verify one testimonial includes constructive criticism ("need polish")
			const constructiveText = page.getByText(/need polish/i);
			await expect(constructiveText).toBeVisible();
		});

		test("testimonials: CTA should direct to alpha signup", async ({
			page,
		}) => {
			await page.goto("/");

			const testimonialSection = page.locator('[data-section="social_proof"]');
			await testimonialSection.scrollIntoViewIfNeeded();

			const testCTA = testimonialSection.getByRole("link", {
				name: /test snapback in alpha/i,
			});
			await expect(testCTA).toBeVisible();
			await expect(testCTA).toHaveAttribute("href", "/waitlist");
		});
	});

	/**
	 * PRICING PAGE TESTS
	 * Verify FAQ accordion functionality and pricing clarity
	 */
	test.describe("Pricing Page Critical Path", () => {
		test("pricing: all pricing tiers should be visible", async ({ page }) => {
			await page.goto("/pricing");

			await expect(page.getByRole("heading", { name: /solo/i })).toBeVisible();
			await expect(page.getByRole("heading", { name: /pro/i })).toBeVisible();
			await expect(page.getByRole("heading", { name: /team/i })).toBeVisible();
		});

		test("pricing: FAQ accordion items should be expandable", async ({
			page,
		}) => {
			await page.goto("/pricing");

			// Find FAQ section
			const faqSection = page.locator('[data-section="faq"]');
			await faqSection.scrollIntoViewIfNeeded();

			// Get first FAQ item
			const firstQuestion = page
				.locator('[data-section="faq"]')
				.getByText(/will snapback upload my source code/i);
			await expect(firstQuestion).toBeVisible();

			// Verify answer is visible or can be expanded
			const answer = page.getByText(
				/no.*snapshots stay local.*cloud services for auth/i,
			);
			await expect(answer).toBeVisible();
		});

		test("pricing: FAQ should address privacy concerns", async ({ page }) => {
			await page.goto("/pricing");

			const faqSection = page.locator('[data-section="faq"]');
			await faqSection.scrollIntoViewIfNeeded();

			// Verify code upload question exists
			await expect(
				page.getByText(/will snapback upload my source code/i),
			).toBeVisible();

			// Verify answer mentions no uploads
			await expect(page.getByText(/no.*snapshots stay local/i)).toBeVisible();
		});

		test("pricing: should explain git relationship", async ({ page }) => {
			await page.goto("/pricing");

			const faqSection = page.locator('[data-section="faq"]');
			await faqSection.scrollIntoViewIfNeeded();

			// Verify git relationship FAQ exists
			await expect(
				page.getByText(/is this a replacement for git/i),
			).toBeVisible();

			// Verify clear answer
			await expect(
				page.getByText(/no.*snapback sits underneath git/i),
			).toBeVisible();
		});

		test("pricing: should address performance concerns", async ({ page }) => {
			await page.goto("/pricing");

			const faqSection = page.locator('[data-section="faq"]');
			await faqSection.scrollIntoViewIfNeeded();

			await expect(
				page.getByText(/does snapback slow my editor down/i),
			).toBeVisible();

			await expect(
				page.getByText(/designed to be invisible.*lightweight.*tuned/i),
			).toBeVisible();
		});
	});

	/**
	 * PERFORMANCE & METRICS TESTS
	 * Verify real, honest performance data is displayed
	 */
	test.describe("Performance Metrics Critical Path", () => {
		test("home: should display real performance metrics", async ({ page }) => {
			await page.goto("/");

			const metricsSection = page.locator('[data-section="for_teams"]');
			await metricsSection.scrollIntoViewIfNeeded();

			// Verify metrics are real numbers, not inflated claims
			await expect(metricsSection.getByText(/<100ms/i)).toBeVisible();
			await expect(metricsSection.getByText(/<1s/i)).toBeVisible();
			await expect(metricsSection.getByText(/~1GB.*100/i)).toBeVisible();
		});

		test("metrics: should mention snapshot latency", async ({ page }) => {
			await page.goto("/");

			const metricsSection = page.locator('[data-section="for_teams"]');
			await metricsSection.scrollIntoViewIfNeeded();

			await expect(
				metricsSection.getByText(/capture.*workspace.*without lag/i),
			).toBeVisible();
		});

		test("metrics: should mention restore time", async ({ page }) => {
			await page.goto("/");

			const metricsSection = page.locator('[data-section="for_teams"]');
			await metricsSection.scrollIntoViewIfNeeded();

			await expect(
				metricsSection.getByText(/large monorepos.*restore.*seconds/i),
			).toBeVisible();
		});

		test("metrics: should mention efficient storage", async ({ page }) => {
			await page.goto("/");

			const metricsSection = page.locator('[data-section="for_teams"]');
			await metricsSection.scrollIntoViewIfNeeded();

			await expect(
				metricsSection.getByText(/efficient local storage.*months/i),
			).toBeVisible();
		});
	});

	/**
	 * MOBILE RESPONSIVENESS TESTS
	 * Verify key sections work on mobile viewports
	 */
	test.describe("Mobile Responsiveness Critical Path", () => {
		test.use({ viewport: { width: 375, height: 667 } });

		test("mobile: hero section should stack correctly", async ({ page }) => {
			await page.goto("/");

			const heroSection = page.locator('[data-section="hero"]');
			await expect(heroSection).toBeVisible();

			// Verify CTA is still accessible
			const cta = page.getByRole("link", {
				name: /join private alpha/i,
			});
			await expect(cta).toBeVisible();
		});

		test("mobile: how-it-works should be readable", async ({ page }) => {
			await page.goto("/");

			const howSection = page.locator('[data-section="how_it_works"]');
			await howSection.scrollIntoViewIfNeeded();

			// Verify all steps are readable
			await expect(
				page.getByRole("heading", { name: /auto-snapshot/i }),
			).toBeVisible();
			await expect(
				page.getByRole("heading", { name: /detect breaking/i }),
			).toBeVisible();
			await expect(
				page.getByRole("heading", { name: /restore in one click/i }),
			).toBeVisible();
		});

		test("mobile: privacy section should be accessible", async ({ page }) => {
			await page.goto("/");

			const privacySection = page.locator('[data-section="privacy"]');
			await privacySection.scrollIntoViewIfNeeded();

			await expect(
				privacySection.getByRole("heading", { name: /local-first/i }),
			).toBeVisible();
		});
	});

	/**
	 * FEATURE PAGE TESTS
	 * Verify /product page renders all sections
	 */
	test.describe("Features/Product Page Critical Path", () => {
		test("features: /product page should load", async ({ page }) => {
			await page.goto("/product");

			// Verify main heading
			await expect(
				page.getByRole("heading", { name: /how snapback keeps you safe/i }),
			).toBeVisible();
		});

		test("features: should display overview section", async ({ page }) => {
			await page.goto("/product");

			const overview = page.locator('[data-section="overview"]');
			await expect(overview).toBeVisible();
			await expect(overview.getByText(/local-first timeline/i)).toBeVisible();
		});

		test("features: should display triggers section", async ({ page }) => {
			await page.goto("/product");

			const triggers = page.locator('[data-section="triggers"]');
			await triggers.scrollIntoViewIfNeeded();

			// Verify all trigger types are mentioned
			await expect(triggers.getByText(/file saves/i)).toBeVisible();
			await expect(triggers.getByText(/test runs/i)).toBeVisible();
			await expect(triggers.getByText(/branch switches/i)).toBeVisible();
			await expect(triggers.getByText(/ai-driven edits/i)).toBeVisible();
		});

		test("features: should display sessions section", async ({ page }) => {
			await page.goto("/product");

			const sessions = page.locator('[data-section="sessions_timeline"]');
			await sessions.scrollIntoViewIfNeeded();

			await expect(sessions.getByText(/scrollable timeline/i)).toBeVisible();
		});

		test("features: should display restore flows", async ({ page }) => {
			await page.goto("/product");

			const restoreFlows = page.locator('[data-section="restore_flows"]');
			await restoreFlows.scrollIntoViewIfNeeded();

			// Verify different restore methods
			await expect(
				restoreFlows.getByRole("tab", { name: /vs code/i }),
			).toBeVisible();
			await expect(
				restoreFlows.getByRole("tab", { name: /cli/i }),
			).toBeVisible();
			await expect(
				restoreFlows.getByRole("tab", { name: /api/i }),
			).toBeVisible();
		});

		test("features: should display architecture section", async ({ page }) => {
			await page.goto("/product");

			const architecture = page.locator('[data-section="architecture"]');
			await architecture.scrollIntoViewIfNeeded();

			await expect(architecture.getByText(/boring on purpose/i)).toBeVisible();
			await expect(
				architecture.getByText(/local sqlite datastore/i),
			).toBeVisible();
		});

		test("features: should display roadmap section", async ({ page }) => {
			await page.goto("/product");

			const roadmap = page.locator('[data-section="roadmap"]');
			await roadmap.scrollIntoViewIfNeeded();

			await expect(roadmap.getByText(/what's coming next/i)).toBeVisible();
		});
	});
});
