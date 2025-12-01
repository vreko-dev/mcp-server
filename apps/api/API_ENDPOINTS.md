# SnapBack API Endpoints Documentation

## Overview
This document outlines the current API endpoints available in the SnapBack API implementation.

## oRPC Endpoints (via /api/rpc)

The main API is accessible through oRPC at `/api/rpc` with the following modules:

### Admin Module
- `admin.users.list` - List all users (admin only)
- `admin.organizations.list` - List all organizations (admin only)
- `admin.organizations.find` - Find organization by ID (admin only)

### Analytics Module
- `analytics.track` - Track user events
- `analytics.getSessionActivity` - Get session activity data

### API Keys Module
- `apiKeys.create` - Create a new API key
- `apiKeys.list` - List user's API keys
- `apiKeys.revoke` - Revoke an API key

### Auth Module
- `auth.getSession` - Get current user session
- `auth.signOut` - Sign out current user

### Contact Module
- `contact.submit` - Submit contact form

### Cooldowns Module
- `cooldowns.get` - Get cooldown status for user/actions
- `cooldowns.set` - Set cooldown for user/actions

### Dashboard Module
- `dashboard.getOverview` - Get dashboard overview data
- `dashboard.getActivity` - Get user activity data

### Extension Module
- `extension.getLatestVersion` - Get latest extension version info

### Feature Flags Module
- `featureFlags.list` - List available feature flags
- `featureFlags.evaluate` - Evaluate feature flag for user
- `featureFlags.admin.evaluate` - Evaluate feature flag (admin only)

### Newsletter Module
- `newsletter.subscribe` - Subscribe to newsletter
- `newsletter.unsubscribe` - Unsubscribe from newsletter
- `newsletter.admin.getSubscribers` - Get newsletter subscribers (admin only)

### Organizations Module
- `organizations.create` - Create a new organization
- `organizations.get` - Get organization by ID
- `organizations.update` - Update organization details

### Payments Module
- `payments.createCheckout` - Create Stripe checkout session
- `payments.getPlans` - Get available payment plans
- `payments.getSubscription` - Get user's subscription

### Privacy Module
- `privacy.exportData` - Export user data
- `privacy.deleteData` - Delete user data
- `privacy.admin.exportData` - Export user data (admin only)

### Risk Module
- `risk.analyze` - Analyze code for risks
- `risk.getHistory` - Get risk analysis history
- `risk.admin.getGlobalStats` - Get global risk stats (admin only)

### Rules Module
- `rules.evaluate` - Evaluate rules for code
- `rules.admin.getGlobalStats` - Get global rules stats (admin only)

### Snapshots Module
- `snapshots.create` - Create a new snapshot
- `snapshots.list` - List user's snapshots
- `snapshots.get` - Get snapshot by ID

### Telemetry Module
- `telemetry.ingest` - Ingest telemetry data
- `telemetry.getSessionMetrics` - Get session metrics
- `telemetry.admin.getGlobalMetrics` - Get global metrics (admin only)
- `telemetry.admin.getSystemMetrics` - Get system metrics (admin only)

### Users Module
- `users.get` - Get user profile
- `users.update` - Update user profile

### Waitlist Module
- `waitlist.join` - Join the waitlist
- `waitlist.getPosition` - Get waitlist position
- `waitlist.getReferrals` - Get user's referrals
- `waitlist.getRecentActivity` - Get recent waitlist activity

## REST API Endpoints (via /api/v1)

### Analysis
- `POST /api/v1/analyze` - Analyze code files

### Secret Detection
- `POST /api/v1/detect-secrets` - Detect secrets in code

### Policy
- `POST /api/v1/policy/evaluate` - Evaluate policy rules
- `GET /api/v1/policy/current` - Get current policy

### Telemetry
- `POST /api/v1/telemetry/ingest` - Ingest telemetry data

### API Keys
- `GET /api/v1/keys` - List API keys
- `POST /api/v1/keys` - Create new API key
- `DELETE /api/v1/keys/:id` - Revoke API key

### Snapshots
- `GET /api/v1/snapshots` - List snapshots
- `POST /api/v1/snapshots` - Create new snapshot
- `GET /api/v1/snapshots/:id` - Get snapshot by ID

## Authentication
The API uses cookie-based authentication for web requests and API key authentication for programmatic access.

## Webhooks
- `POST /api/webhooks/payments` - Stripe payment webhooks

## Health and Documentation
- `GET /api/health` - API health check
- `GET /api/openapi` - OpenAPI schema
- `GET /api/orpc-openapi` - oRPC OpenAPI schema
- `GET /api/docs` - API documentation (Scalar)