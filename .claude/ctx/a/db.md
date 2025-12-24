# Phase S5: Database Schema Analysis

**Timestamp:** 2025-11-07

## Executive Summary

The SnapBack database schema is well-structured with a focus on privacy-first design principles. It uses PostgreSQL with Drizzle ORM and includes tables for user management, API key tracking, code snapshots, telemetry, security events, and analytics. The schema implements proper foreign key relationships with CASCADE deletes for data integrity and includes partitioned tables for time-series data.

## Schema Overview

- **Database Type:** PostgreSQL
- **ORM:** Drizzle ORM
- **Migration Tool:** Drizzle Kit
- **Schema Structure:**
  - Core Tables: 25
  - SnapBack Tables: 30
  - Partitioned Tables: 6
  - Enums: 8
  - Materialized Views: 4

## Key Features

1. Privacy-first design with metadata-only storage by default
2. Foreign key constraints with CASCADE deletes for data integrity
3. Partitioned tables for time-series data (error logs, feature usage, API usage)
4. Comprehensive telemetry and analytics tracking
5. Security event monitoring and rate limiting
6. Team and subscription management
7. Snapshot and file metadata storage with optional cloud backup

## Core Components

### User Management
User authentication and profile management based on Better Auth with tables for [user](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L20-L35), [session](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L37-L53), [account](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L55-L69), [verification](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L71-L80), [passkey](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L82-L94), [twoFactor](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L96-L104), and [userProfiles](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/user-profiles.ts#L5-L40). Users have sessions, accounts, passkeys, and two-factor authentication records.

### Organization Management
Team and organization structure with membership management using [organization](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L133-L144), [member](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L146-L157), [invitation](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L159-L169), [teams](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/teams.ts#L12-L46), and [teamMembers](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/teams.ts#L55-L90) tables. Organizations have members and invitations, with team structures.

### Subscription & Billing
Subscription and billing management with usage tracking through [subscriptions](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L330-L353), [usageLimits](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L356-L376), and [purchase](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L171-L182) tables. Subscriptions are linked to users or organizations with usage limits.

### API Key System
API key management with permissions and usage tracking using [apiKeys](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L223-L252), [apiKeyMetadata](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/api-key-metadata.ts#L7-L47), [apiKeyUsage](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/api-key-usage.ts#L9-L41), and [clientTokens](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/postgres.ts#L256-L282) tables. API keys are linked to users and organizations with usage tracking.

### Code Snapshots
Privacy-first code snapshot storage with metadata using [snapshots](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/snapshots.ts#L12-L100) and [snapshotFiles](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/snapshots.ts#L106-L132) tables. Snapshots contain multiple files with metadata, linked to users and API keys.

**Privacy Principle:** Store only metadata by default, file content requires explicit user opt-in.

### Telemetry & Analytics
Comprehensive telemetry and analytics tracking with [telemetryEvents](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/telemetry-events.ts#L8-L37), [telemetryDailyStats](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/telemetry-events.ts#L52-L79), [telemetryIdempotencyKeys](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/telemetry-events.ts#L39-L49), [featureUsage](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/feature-usage.ts#L13-L55), [orgDailyMetrics](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/org-daily-metrics.ts#L11-L52), and [usageStatsDaily](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/usage-tracking.ts#L72-L92) tables. Time-series data with daily aggregations for performance.

**Partitioning:** Feature usage and API usage logs are partitioned by month.

### Security Monitoring
Security event monitoring and violation tracking using [securityEvents](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/security-events.ts#L8-L36), [ruleViolations](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/rule-violations.ts#L7-L66), [bypassEvents](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/bypass-events.ts#L7-L57), [rateLimitViolations](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/rate-limiting.ts#L12-L43), and [tokenBuckets](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/rate-limiting.ts#L46-L72) tables. Security events track violations, bypasses, and rate limiting.

### Error Logging
Error logging with severity levels and partitioning using [errorLogs](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/error-logs.ts#L13-L55) and [errorLogs202510](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/error-logs.ts#L58-L94) tables. Error logs are partitioned by month for performance.

**Partitioning:** Monthly partitioning for error logs.

## Privacy & Security Features

- **Data Encryption:** Server-side KMS encryption with Row Level Security (RLS) for snapshots
- **Privacy by Default:** Metadata-only storage for snapshots unless user explicitly opts in to cloud backup
- **Data Retention:** Configurable retention policies with [retention_config](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/retention-config.ts#L4-L13) table
- **Access Control:** API key permissions system with granular controls
- **Rate Limiting:** Token bucket algorithm implementation for rate limiting

## Performance Optimizations

- **Indexing:** Comprehensive indexing strategy with unique and composite indexes
- **Partitioning:** Monthly partitioning for time-series data tables
- **Caching:** [response_cache](file:///Users/user1/WebstormProjects/SnapBack-Site/packages/platform/src/db/schema/snapback/response-cache.ts#L7-L25) table for API responses
- **Materialized Views:** Planned materialized views for analytics performance

## Schema Quality

- **Normalization:** Well-normalized schema with proper foreign key relationships
- **Constraints:** Comprehensive use of constraints for data integrity
- **Documentation:** Good inline documentation explaining privacy principles and design decisions
- **Naming:** Consistent naming conventions following snake_case for columns

## Findings

### Strengths

1. **Strong privacy-first design principles with clear documentation**
   - The schema implements privacy-by-default with metadata-only storage and explicit opt-in for sensitive data

2. **Comprehensive foreign key relationships with CASCADE deletes**
   - Proper data integrity with CASCADE deletes ensuring related data is cleaned up appropriately

3. **Partitioned tables for time-series data performance**
   - Monthly partitioning for error logs, feature usage, and API usage logs improves query performance

4. **Comprehensive telemetry and analytics tracking**
   - Rich telemetry data with daily aggregations and idempotency support

### Considerations

1. **Additional indexes for specific query patterns**
   - Depending on query patterns, additional composite indexes might improve performance

## Recommendations

### Medium Priority

1. **Implement additional composite indexes based on common query patterns**
   - Analyze query logs to identify frequently used WHERE clauses and create appropriate composite indexes

2. **Add monitoring for constraint violations**
   - Implement alerts for foreign key constraint violations and other data integrity issues

### Low Priority

1. **Consider adding audit trails for sensitive operations**
   - Implement audit logging for changes to user permissions, API keys, and subscription changes