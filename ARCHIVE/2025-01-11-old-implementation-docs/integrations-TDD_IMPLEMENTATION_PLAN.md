# TDD Implementation Plan for Communication Hub

## Overview

This document outlines the Test-Driven Development approach for implementing the Communication Hub system. We'll follow the Red-Green-Refactor cycle for each component, ensuring comprehensive test coverage before implementation.

## Implementation Order

1. **Email Service** - Foundation for all communication
2. **CRM Service** - User data management
3. **Analytics Service** - Data-driven targeting
4. **Feature Flag Service** - Gradual rollouts
5. **Drip Campaign Service** - Automated sequences
6. **Communication Hub** - Orchestration layer

## Phase 1: Email Service Implementation

### Step 1: Basic Email Sending

#### Test Case 1: Send Email with Valid Parameters

```typescript
// File: packages/integrations/src/communication/lib/email-service.test.ts

import { sendEmail } from "./email-service";

describe("Email Service", () => {
	describe("sendEmail", () => {
		it("should send email with valid parameters", async () => {
			// Arrange
			const emailParams = {
				to: "user@example.com",
				subject: "Test Email",
				html: "<p>Hello World</p>",
			};

			// Act
			const result = await sendEmail(emailParams);

			// Assert
			expect(result).toBeDefined();
			expect(result.success).toBe(true);
			expect(result.messageId).toBeDefined();
		});
	});
});
```

#### Implementation 1: Basic Email Function

``typescript
// File: packages/integrations/src/communication/lib/email-service.ts

import { send as sendResendEmail } from "../../../email/provider/resend.js";
import type { SendEmailParams } from "../../../email/types.js";
import { logger } from "@snapback/infrastructure";

export interface EmailServiceResult {
success: boolean;
messageId?: string;
error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<EmailServiceResult> {
try {
logger.info("Sending email", { to: params.to, subject: params.subject });

    // For now, use Resend as default provider
    await sendResendEmail(params);

    logger.info("Email sent successfully", { to: params.to });

    return {
      success: true,
      messageId: "mock-message-id" // In real implementation, this would come from the provider
    };

} catch (error) {
logger.error("Failed to send email", { error, to: params.to });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };

}
}

````

### Step 2: Email Validation

#### Test Case 2: Reject Invalid Email Addresses
```typescript
// Add to email-service.test.ts

it("should reject invalid email addresses", async () => {
  // Arrange
  const invalidParams = {
    to: "invalid-email",
    subject: "Test Email",
    html: "<p>Hello World</p>"
  };

  // Act & Assert
  await expect(sendEmail(invalidParams)).rejects.toThrow("Invalid email address");
});
````

#### Implementation 2: Email Validation

```typescript
// Add to email-service.ts

function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export async function sendEmail(
	params: SendEmailParams
): Promise<EmailServiceResult> {
	// Validate email address
	if (!isValidEmail(params.to)) {
		throw new Error("Invalid email address");
	}

	// ... rest of implementation
}
```

### Step 3: Provider Selection

#### Test Case 3: Use Specified Email Provider

```typescript
// Add to email-service.test.ts

it("should use specified email provider", async () => {
	// Arrange
	const emailParams = {
		to: "user@example.com",
		subject: "Test Email",
		html: "<p>Hello World</p>",
		provider: "resend", // or "mailgun", "postmark"
	};

	// Mock provider functions
	const mockResendSend = vi.fn().mockResolvedValue({ id: "mock-id" });
	const mockMailgunSend = vi.fn().mockResolvedValue({ id: "mock-id" });

	// Temporarily replace imports (this would be done with proper mocking)

	// Act
	const result = await sendEmail(emailParams);

	// Assert
	expect(mockResendSend).toHaveBeenCalled();
	expect(result.success).toBe(true);
});
```

## Phase 2: CRM Service Implementation

### Step 1: Contact Creation

#### Test Case 1: Create Contact with Valid Data

``typescript
// File: packages/integrations/src/communication/lib/crm-service.test.ts

import { createContact } from "./crm-service";

describe("CRM Service", () => {
describe("createContact", () => {
it("should create contact with valid data", async () => {
// Arrange
const contactData = {
email: "john.doe@example.com",
firstname: "John",
lastname: "Doe"
};

      // Act
      const result = await createContact(contactData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.email).toBe(contactData.email);
    });

});
});

```

