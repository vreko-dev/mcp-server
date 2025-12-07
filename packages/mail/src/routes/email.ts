/**
 * Email unsubscribe API routes
 *
 * Handles:
 * - Token verification
 * - Preference updates
 * - HubSpot synchronization
 * - User-friendly success/error pages
 */

import { logger } from "@snapback/infrastructure";
import { toError } from "@snapback-oss/sdk";
import { Hono } from "hono";
import { syncUnsubscribeToHubSpot, verifyUnsubscribeToken } from "../services/unsubscribe";

const emailRoutes = new Hono();

/**
 * GET /api/email/unsubscribe
 * Handle unsubscribe token and process user request
 */
emailRoutes.get("/unsubscribe", async (c) => {
	try {
		const token = c.req.query("token");

		if (!token) {
			logger.warn("⚠️  Unsubscribe request missing token");
			return c.html(errorPage("Missing token"));
		}

		const payload = verifyUnsubscribeToken(token);
		if (!payload) {
			logger.warn("⚠️  Invalid or expired unsubscribe token");
			return c.html(errorPage("Invalid or expired link"));
		}

		try {
			// TODO: Integrate with actual database instance
			// const db = getDatabase();
			// await unsubscribe(db, payload.userId, payload.category);

			// For now, we'll just log the unsubscribe
			logger.info("✅ User unsubscribed", {
				userId: payload.userId,
				email: payload.email,
				category: payload.category,
			});

			// Sync with HubSpot
			await syncUnsubscribeToHubSpot(payload.email, true);

			return c.html(successPage(payload.email, payload.category));
		} catch (error) {
			logger.error("❌ Unsubscribe processing failed", {
				userId: payload.userId,
				error: toError(error).message,
			});
			return c.html(errorPage("Failed to process unsubscribe request"));
		}
	} catch (error) {
		logger.error("❌ Unsubscribe endpoint error", {
			error: toError(error).message,
		});
		return c.html(errorPage("Something went wrong"));
	}
});

/**
 * Success page HTML
 */
function successPage(email: string, category?: string): string {
	const categoryText = category ? `${category} email` : "all marketing email";

	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribed</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%);
      color: #FAFAFA;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      background: #111111;
      border: 1px solid #27272A;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 25px rgba(0, 0, 0, 0.3);
    }
    h1 {
      color: #10B981;
      font-size: 32px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .emoji {
      font-size: 36px;
      display: block;
    }
    p {
      color: #A1A1AA;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .email {
      background: #1A1A1A;
      border: 1px solid #27272A;
      border-radius: 8px;
      padding: 12px 16px;
      font-family: monospace;
      color: #10B981;
      margin-bottom: 24px;
      word-break: break-all;
    }
    .back-link {
      display: inline-block;
      color: #10B981;
      text-decoration: none;
      padding: 12px 24px;
      border: 1px solid #10B981;
      border-radius: 8px;
      transition: all 0.3s ease;
    }
    .back-link:hover {
      background: rgba(16, 185, 129, 0.1);
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #27272A;
      font-size: 13px;
      color: #71717A;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1><span class="emoji">✅</span> Unsubscribed</h1>
    <p>${email} has been unsubscribed from ${categoryText}.</p>
    <div class="email">${email}</div>
    <a href="https://snapback.dev" class="back-link">← Back to SnapBack</a>
    <div class="footer">
      <p>If you unsubscribed by mistake, you can update your preferences in your account settings.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Error page HTML
 */
function errorPage(message: string): string {
	return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Unsubscribe Error</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 100%);
      color: #FAFAFA;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 480px;
      background: #111111;
      border: 1px solid #27272A;
      border-radius: 12px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 25px rgba(0, 0, 0, 0.3);
    }
    h1 {
      color: #EF4444;
      font-size: 32px;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }
    .emoji {
      font-size: 36px;
      display: block;
    }
    p {
      color: #A1A1AA;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .message {
      background: #1A1A1A;
      border: 1px solid #EF4444;
      border-radius: 8px;
      padding: 12px 16px;
      color: #EF4444;
      margin-bottom: 24px;
      font-size: 14px;
    }
    .back-link {
      display: inline-block;
      color: #10B981;
      text-decoration: none;
      padding: 12px 24px;
      border: 1px solid #10B981;
      border-radius: 8px;
      transition: all 0.3s ease;
    }
    .back-link:hover {
      background: rgba(16, 185, 129, 0.1);
    }
    .footer {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #27272A;
      font-size: 13px;
      color: #71717A;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1><span class="emoji">⚠️</span> Error</h1>
    <p>We couldn't process your unsubscribe request.</p>
    <div class="message">${message}</div>
    <a href="https://snapback.dev" class="back-link">← Back to SnapBack</a>
    <div class="footer">
      <p>If you need help, please contact support or reply to your last email from us.</p>
    </div>
  </div>
</body>
</html>`;
}

export { emailRoutes };
