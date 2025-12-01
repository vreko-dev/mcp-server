# Extension API Integration

## Overview

Integration points between the VS Code extension and the SnapBack backend API.

## Authentication Flow

### JWT Token Management

-   Obtain JWT token through extension authentication
-   Store token securely using VS Code's secret storage
-   Refresh token when expired
-   Handle authentication errors gracefully

### User Context

-   Pass JWT token in Authorization header for all API requests
-   Extract user information from token for local display
-   Handle token validation errors from backend

## Core Feature Integration

### Checkpoint Creation

-   Capture workspace state
-   Serialize checkpoint data
-   Send to `/api/v1/checkpoints/metadata` endpoint
-   Handle rate limiting and usage limit responses

### Checkpoint Listing

-   Fetch checkpoint list from `/api/v1/checkpoints/list`
-   Display in extension UI
-   Handle pagination for large checkpoint sets
-   Implement filtering by project

## Telemetry Collection

### Event Types

-   Extension activation
-   Checkpoint creation
-   Checkpoint restoration
-   Error occurrences
-   Feature usage statistics

### Data Collection

-   Collect non-sensitive usage data
-   Anonymize user-specific information
-   Batch events to reduce API calls
-   Handle offline scenarios

## Error Handling

### Network Errors

-   Implement retry logic for failed requests
-   Show user-friendly error messages
-   Queue requests during offline periods
-   Sync when connectivity is restored

### Rate Limiting

-   Detect rate limit responses from backend
-   Show appropriate messaging to user
-   Implement backoff strategy
-   Guide user to upgrade plan if needed

## Performance Considerations

### Request Optimization

-   Minimize payload sizes
-   Implement caching where appropriate
-   Use compression for large payloads
-   Batch related requests

### Resource Management

-   Clean up event listeners
-   Manage memory usage
-   Optimize extension load time
-   Minimize impact on VS Code performance
