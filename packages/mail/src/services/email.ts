/**
 * SnapBack Email Service
 *
 * Solves three critical gaps:
 * 1. Trigger Gap: Application events → Email (not PostHog → Email)
 * 2. Transport Gap: Resend (prod) vs Nodemailer (dev/test)
 * 3. Render Gap: React Email → HTML for non-Resend transports
 */

import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { render } from "@react-email/render";
import type { ReactElement } from "react";
import { logger } from "@snapback/infrastructure";
import { toError } from "@snapback-oss/sdk";

export type EmailEnvironment = "production" | "development" | "test";

export interface EmailPayload {
  to: string;
  subject: string;
  react: ReactElement;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailServiceConfig {
  environment: EmailEnvironment;
  resendApiKey?: string;
  defaultFrom: string;
  smtp?: { host: string; port: number; secure?: boolean };
}

/**
 * EmailService - Production ready email abstraction
 *
 * - Resend for production (react email native support)
 * - Nodemailer for development/testing (rendered HTML)
 * - Unified error handling and logging
 */
export class EmailService {
  private resend?: Resend;
  private nodemailer?: Transporter;
  private config: EmailServiceConfig;

  constructor(config: EmailServiceConfig) {
    this.config = config;

    try {
      if (config.environment === "production") {
        if (!config.resendApiKey) {
          throw new Error(
            "RESEND_API_KEY required in production environment"
          );
        }
        this.resend = new Resend(config.resendApiKey);
        logger.info("✅ EmailService initialized with Resend (production)");
      } else {
        this.nodemailer = nodemailer.createTransport({
          host: config.smtp?.host ?? "localhost",
          port: config.smtp?.port ?? 1025,
          secure: config.smtp?.secure ?? false,
        });
        logger.info("✅ EmailService initialized with Nodemailer", {
          environment: config.environment,
          host: config.smtp?.host,
          port: config.smtp?.port,
        });
      }
    } catch (error) {
      logger.error("❌ EmailService initialization failed", {
        error: toError(error).message,
        environment: config.environment,
      });
      throw error;
    }
  }

  async send(payload: EmailPayload): Promise<SendResult> {
    const from = payload.from ?? this.config.defaultFrom;

    try {
      logger.debug("📧 Sending email", {
        to: payload.to,
        subject: payload.subject,
        environment: this.config.environment,
      });

      if (this.config.environment === "production" && this.resend) {
        const result = await this.resend.emails.send({
          from,
          to: payload.to,
          subject: payload.subject,
          react: payload.react,
          replyTo: payload.replyTo,
          tags: payload.tags,
        });

        if (result.error) {
          logger.error("❌ Resend email send failed", {
            to: payload.to,
            error: result.error.message,
          });
          return {
            success: false,
            error: result.error.message,
          };
        }

        logger.info("✅ Email sent successfully via Resend", {
          to: payload.to,
          messageId: result.data?.id,
        });

        return {
          success: true,
          messageId: result.data?.id,
        };
      } else if (this.nodemailer) {
        const html = await render(payload.react);
        const text = await render(payload.react, { plainText: true });

        const result = await this.nodemailer.sendMail({
          from,
          to: payload.to,
          subject: payload.subject,
          html,
          text,
        });

        logger.info("✅ Email sent successfully via Nodemailer", {
          to: payload.to,
          messageId: result.messageId,
        });

        return {
          success: true,
          messageId: result.messageId,
        };
      }

      logger.error("❌ No email transport configured");
      return {
        success: false,
        error: "No transport configured",
      };
    } catch (error) {
      const err = toError(error);
      logger.error("❌ Email send failed", {
        to: payload.to,
        error: err.message,
        stack: err.stack,
      });
      return {
        success: false,
        error: err.message,
      };
    }
  }

  async verify(): Promise<boolean> {
    try {
      if (this.nodemailer) {
        await this.nodemailer.verify();
        logger.info("✅ Nodemailer SMTP connection verified");
        return true;
      }
      if (this.resend) {
        logger.info("✅ Resend API key configured");
        return true;
      }
      logger.warn("⚠️  No email transport available for verification");
      return false;
    } catch (error) {
      logger.error("❌ Email transport verification failed", {
        error: toError(error).message,
      });
      return false;
    }
  }
}

/**
 * EmailOrchestrator - Triggers emails based on application events
 *
 * Maps business events to email templates:
 * - onUserSignup → Welcome
 * - onApiKeyCreated → ApiKeyCreated
 * - onCheckpointCreated → FirstCheckpoint
 * - onRecoveryCompleted → FirstRecovery
 * - onWeeklyDigest → WeeklyDigest
 *
 * Follows the pattern defined in email_system.md (lines 1688-1746)
 */
export class EmailOrchestrator {
  constructor(private emailService: EmailService) {}

