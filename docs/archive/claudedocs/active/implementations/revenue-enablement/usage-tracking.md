# Usage Tracking

## Overview

Implementation of usage tracking and limit enforcement for different subscription plans.

## Tracking Mechanisms

### Real-time Counters

Using Redis for fast increment operations:

-   API request counts per user/hour
-   Checkpoint creation counts per user
-   Storage usage per user

### Database Storage

Periodic sync of usage data to PostgreSQL:

-   Hourly snapshots of usage counters
-   Historical usage trends
-   Analytics reporting

## Plan Limits

### Free Plan

-   50 checkpoints
-   100 API requests per hour
-   100MB storage

### Pro Plan

-   500 checkpoints
-   1000 API requests per hour
-   1GB storage

### Enterprise Plan

-   5000 checkpoints
-   10000 API requests per hour
-   10GB storage

## Implementation Details

### Counter Management

-   Increment Redis counters on each relevant API call
-   Reset hourly counters at the start of each hour
-   Update storage usage when checkpoints are created/deleted

### Limit Checking

-   Check limits before processing requests
-   Return 429 Too Many Requests when limits are exceeded
-   Include remaining quota information in response headers

### Data Synchronization

-   Background job to sync Redis counters to database
-   Run synchronization every 5 minutes
-   Handle counter resets during sync process

## Analytics and Reporting

### Usage Metrics

-   Daily active users
-   Feature adoption rates
-   Peak usage times
-   Plan conversion rates

### Alerting

-   Notify when users approach usage limits
-   Flag unusual usage patterns
-   Report on system performance metrics

## Privacy Considerations

### Data Collection

-   Only collect usage data necessary for billing and service improvement
-   Anonymize data used for analytics
-   Allow users to opt-out of non-essential telemetry

### Data Retention

-   Store detailed usage data for 1 year
-   Aggregate and anonymize data after 1 month
-   Comply with data deletion requests