#### Implementation 1: Basic Contact Creation
``typescript
// File: packages/integrations/src/communication/lib/crm-service.ts

import { createContact as createHubSpotContact } from "../../../hubspot/index.js";
import type { HubSpotContact } from "../../../hubspot/types.js";
import { logger } from "@snapback/infrastructure";

export interface CRMContact {
  id: string;
  email: string;
  firstname?: string;
  lastname?: string;
  [key: string]: string | undefined;
}

export async function createContact(contactData: Partial<HubSpotContact>): Promise<CRMContact> {
  try {
    logger.info("Creating contact in CRM", { email: contactData.email });

    const hubspotContact = await createHubSpotContact({
      properties: contactData
    });

    logger.info("Contact created successfully", { contactId: hubspotContact.id });

    return {
      id: hubspotContact.id,
      email: hubspotContact.email,
      firstname: hubspotContact.firstname,
      lastname: hubspotContact.lastname
    };
  } catch (error) {
    logger.error("Failed to create contact in CRM", { error, email: contactData.email });
    throw error;
  }
}
```

## Phase 3: Analytics Service Implementation

### Step 1: User Segmentation

#### Test Case 1: Segment Users Based on Properties

``typescript
// File: packages/integrations/src/communication/lib/analytics-service.test.ts

import { isUserInSegment } from "./analytics-service";

describe("Analytics Service", () => {
describe("isUserInSegment", () => {
it("should segment users based on properties", () => {
// Arrange
const user = {
id: "user_123",
properties: {
plan: "enterprise",
usage: "1500"
}
};

      const segmentRule = {
        properties: {
          plan: "enterprise",
          usage: ">1000"
        }
      };

      // Act
      const result = isUserInSegment(user, segmentRule);

      // Assert
      expect(result).toBe(true);
    });

});
});

```

#### Implementation 1: Basic User Segmentation
``typescript
// File: packages/integrations/src/communication/lib/analytics-service.ts

export interface User {
  id: string;
  properties: Record<string, string>;
}

export interface SegmentRule {
  properties: Record<string, string>;
}

export function isUserInSegment(user: User, rule: SegmentRule): boolean {
  for (const [key, value] of Object.entries(rule.properties)) {
    const userValue = user.properties[key];

    // Handle numeric comparisons
    if (value.startsWith(">")) {
      const threshold = parseInt(value.substring(1));
      const userNum = parseInt(userValue);
      if (isNaN(userNum) || userNum <= threshold) {
        return false;
      }
    } else if (value.startsWith("<")) {
      const threshold = parseInt(value.substring(1));
      const userNum = parseInt(userValue);
      if (isNaN(userNum) || userNum >= threshold) {
        return false;
      }
    } else if (userValue !== value) {
      // Exact match
      return false;
    }
  }

  return true;
}
```

## Phase 4: Feature Flag Service Implementation

### Step 1: Flag Evaluation

#### Test Case 1: Evaluate Boolean Flags

``typescript
// File: packages/integrations/src/communication/lib/feature-flags.test.ts

import { isFeatureEnabled } from "./feature-flags";

describe("Feature Flag Service", () => {
describe("isFeatureEnabled", () => {
it("should evaluate boolean flags correctly", async () => {
// Arrange
const flagName = "enhanced_onboarding";
const context = { userId: "user_123" };

      // Mock flag evaluation (in real implementation, this would call PostHog)
      vi.mock("@snapback/config/utils/feature-flags", () => ({
        isFeatureEnabled: vi.fn().mockResolvedValue(true)
      }));

      // Act
      const result = await isFeatureEnabled(flagName, context);

      // Assert
      expect(result).toBe(true);
    });

});
});

```

#### Implementation 1: Feature Flag Evaluation
``typescript
// File: packages/integrations/src/communication/lib/feature-flags.ts

import { isFeatureEnabled as isFeatureEnabledCore } from "@snapback/config/utils/feature-flags";
import { logger } from "@snapback/infrastructure";

export interface FeatureFlagContext {
  userId?: string;
  email?: string;
  properties?: Record<string, any>;
}

