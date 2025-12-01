# Integration Testing Plan for Revenue Enablement System

**Status**: Incomplete - Needs Implementation
**Owner**: TDD Implementation Team
**Last Updated**: 2025-10-04

## Overview

This document outlines the integration testing approach for validating the complete flow of the SnapBack revenue enablement system. Unlike unit tests that validate individual components in isolation, integration tests validate the interactions between components and external systems.

## Test Environment Setup

### Required Services

-   PostgreSQL database with SnapBack schema
-   Redis instance for rate limiting
-   Stripe test account with configured products
-   Supabase Storage for telemetry events

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/snapback_test

# Redis
REDIS_URL=redis://localhost:6379

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase
SUPABASE_URL=https://your-instance.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Middleware Integration Tests

### Authentication Middleware Integration

#### Test Scenario 1: Valid API Key Authentication Flow

**Description**: Validate that a request with a valid API key is properly authenticated and context is attached.

**Setup**:

1. Create test user in database
2. Generate valid API key using argon2 hashing
3. Insert API key into `api_keys` table

**Test Steps**:

1. Send request with valid Bearer token
2. Verify middleware calls database to lookup key
3. Verify argon2 verification is performed
4. Verify auth context is attached to request headers
5. Verify response status is 200

#### Test Scenario 2: Device Trial Authentication Flow

**Description**: Validate that device trial API keys are properly handled.

**Setup**:

1. Create device trial record in database
2. Link API key to device trial
3. Ensure device is not blocked

**Test Steps**:

1. Send request with device trial API key
2. Verify middleware looks up device trial
3. Verify device is not blocked
4. Verify device context is attached
5. Verify response status is 200

#### Test Scenario 3: JWT Token Authentication Flow

**Description**: Validate that JWT tokens from Better Auth are properly validated.

**Setup**:

1. Create test user in Better Auth
2. Generate valid JWT token

**Test Steps**:

1. Send request with valid JWT token
2. Verify middleware calls Better Auth session validation
3. Verify user context is attached
4. Verify response status is 200

### Rate Limiting Middleware Integration

#### Test Scenario 1: Redis-Based Rate Limiting

**Description**: Validate that rate limiting works with actual Redis integration.

**Setup**:

1. Configure Redis connection
2. Create test API key with free tier limits
3. Clear Redis bucket for test key

**Test Steps**:

1. Send 99 requests within 1 hour (under 100/hour limit)
2. Verify all requests are allowed
3. Send 100th request
4. Verify request is blocked with 429 status
5. Verify Retry-After header is present

#### Test Scenario 2: Plan-Based Limit Testing

**Description**: Validate that different subscription tiers have appropriate limits.

**Setup**:

1. Configure Redis connection
2. Create API keys for free, solo, and team tiers
3. Clear Redis buckets for all test keys

**Test Steps**:

1. Send requests to each tier key
2. Verify free tier: 100/hour limit
3. Verify solo tier: 1,000/hour limit
4. Verify team tier: 10,000/hour limit

### Usage Tracking Middleware Integration

#### Test Scenario 1: Checkpoint Limit Enforcement

**Description**: Validate that checkpoint limits are enforced for device trials.

**Setup**:

1. Create device trial with 50 checkpoint limit
2. Set current usage to 49 checkpoints

**Test Steps**:

1. Send checkpoint creation request (49/50 used)
2. Verify request is allowed
3. Send another checkpoint creation request (50/50 used)
4. Verify request is blocked with 402 status
5. Verify upgrade prompt is included

#### Test Scenario 2: API Call Tracking

**Description**: Validate that API calls are tracked in database.

**Setup**:

1. Create device trial with API call tracking
2. Set initial API call count

**Test Steps**:

1. Send API request
2. Verify apiCallsUsed counter is incremented
3. Verify lastSeenAt timestamp is updated
4. Verify database record is updated

## API Endpoint Integration Tests

### User Information Endpoint Integration

#### Test Scenario 1: Device Trial User Info

**Description**: Validate that device trial user information is properly retrieved.

**Setup**:

1. Create device trial with specific usage data
2. Set usage near limit threshold

