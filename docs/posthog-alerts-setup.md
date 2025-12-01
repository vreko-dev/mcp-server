# PostHog Alerts Setup Guide

This guide explains how to set up alerts for key metrics in PostHog as defined in the KPI dashboard configuration.

## Overview

The alerting system monitors key metrics and sends notifications when thresholds are breached. The following alerts are configured:

1. **TTFV p75 Alert** - Triggers when Time to First Value p75 exceeds 7 minutes
2. **Onboarding Completion Rate Alert** - Triggers when completion rate drops below 60%
3. **Crash-free Sessions Alert** - Triggers when crash-free rate drops below 95%
4. **Replay Budget Alert** - Triggers when replay budget exceeds 80% of monthly budget
5. **D7 Retention Alert** - Triggers when D7 retention drops by more than 5% from baseline

## Prerequisites

1. PostHog account with appropriate permissions
2. Personal API key with required scopes
3. Environment variables configured:
   - `POSTHOG_PERSONAL_API_KEY` - Your PostHog personal API key
   - `POSTHOG_HOST` - Your PostHog instance URL (defaults to https://app.posthog.com)

## Setup Process

### Automated Setup

1. Run the setup script:
   ```bash
   pnpm run setup-posthog-alerts
   ```

2. For a dry run (to see what would be created without actually creating alerts):
   ```bash
   pnpm run setup-posthog-alerts:dry-run
   ```

### Manual Setup

Since PostHog doesn't currently have a direct API for creating alerts, you'll need to manually create them in the PostHog UI:

1. Navigate to your PostHog dashboard
2. Create insights for each key metric:
   - TTFV p75
   - Onboarding completion rate
   - Crash-free sessions rate
   - Replay budget
   - D7 retention
3. For each insight, click the "Alerts" button
4. Click "New alert" and configure according to the specifications in `KEY_METRIC_ALERTS`

## Alert Configuration Details

### TTFV p75 Alert
- **Metric**: Time to First Value p75
- **Threshold**: > 7 minutes
- **Frequency**: Daily
- **Recipients**: engineering-team@snapback.ai

### Onboarding Completion Rate Alert
- **Metric**: Onboarding completion rate
- **Threshold**: < 60%
- **Frequency**: Daily
- **Recipients**: product-team@snapback.ai

### Crash-free Sessions Alert
- **Metric**: Crash-free sessions rate
- **Threshold**: < 95%
- **Frequency**: Daily
- **Recipients**: engineering-team@snapback.ai

### Replay Budget Alert
- **Metric**: Replay budget usage
- **Threshold**: > 80% of monthly budget
- **Frequency**: Weekly
- **Recipients**: analytics-team@snapback.ai

### D7 Retention Alert
- **Metric**: D7 retention rate
- **Threshold**: Decrease by > 5% from baseline
- **Frequency**: Weekly
- **Recipients**: growth-team@snapback.ai

## Monitoring and Maintenance

1. Regularly review alert triggers to ensure they're providing value
2. Adjust thresholds as needed based on historical data
3. Update recipient lists as team structures change
4. Monitor alert fatigue and adjust frequency if needed

## Troubleshooting

### Common Issues

1. **Missing Environment Variables**
   - Ensure `POSTHOG_PERSONAL_API_KEY` is set
   - Verify the API key has appropriate permissions

2. **API Rate Limiting**
   - PostHog API has rate limits for personal API keys
   - See [PostHog API documentation](https://posthog.com/docs/api) for details

3. **Permission Errors**
   - Verify your personal API key has the required scopes
   - Check that you have access to the project in PostHog

### Logs and Debugging

Check the application logs for any errors during alert setup:
```bash
# Check logs for the setup process
tail -f logs/application.log | grep "PostHog Alert"
```

## Future Improvements

1. Implement direct API integration when PostHog provides alert management APIs
2. Add support for Slack and other notification channels
3. Create automated tests for alert configurations
4. Implement alert history tracking and analytics