export async function isFeatureEnabled(
  flagName: string,
  context: FeatureFlagContext
): Promise<boolean> {
  try {
    logger.debug("Evaluating feature flag", { flagName, userId: context.userId });

    const result = await isFeatureEnabledCore(flagName, {
      userId: context.userId,
      email: context.email,
      ...context.properties
    });

    logger.debug("Feature flag evaluation result", { flagName, result });

    return result;
  } catch (error) {
    logger.error("Failed to evaluate feature flag", { error, flagName });
    // Default to false for safety
    return false;
  }
}
```

## Phase 5: Drip Campaign Service Implementation

### Step 1: Campaign Scheduling

#### Test Case 1: Schedule Emails at Correct Intervals

``typescript
// File: packages/integrations/src/communication/lib/drip-service.test.ts

import { scheduleCampaign } from "./drip-service";

describe("Drip Campaign Service", () => {
describe("scheduleCampaign", () => {
it("should schedule emails at correct intervals", async () => {
// Arrange
const campaign = {
id: "onboarding_sequence",
userId: "user_123",
emails: [
{ template: "welcome", delayDays: 0 },
{ template: "getting_started", delayDays: 1 },
{ template: "advanced_features", delayDays: 3 }
]
};

      // Mock setTimeout to capture calls
      const mockSetTimeout = vi.spyOn(global.setTimeout, 'mock');

      // Act
      await scheduleCampaign(campaign);

      // Assert
      expect(mockSetTimeout).toHaveBeenCalledTimes(3);

      // Check delays (in milliseconds)
      expect(mockSetTimeout.mock.calls[0][1]).toBe(0); // Immediate
      expect(mockSetTimeout.mock.calls[1][1]).toBe(1 * 24 * 60 * 60 * 1000); // 1 day
      expect(mockSetTimeout.mock.calls[2][1]).toBe(3 * 24 * 60 * 60 * 1000); // 3 days
    });

});
});

```

#### Implementation 1: Basic Campaign Scheduling
``typescript
// File: packages/integrations/src/communication/lib/drip-service.ts

import { logger } from "@snapback/infrastructure";

export interface DripEmail {
  template: string;
  delayDays: number;
}

export interface DripCampaign {
  id: string;
  userId: string;
  emails: DripEmail[];
}

export async function scheduleCampaign(campaign: DripCampaign): Promise<void> {
  logger.info("Scheduling drip campaign", {
    campaignId: campaign.id,
    userId: campaign.userId,
    emailCount: campaign.emails.length
  });

  for (const [index, email] of campaign.emails.entries()) {
    const delay = email.delayDays * 24 * 60 * 60 * 1000; // Convert days to milliseconds

    setTimeout(async () => {
      try {
        logger.info("Sending drip email", {
          campaignId: campaign.id,
          userId: campaign.userId,
          template: email.template,
          sequence: index + 1
        });

        // In real implementation, this would call the email service
        // await sendEmail({ ... });

      } catch (error) {
        logger.error("Failed to send drip email", {
          error,
          campaignId: campaign.id,
          userId: campaign.userId,
          template: email.template
        });
      }
    }, delay);
  }
}
```

## Phase 6: Communication Hub Integration

### Step 1: Targeted Email Sending

#### Test Case 1: Send Targeted Email Based on Analytics

``typescript
// File: packages/integrations/src/communication/communication-hub.test.ts

import { sendTargetedEmail } from "./index";

describe("Communication Hub", () => {
describe("sendTargetedEmail", () => {
it("should send targeted email based on analytics data", async () => {
// Arrange
const params = {
userId: "user_123",
email: "user@example.com",
template: "welcome",
featureFlags: ["enhanced_onboarding"],
analyticsData: {
lastActive: "2023-01-01",
featureUsage: "high"
}
};

      // Mock dependencies
      const mockIsFeatureEnabled = vi.fn().mockResolvedValue(true);
      const mockSendEmail = vi.fn().mockResolvedValue({ success: true });
      const mockIsUserInSegment = vi.fn().mockReturnValue(true);

      // Act
      const result = await sendTargetedEmail(params);

      // Assert
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith("enhanced_onboarding", { userId: "user_123" });
      expect(mockSendEmail).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

});
});

```

#### Implementation 1: Communication Hub
``typescript
// File: packages/integrations/src/communication/index.ts

import { sendEmail } from "./lib/email-service.js";
import { isFeatureEnabled } from "./lib/feature-flags.js";
import { logger } from "@snapback/infrastructure";

export interface TargetedEmailParams {
  userId: string;
  email: string;
  template: string;
  featureFlags?: string[];
  analyticsData?: Record<string, any>;
}

