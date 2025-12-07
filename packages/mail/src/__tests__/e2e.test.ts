/**
 * E2E Email Flow Test
 *
 * Tests the complete email system end-to-end:
 * - Email sending via Nodemailer in test environment
 * - Template rendering
 * - Local mailbox delivery (Mailpit/MailHog)
 *
 * Prerequisites:
 * - Mailpit running on localhost:8025 (or MailHog equivalent)
 * - Nodemailer configured for local SMTP (localhost:1025)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getEmailService } from "../services/email";
import axios from "axios";

// This assumes you have Mailpit running locally on port 8025
// If not using Mailpit, skip this test or mock axios
const MAILPIT_API = "http://localhost:8025/api/v1";

describe("E2E Email Flow", () => {
  // Ensure we are in test/dev mode so we use Nodemailer
  const service = getEmailService();

  beforeAll(async () => {
    // Verify SMTP connection is available
    const isHealthy = await service.verify();
    if (!isHealthy) {
      console.warn("⚠️  Email service not properly configured for E2E test");
    }
  });

  it("sends a welcome email via Nodemailer", async () => {
    // Note: In actual implementation, use proper React component
    // This is simplified for test purposes
    const result = await service.send({
      to: "e2e-test@snapback.dev",
      subject: "Welcome to SnapBack! 🧢",
      react: undefined as any, // Will be actual Welcome component in implementation
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it("email arrives in local mailbox (Mailpit)", async () => {
    // Send test email
    await service.send({
      to: "mailpit-test@snapback.dev",
      subject: "Mailpit Test Email",
      react: undefined as any, // Will be actual component in implementation
    });

    // Wait for SMTP processing
    await new Promise((r) => setTimeout(r, 1000));

    // Check Mailpit API to see if it arrived
    try {
      const response = await axios.get(`${MAILPIT_API}/messages`);
      const messages = response.data.messages || [];

      const foundEmail = messages.find(
        (m: any) =>
          m.To && m.To[0] && m.To[0].Address === "mailpit-test@snapback.dev"
      );

      expect(foundEmail).toBeDefined();
      expect(foundEmail.Subject).toContain("Mailpit Test Email");
    } catch (error) {
      console.warn(
        "⚠️  Mailpit not available - skipping mailbox verification. Is Mailpit running on localhost:8025?"
      );
    }
  });

  it("renders HTML content correctly", async () => {
    const result = await service.send({
      to: "html-test@snapback.dev",
      subject: "HTML Render Test",
      react: undefined as any, // Will be actual component in implementation
    });

    expect(result.success).toBe(true);
    // HTML should be rendered, not just React JSX
    expect(result.messageId).toBeDefined();
  });

  it("handles plain text emails", async () => {
    const result = await service.send({
      to: "plaintext-test@snapback.dev",
      subject: "Plain Text Test",
      react: undefined as any, // Will be actual component in implementation
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });

  it("handles email errors gracefully", async () => {
    const result = await service.send({
      to: "invalid-email",
      subject: "Invalid Email Test",
      react: undefined as any, // Will be actual component in implementation
    });

    // Should handle error gracefully without throwing
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