**Test Steps**:

1. Send GET request to `/api/v1/user/me`
2. Verify device trial data is retrieved from database
3. Verify usage percentages are calculated correctly
4. Verify upgrade prompt is included when near limits

### Checkpoint Management Integration

#### Test Scenario 1: Checkpoint Creation with Limits

**Description**: Validate that checkpoint creation respects usage limits.

**Setup**:

1. Create device trial with checkpoint limit
2. Set current usage

**Test Steps**:

1. Send POST request to `/api/v1/checkpoints/metadata`
2. Verify usage is checked before creation
3. Verify checkpoint is created when under limit
4. Verify database counters are updated

#### Test Scenario 2: Checkpoint Listing with Pagination

**Description**: Validate that checkpoint listing works with pagination.

**Setup**:

1. Create multiple checkpoints for test user
2. Set up pagination parameters

**Test Steps**:

1. Send GET request to `/api/v1/checkpoints/list` with limit/offset
2. Verify correct checkpoints are returned
3. Verify totalCount is accurate
4. Verify pagination metadata is correct

### Telemetry Collection Integration

#### Test Scenario 1: Event Storage in Database

**Description**: Validate that telemetry events are stored in time-series database.

**Setup**:

1. Configure database connection
2. Clear telemetry events table

**Test Steps**:

1. Send POST request to `/api/v1/telemetry/event`
2. Verify event is inserted into database
3. Verify all event fields are stored correctly
4. Verify timestamps are properly handled

### Billing Integration

#### Test Scenario 1: Stripe Checkout Session Creation

**Description**: Validate that Stripe checkout sessions are created correctly.

**Setup**:

1. Configure Stripe test keys
2. Create test products in Stripe

**Test Steps**:

1. Send POST request to `/api/v1/billing/create-checkout`
2. Verify Stripe API is called with correct parameters
3. Verify checkout URL is returned
4. Verify session metadata includes user/API key info

## Cross-Component Integration Tests

### Complete User Journey

#### Test Scenario 1: Device Trial to Paid Conversion

**Description**: Validate the complete flow from device trial to paid subscription.

**Setup**:

1. Create new device trial
2. Configure Stripe test environment
3. Set up monitoring tools

**Test Steps**:

1. User creates device trial
2. User hits checkpoint limit
3. User clicks upgrade prompt
4. User completes Stripe checkout
5. User's API key is updated with new limits
6. User can create more checkpoints

#### Test Scenario 2: Abuse Prevention Flow

**Description**: Validate that device trial abuse prevention works.

**Setup**:

1. Create device trial
2. Simulate multiple reinstalls

**Test Steps**:

1. User reinstalls extension 3 times
2. Verify installCount is tracked
3. Verify device is blocked on 4th reinstall
4. Verify blockedUntil timestamp is set
5. Verify subsequent requests are blocked

## Test Data Management

### Test Data Setup

-   Use database transactions to isolate test data
-   Create test fixtures for common scenarios
-   Use factories for generating test data

### Test Data Cleanup

-   Rollback database transactions after each test
-   Clear Redis keys used in tests
-   Reset external service mocks

## Monitoring and Debugging

### Test Execution Monitoring

-   Log test execution times
-   Track database query performance
-   Monitor external service calls

### Debugging Integration Issues

-   Capture request/response data for failed tests
-   Log middleware execution flow
-   Track database state changes

## Performance Considerations

### Test Execution Speed

-   Use connection pooling for database tests
-   Mock external services where appropriate
-   Parallelize independent test scenarios

### Resource Management

-   Limit concurrent database connections
-   Clean up test data promptly
-   Monitor memory usage during tests

## Security Testing

### Authentication Security

-   Test expired JWT tokens
-   Test revoked API keys
-   Test malformed authentication headers

### Data Security

-   Verify sensitive data is not logged
-   Test input validation
-   Verify proper error responses for security issues

## Next Steps

1. Implement integration tests for middleware components
2. Implement integration tests for API endpoints
3. Set up continuous integration for integration tests
4. Document test results and performance metrics
5. Create troubleshooting guide for integration issues