export interface CommunicationHubResult {
  success: boolean;
  error?: string;
}

export async function sendTargetedEmail(params: TargetedEmailParams): Promise<CommunicationHubResult> {
  try {
    logger.info("Sending targeted email", {
      userId: params.userId,
      template: params.template
    });

    // Check feature flags for gradual rollouts
    if (params.featureFlags) {
      for (const flag of params.featureFlags) {
        const isEnabled = await isFeatureEnabled(flag, { userId: params.userId });
        if (!isEnabled) {
          logger.info("Feature flag not enabled for user", {
            userId: params.userId,
            flag
          });
          return { success: true, error: "Feature flag not enabled" };
        }
      }
    }

    // In real implementation, we would:
    // 1. Get user data from analytics
    // 2. Personalize the email template
    // 3. Send the email
    const result = await sendEmail({
      to: params.email,
      subject: getSubjectForTemplate(params.template),
      html: getTemplateForUser(params.template, params.analyticsData)
    });

    if (result.success) {
      logger.info("Targeted email sent successfully", {
        userId: params.userId,
        template: params.template
      });
      return { success: true };
    } else {
      logger.error("Failed to send targeted email", {
        userId: params.userId,
        template: params.template,
        error: result.error
      });
      return { success: false, error: result.error };
    }
  } catch (error) {
    logger.error("Error sending targeted email", {
      userId: params.userId,
      template: params.template,
      error
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

function getSubjectForTemplate(template: string): string {
  const subjects: Record<string, string> = {
    welcome: "Welcome to SnapBack!",
    getting_started: "Getting Started with SnapBack",
    advanced_features: "Unlock Advanced Features",
    feedback_request: "We'd Love Your Feedback"
  };

  return subjects[template] || "Important Update";
}

function getTemplateForUser(template: string, data?: Record<string, any>): string {
  // In real implementation, this would render a proper template
  return `<p>Hello! This is a ${template} email.</p>`;
}
```

## Test Execution Commands

### Unit Tests

```
# Run all communication hub unit tests
pnpm test:unit --filter @snapback/integrations --testPathPattern communication

# Run specific service tests
pnpm test:unit packages/integrations/src/communication/lib/email-service.test.ts
pnpm test:unit packages/integrations/src/communication/lib/crm-service.test.ts
pnpm test:unit packages/integrations/src/communication/lib/analytics-service.test.ts
pnpm test:unit packages/integrations/src/communication/lib/feature-flags.test.ts
pnpm test:unit packages/integrations/src/communication/lib/drip-service.test.ts
```

### Integration Tests

```
# Run integration tests
pnpm test:integration --filter @snapback/integrations --testPathPattern communication
```

### Coverage Reports

```
# Generate coverage report
pnpm test:coverage --filter @snapback/integrations --testPathPattern communication
```

## Continuous Integration Setup

### GitHub Actions Workflow

```
# .github/workflows/communication-tests.yml

name: Communication Hub Tests

on:
  push:
    branches: [ main, dev ]
    paths:
      - 'packages/integrations/src/communication/**'
  pull_request:
    branches: [ main, dev ]
    paths:
      - 'packages/integrations/src/communication/**'

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install

    - name: Run unit tests
      run: pnpm test:unit --filter @snapback/integrations --testPathPattern communication

    - name: Run integration tests
      run: pnpm test:integration --filter @snapback/integrations --testPathPattern communication

    - name: Generate coverage report
      run: pnpm test:coverage --filter @snapback/integrations --testPathPattern communication
```

## Development Workflow

### Daily Development Cycle

1. **Write Failing Test**

    ```bash
    # Create new test file
    touch packages/integrations/src/communication/lib/new-service.test.ts

    # Write failing test
    # Run test to confirm it fails
    pnpm test:unit packages/integrations/src/communication/lib/new-service.test.ts
    ```

2. **Implement Minimal Code**

    ```bash
    # Create implementation file
    touch packages/integrations/src/communication/lib/new-service.ts

    # Write minimal code to make test pass
    # Run test to confirm it passes
    pnpm test:unit packages/integrations/src/communication/lib/new-service.test.ts
    ```

3. **Refactor and Optimize**

    ```bash
    # Improve code quality
    # Ensure all tests still pass
    pnpm test:unit packages/integrations/src/communication/lib/new-service.test.ts
    ```

4. **Run Full Test Suite**
    ```bash
    # Run all communication hub tests
    pnpm test:unit --filter @snapback/integrations --testPathPattern communication
    ```

## Quality Gates

### Pre-Commit Hooks

```
// lefthook.yml

pre-commit:
  commands:
    communication-tests:
      glob: "packages/integrations/src/communication/**/*"
      run: |
        pnpm test:unit --filter @snapback/integrations --testPathPattern communication --changedSince HEAD~1
```

### Pre-Push Hooks

```
// lefthook.yml

pre-push:
  commands:
    full-communication-tests:
      glob: "packages/integrations/src/communication/**/*"
      run: |
        pnpm test:unit --filter @snapback/integrations --testPathPattern communication
        pnpm test:integration --filter @snapback/integrations --testPathPattern communication
```

## Additional Implementation Scenarios

### Security Implementation

#### Test Case: Validate HubSpot API Credentials

```typescript
// Add to crm-service.test.ts

it("should validate HubSpot API credentials", async () => {
	// Arrange
	delete process.env.HUBSPOT_ACCESS_TOKEN;

	const contactData = {
		email: "test@example.com",
		firstname: "Test",
		lastname: "User",
	};

	// Act & Assert
	await expect(createContact(contactData)).rejects.toThrow(
		"HubSpot credentials not configured"
	);
});
```

#### Implementation: Credential Validation

```
// Add to crm-service.ts

export async function createContact(contactData: Partial<HubSpotContact>): Promise<CRMContact> {
  // Validate credentials first
  if (!process.env.HUBSPOT_ACCESS_TOKEN && !process.env.HUBSPOT_API_KEY) {
    throw new Error("HubSpot credentials not configured");
  }

  try {
    logger.info("Creating contact in CRM", { email: contactData.email });

    const hubspotContact = await createHubSpotContact({
      properties: contactData
    });

    logger.info("Contact created successfully", { contactId: hubspotContact.id });

    return {
      id: hubspotContact.id,
      email: hubspotContact.email,
      firstname: hubspotContact.firstname,
      lastname: hubspotContact.lastname
    };
  } catch (error) {
    logger.error("Failed to create contact in CRM", { error, email: contactData.email });
    throw error;
  }
}
```

### Edge Case Handling

#### Test Case: Handle Network Failures

```
// Add to email-service.test.ts

it("should handle network failures gracefully", async () => {
  // Arrange
  const emailParams = {
    to: "user@example.com",
    subject: "Test Email",
    html: "<p>Hello World</p>"
  };

  // Mock network failure
  vi.mock("../../../email/provider/resend.js", () => ({
    send: vi.fn().mockRejectedValue(new Error("Network error"))
  }));

  // Act
  const result = await sendEmail(emailParams);

  // Assert
  expect(result.success).toBe(false);
  expect(result.error).toContain("Network error");
  expect(logger.error).toHaveBeenCalled();
});
```

#### Implementation: Network Resilience

```
// Add to email-service.ts

export async function sendEmail(params: SendEmailParams): Promise<EmailServiceResult> {
  try {
    // Validate email address
    if (!isValidEmail(params.to)) {
      throw new Error("Invalid email address");
    }

    // Implement retry logic
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await sendResendEmail(params);
        return {
          success: true,
          messageId: result.id
        };
      } catch (error) {
        lastError = error;
        if (attempt < 3) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  } catch (error) {
    logger.error("Failed to send email after retries", { error, to: params.to });

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
```

### Performance Optimization

#### Test Case: Handle Large Batch Operations

```
// Add to drip-service.test.ts

it("should handle large batch operations efficiently", async () => {
  // Arrange
  const largeCampaignList = Array.from({ length: 1000 }, (_, i) => ({
    id: `campaign_${i}`,
    userId: `user_${i}`,
    emails: [{ template: "welcome", delayDays: 0 }]
  }));

  const startTime = Date.now();

  // Act
  const promises = largeCampaignList.map(campaign => scheduleCampaign(campaign));
  await Promise.all(promises);

  const endTime = Date.now();

  // Assert
  expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  expect(logger.info).toHaveBeenCalledWith(
    "Scheduling drip campaign",
    expect.any(Object)
  );
});
```

#### Implementation: Batch Processing

```
// Add to drip-service.ts

export async function scheduleCampaignBatch(campaigns: DripCampaign[]): Promise<void> {
  logger.info("Scheduling batch of drip campaigns", { count: campaigns.length });

  // Process in chunks to avoid overwhelming the system
  const chunkSize = 50;
  for (let i = 0; i < campaigns.length; i += chunkSize) {
    const chunk = campaigns.slice(i, i + chunkSize);
    await Promise.all(chunk.map(campaign => scheduleCampaign(campaign)));

    // Brief pause between chunks to avoid rate limiting
    if (i + chunkSize < campaigns.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  logger.info("Completed scheduling batch of drip campaigns", { count: campaigns.length });
}
```

## Monitoring and Observability

### Test Case: Collect Metrics

```
// Add to communication-hub.test.ts

it("should collect and report metrics", async () => {
  // Arrange
  const params = {
    userId: "user_123",
    email: "user@example.com",
    template: "welcome"
  };

  // Mock metrics collection
  const mockIncrement = vi.fn();
  vi.mock("@snapback/infrastructure", async () => {
    const actual = await vi.importActual("@snapback/infrastructure");
    return {
      ...actual,
      metrics: {
        increment: mockIncrement
      }
    };
  });

  // Act
  await sendTargetedEmail(params);

  // Assert
  expect(mockIncrement).toHaveBeenCalledWith("communication.email.sent", 1, {
    template: "welcome",
    userId: "user_123"
  });
});
```

### Implementation: Metrics Collection

```
// Add to communication/index.ts

import { metrics, logger } from "@snapback/infrastructure";

export async function sendTargetedEmail(params: TargetedEmailParams): Promise<CommunicationHubResult> {
  const startTime = Date.now();

  try {
    logger.info("Sending targeted email", {
      userId: params.userId,
      template: params.template
    });

    // Check feature flags for gradual rollouts
    if (params.featureFlags) {
      for (const flag of params.featureFlags) {
        const isEnabled = await isFeatureEnabled(flag, { userId: params.userId });
        if (!isEnabled) {
          logger.info("Feature flag not enabled for user", {
            userId: params.userId,
            flag
          });
          return { success: true, error: "Feature flag not enabled" };
        }
      }
    }

    // In real implementation, we would:
    // 1. Get user data from analytics
    // 2. Personalize the email template
    // 3. Send the email
    const result = await sendEmail({
      to: params.email,
      subject: getSubjectForTemplate(params.template),
      html: getTemplateForUser(params.template, params.analyticsData)
    });

    if (result.success) {
      // Record successful send metric
      metrics.increment("communication.email.sent", 1, {
        template: params.template,
        userId: params.userId
      });

      logger.info("Targeted email sent successfully", {
        userId: params.userId,
        template: params.template,
        duration: Date.now() - startTime
      });

      return { success: true };
    } else {
      // Record failure metric
      metrics.increment("communication.email.failed", 1, {
        template: params.template,
        userId: params.userId,
        error: result.error
      });

      logger.error("Failed to send targeted email", {
        userId: params.userId,
        template: params.template,
        error: result.error
      });
      return { success: false, error: result.error };
    }
  } catch (error) {
    // Record exception metric
    metrics.increment("communication.email.exception", 1, {
      template: params.template,
      userId: params.userId,
      error: error instanceof Error ? error.name : "Unknown"
    });

    logger.error("Error sending targeted email", {
      userId: params.userId,
      template: params.template,
      error
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

function getSubjectForTemplate(template: string): string {
  const subjects: Record<string, string> = {
    welcome: "Welcome to SnapBack!",
    getting_started: "Getting Started with SnapBack",
    advanced_features: "Unlock Advanced Features",
    feedback_request: "We'd Love Your Feedback"
  };

  return subjects[template] || "Important Update";
}

function getTemplateForUser(template: string, data?: Record<string, any>): string {
  // In real implementation, this would render a proper template
  return `<p>Hello! This is a ${template} email.</p>`;
}
```

## Conclusion

This TDD implementation plan provides a structured approach to building the Communication Hub system with comprehensive test coverage at every step. By following this plan, we can ensure high-quality, reliable, and maintainable code that integrates seamlessly with the existing platform.

The modular approach allows for independent development of each service while maintaining clear integration points. The comprehensive test coverage ensures that we can confidently deploy and maintain the system in production.

The additional scenarios covered include security testing, edge case handling, performance optimization, and monitoring/observability, ensuring the system is robust and production-ready.
