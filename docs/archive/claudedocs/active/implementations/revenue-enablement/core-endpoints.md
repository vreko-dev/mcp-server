# Core Endpoints Implementation

## Overview

Implementation details for the 5 critical API endpoints needed for monetization:

1. `GET /api/v1/user/me` - User info with plan and limits
2. `POST /api/v1/checkpoints/metadata` - Core feature
3. `GET /api/v1/checkpoints/list` - Checkpoint listing
4. `POST /api/v1/telemetry/event` - Extension telemetry
5. `POST /api/v1/billing/create-checkout` - Payment flow

## GET /api/v1/user/me

### Purpose

Return user information including subscription plan and usage limits.

### Response Structure

```json
{
  "userId": "string",
  "email": "string",
  "plan": "free|pro|enterprise",
  "limits": {
    "checkpoints": number,
    "requestsPerHour": number,
    "storage": number // in MB
  },
  "usage": {
    "checkpoints": number,
    "requestsThisHour": number,
    "storage": number // in MB
  }
}
```

### Implementation Notes

-   Fetch user data from database
-   Calculate current usage from Redis counters
-   Return plan-specific limits

## POST /api/v1/checkpoints/metadata

### Purpose

Create and store checkpoint metadata.

### Request Body

```json
{
	"name": "string",
	"description": "string",
	"tags": ["string"],
	"projectId": "string"
}
```

### Response Structure

```json
{
	"checkpointId": "string",
	"createdAt": "ISO timestamp",
	"metadata": {
		"name": "string",
		"description": "string",
		"tags": ["string"],
		"projectId": "string"
	}
}
```

### Implementation Notes

-   Validate user has not exceeded checkpoint limit
-   Store metadata in database
-   Update usage counter

## GET /api/v1/checkpoints/list

### Purpose

List checkpoints for the authenticated user.

### Query Parameters

-   `projectId` (optional) - Filter by project
-   `limit` (optional, default 50) - Number of checkpoints to return
-   `offset` (optional, default 0) - Pagination offset

### Response Structure

```json
{
  "checkpoints": [
    {
      "checkpointId": "string",
      "name": "string",
      "createdAt": "ISO timestamp",
      "projectId": "string"
    }
  ],
  "totalCount": number
}
```

### Implementation Notes

-   Query database for user's checkpoints
-   Apply filtering and pagination
-   Return sorted by creation date

## POST /api/v1/telemetry/event

### Purpose

Collect telemetry data from the VS Code extension.

### Request Body

```json
{
	"eventType": "string",
	"timestamp": "ISO timestamp",
	"data": {}
}
```

### Response Structure

```json
{
	"success": true
}
```

### Implementation Notes

-   Basic event logging
-   No heavy processing to minimize latency
-   Store in time-series database for analytics

## POST /api/v1/billing/create-checkout

### Purpose

Create a Stripe checkout session for plan upgrades.

### Request Body

```json
{
	"plan": "pro|enterprise",
	"successUrl": "string",
	"cancelUrl": "string"
}
```

### Response Structure

```json
{
	"checkoutUrl": "string"
}
```

### Implementation Notes

-   Create Stripe checkout session
-   Pass plan information and redirect URLs
-   Return checkout URL to client