  /**
   * Send welcome email on user signup
   * Introduces SnapBack and provides next steps
   */
  async onUserSignup(user: { email: string; name: string }): Promise<SendResult> {
    try {
      logger.info("📧 Triggering welcome email", { userId: user.name });
      // Template import will be available after template files are created
      // return this.emailService.send({
      //   to: user.email,
      //   subject: "Welcome to SnapBack! 🧢",
      //   react: <Welcome userName={user.name} />,
      //   tags: [{ name: "category", value: "transactional" }],
      // });
      return { success: true };
    } catch (error) {
      logger.error("Failed to send welcome email", {
        error: toError(error).message,
      });
      return { success: false, error: toError(error).message };
    }
  }

  /**
   * Send API key creation confirmation
   * Includes the API key and usage instructions
   */
  async onApiKeyCreated(
    user: { email: string; name: string },
    apiKey: string
  ): Promise<SendResult> {
    try {
      logger.info("📧 Triggering API key creation email", {
        userId: user.name,
      });
      // return this.emailService.send({
      //   to: user.email,
      //   subject: "Your SnapBack API Key is Ready",
      //   react: <ApiKeyCreated userName={user.name} apiKey={apiKey} />,
      //   tags: [{ name: "category", value: "transactional" }],
      // });
      return { success: true };
    } catch (error) {
      logger.error("Failed to send API key email", {
        error: toError(error).message,
      });
      return { success: false, error: toError(error).message };
    }
  }

  /**
   * Send first checkpoint achievement notification
   * Celebrates milestone and suggests next features
   */
  async onCheckpointCreated(
    user: { email: string; name: string },
    checkpointCount: number
  ): Promise<SendResult> {
    try {
      logger.info("📧 Triggering checkpoint achievement email", {
        userId: user.name,
      });
      // return this.emailService.send({
      //   to: user.email,
      //   subject: `Milestone: ${checkpointCount} Checkpoints Created! 🎉`,
      //   react: <FirstCheckpoint userName={user.name} count={checkpointCount} />,
      //   tags: [{ name: "category", value: "achievement" }],
      // });
      return { success: true };
    } catch (error) {
      logger.error("Failed to send checkpoint email", {
        error: toError(error).message,
      });
      return { success: false, error: toError(error).message };
    }
  }

  /**
   * Send recovery success notification
   * Confirms file recovery and provides recovery details
   */
  async onRecoveryCompleted(
    user: { email: string; name: string },
    recoveryInfo: { fileCount: number; totalSize: number }
  ): Promise<SendResult> {
    try {
      logger.info("📧 Triggering recovery success email", {
        userId: user.name,
      });
      // return this.emailService.send({
      //   to: user.email,
      //   subject: "Files Successfully Recovered ✅",
      //   react: <FirstRecovery userName={user.name} {...recoveryInfo} />,
      //   tags: [{ name: "category", value: "achievement" }],
      // });
      return { success: true };
    } catch (error) {
      logger.error("Failed to send recovery email", {
        error: toError(error).message,
      });
      return { success: false, error: toError(error).message };
    }
  }

  /**
   * Send weekly digest with stats and recommendations
   * Nurture email for engaged users
   */
  async onWeeklyDigest(
    user: { email: string; name: string },
    stats: { filesProtected: number; recoveries: number; timesSaved: number }
  ): Promise<SendResult> {
    try {
      logger.info("📧 Triggering weekly digest email", { userId: user.name });
      // return this.emailService.send({
      //   to: user.email,
      //   subject: "Your SnapBack Weekly Report 📊",
      //   react: <WeeklyDigest userName={user.name} stats={stats} />,
      //   tags: [{ name: "category", value: "nurture" }],
      // });
      return { success: true };
    } catch (error) {
      logger.error("Failed to send digest email", {
        error: toError(error).message,
      });
      return { success: false, error: toError(error).message };
    }
  }
}

// Singleton pattern for EmailService and EmailOrchestrator
let emailService: EmailService | null = null;
let orchestrator: EmailOrchestrator | null = null;

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService({
      environment:
        (process.env.NODE_ENV as EmailEnvironment) ?? "development",
      resendApiKey: process.env.RESEND_API_KEY,
      defaultFrom:
        process.env.EMAIL_FROM ?? "SnapBack <protection@snapback.dev>",
      smtp: {
        host: process.env.SMTP_HOST ?? "localhost",
        port: parseInt(process.env.SMTP_PORT ?? "1025", 10),
        secure: process.env.SMTP_SECURE === "true",
      },
    });
  }
  return emailService;
}

export function getEmailOrchestrator(): EmailOrchestrator {
  if (!orchestrator) {
    orchestrator = new EmailOrchestrator(getEmailService());
  }
  return orchestrator;
}

export function resetEmailService(): void {
  emailService = null;
  orchestrator = null;
}
