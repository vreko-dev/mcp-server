-- Better Auth Tables (User authentication, accounts, sessions)
-- Reference: https://better-auth.com/docs/concepts/database

-- User table (base user information)
CREATE TABLE IF NOT EXISTS "user" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL UNIQUE,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"name" text,
	"image" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"role" text DEFAULT 'user',
	"banned" boolean DEFAULT false,
	"banReason" text,
	"banExpires" timestamp
);

-- Account table (OAuth and provider accounts linked to users)
CREATE TABLE IF NOT EXISTS "account" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refreshToken" text,
	"accessToken" text,
	"accessTokenExpiresAt" timestamp,
	"refreshTokenExpiresAt" timestamp,
	"scope" text,
	"idToken" text,
	"sessionState" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "account_userId_fk" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE,
	UNIQUE("provider", "providerAccountId")
);

-- Session table (user sessions for authentication)
CREATE TABLE IF NOT EXISTS "session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"token" text NOT NULL UNIQUE,
	"expiresAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	CONSTRAINT "session_userId_fk" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

-- Verification token table (for email verification, password reset, etc)
CREATE TABLE IF NOT EXISTS "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"token" text NOT NULL UNIQUE,
	"expires" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Two Factor Authentication
CREATE TABLE IF NOT EXISTS "twoFactor" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"secret" text NOT NULL,
	"backupCodes" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "twoFactor_userId_fk" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

-- Passkeys (WebAuthn credentials)
CREATE TABLE IF NOT EXISTS "passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"name" text,
	"publicKey" text NOT NULL,
	"counter" bigint DEFAULT 0,
	"deviceType" text,
	"backedUp" boolean,
	"transports" text,
	"createdAt" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "passkey_userId_fk" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "user_email_idx" ON "user" ("email");
CREATE INDEX IF NOT EXISTS "user_role_idx" ON "user" ("role");
CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
CREATE INDEX IF NOT EXISTS "account_provider_idx" ON "account" ("provider");
CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
CREATE INDEX IF NOT EXISTS "session_token_idx" ON "session" ("token");
CREATE INDEX IF NOT EXISTS "session_expiresAt_idx" ON "session" ("expiresAt");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");
CREATE INDEX IF NOT EXISTS "verification_token_idx" ON "verification" ("token");
CREATE INDEX IF NOT EXISTS "twoFactor_userId_idx" ON "twoFactor" ("userId");
CREATE INDEX IF NOT EXISTS "passkey_userId_idx" ON "passkey" ("userId");
