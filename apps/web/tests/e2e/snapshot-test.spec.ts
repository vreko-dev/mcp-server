import { expect, test } from "@playwright/test";

test("should match snapshot", async ({ page }) => {
	// Create a simple page structure for testing
	await page.setContent(`
    <html>
      <head>
        <title>Test Page</title>
      </head>
      <body>
        <main>
          <h1>Hello World</h1>
          <p>This is a test page</p>
        </main>
      </body>
    </html>
  `);

	// Test visual regression with snapshot
	await expect(page).toHaveScreenshot("snapshot-test.png");

	// Test ARIA structure
	const main = page.locator("main");
	await expect(main).toMatchAriaSnapshot(`
    - heading "Hello World" [level=1]
    - paragraph: "This is a test page"
  `);
});
