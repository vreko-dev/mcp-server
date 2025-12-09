# Environment Variables - Quick Checklist by App

**Use this to deploy each application without issues.**

---

## API Server (apps/api) ✅

### Must Have (CRITICAL)
- [ ] `DATABASE_URL` - PostgreSQL connection (pooled)
- [ ] `DIRECT_URL` - PostgreSQL for migrations (non-pooled)
- [ ] `REDIS_URL` - Redis connection
- [ ] `BETTER_AUTH_SECRET` - 32+ character secret
- [ ] `BETTER_AUTH_URL` - Auth service URL (e.g., http://localhost:3001)
- [ ] `APP_URL` - Application URL (e.g., http://localhost:3001)
- [ ] `NODE_ENV` - development|staging|production
- [ ] `PORT` - Server port (default: 3001)
- [ ] `HOST` - Bind address (0.0.0.0 for production)

### Should Have (IMPORTANT)
- [ ] `GITHUB_CLIENT_ID` - OAuth provider
- [ ] `GITHUB_CLIENT_SECRET` - OAuth provider
- [ ] `GOOGLE_CLIENT_ID` - OAuth provider
- [ ] `GOOGLE_CLIENT_SECRET` - OAuth provider
- [ ] `RESEND_API_KEY` - Email service
- [ ] `TURNSTILE_SITE_KEY` - CAPTCHA
- [ ] `TURNSTILE_SECRET_KEY` - CAPTCHA
- [ ] `STRIPE_SECRET_KEY` - Payments (if enabled)
- [ ] `STRIPE_WEBHOOK_SECRET` - Payments (if enabled)
- [ ] `SENTRY_DSN` - Error tracking
- [ ] `LOG_LEVEL` - debug|info|warn|error

### Nice to Have (OPTIONAL)
- [ ] `POSTHOG_API_KEY` - Analytics
- [ ] `AWS_ACCESS_KEY_ID` - Cloud storage
- [ ] `AWS_SECRET_ACCESS_KEY` - Cloud storage
- [ ] `S3_BUCKET_NAME` - Cloud storage bucket
- [ ] `SLACK_FEEDBACK_WEBHOOK` - Notifications
- [ ] `OPENAI_API_KEY` - AI features

**Test with**:
```bash
curl http://localhost:3001/health
```

---

## Web Application (apps/web) ✅

### Must Have (CRITICAL)
- [ ] `NEXT_PUBLIC_APP_URL` - App domain (e.g., http://console.localhost:3000)
- [ ] `NEXT_PUBLIC_SITE_URL` - Marketing domain (e.g., http://localhost:3000)
- [ ] `NEXT_PUBLIC_API_URL` - API endpoint (e.g., http://localhost:3001)
- [ ] `DATABASE_URL` - PostgreSQL connection
- [ ] `DIRECT_URL` - PostgreSQL for migrations
- [ ] `BETTER_AUTH_SECRET` - Auth secret (same as API)
- [ ] `NODE_ENV` - development|staging|production

### Should Have (IMPORTANT)
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Payments (public key)
- [ ] `STRIPE_SECRET_KEY` - Payments (server-side)
- [ ] `STRIPE_WEBHOOK_SECRET` - Payments webhook
- [ ] `RESEND_API_KEY` - Email service
- [ ] `NEXT_PUBLIC_SENTRY_DSN` - Error tracking

### Nice to Have (OPTIONAL)
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` - Analytics
- [ ] `NEXT_PUBLIC_POSTHOG_HOST` - Analytics host
- [ ] `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` - Google Analytics

**Test with**:
```bash
# Check that next/image can load
curl http://localhost:3000
# Check API calls work
curl -X GET http://localhost:3000/api/health
```

---

## MCP Server (apps/mcp-server) ✅

### Must Have (CRITICAL)
- [ ] `SNAPBACK_API_KEY` - API authentication key
- [ ] `SNAPBACK_API_URL` - API endpoint (e.g., http://localhost:3001)
- [ ] `API_URL` - For health checks (same as SNAPBACK_API_URL)
- [ ] `NODE_ENV` - development|staging|production
- [ ] `PORT` - Server port (default: 8081)

### Should Have (IMPORTANT)
- [ ] `DATABASE_URL` - If using local SQLite storage
- [ ] `LOG_LEVEL` - debug|info|warn|error

### Nice to Have (OPTIONAL)
- [ ] `CONTEXT7_API_KEY` - Code search integration
- [ ] `CONTEXT7_API_URL` - Code search endpoint
- [ ] `SNAPBACK_NO_NETWORK` - Offline mode (testing only)

**Test with**:
```bash
# Check MCP server is running
curl http://localhost:8081/health
```

---

## CLI Tool (apps/cli) ✅

### Must Have (CRITICAL)
- [ ] `SNAPBACK_API_KEY` - API authentication
- [ ] `SNAPBACK_API_URL` - API endpoint
- [ ] `NODE_ENV` - development|staging|production

### Should Have (IMPORTANT)
- [ ] `LOG_LEVEL` - debug|info|warn|error

### Nice to Have (OPTIONAL)
- [ ] `OUTPUT_FORMAT` - table|json|csv

**Test with**:
```bash
snapback --version
snapback health
```

---

## VS Code Extension (apps/vscode) ✅

### Must Have (CRITICAL)
- [ ] `API_URL` - API endpoint for commands
- [ ] Authentication setup in VS Code settings

### Should Have (IMPORTANT)
- [ ] Valid API key configured in extension settings

### Nice to Have (OPTIONAL)
- [ ] `POSTHOG_PROJECT_KEY` - Telemetry
- [ ] `SNAPBACK_RULES_PUBLIC_KEY` - Rule validation

**Test with**:
- Run "SnapBack: Check API Connection" command in VS Code

---

## Database (PostgreSQL) ✅

### Must Have (CRITICAL)
- [ ] PostgreSQL running on configured host:port
- [ ] Database created and accessible
- [ ] User has CREATEDB, CREATE EXTENSION permissions
- [ ] SSL enabled in production (sslmode=require)

**Setup**:
```bash
# Create database and user
createdb snapback_dev
createuser snapback -P

# Test connection
psql postgresql://snapback:password@localhost:5432/snapback_dev
```

---

## Cache & Sessions (Redis) ✅

### Must Have (CRITICAL)
- [ ] Redis running and accessible
- [ ] Authentication configured if needed
- [ ] Port open to application (default 6379)
- [ ] Persistence enabled (if needed)

**Setup**:
```bash
# Start Redis
redis-server

# Test connection
redis-cli ping  # Should return PONG
```

---

## Authentication (OAuth) ✅

### GitHub OAuth
- [ ] App created at https://github.com/settings/developers
- [ ] Client ID copied to `GITHUB_CLIENT_ID`
- [ ] Client Secret copied to `GITHUB_CLIENT_SECRET`
- [ ] Authorization callback URL: `{BETTER_AUTH_URL}/auth/callback/github`

### Google OAuth
- [ ] App created at https://console.cloud.google.com
- [ ] Client ID copied to `GOOGLE_CLIENT_ID`
- [ ] Client Secret copied to `GOOGLE_CLIENT_SECRET`
- [ ] Authorized redirect URI: `{BETTER_AUTH_URL}/auth/callback/google`

---

## Email Service (Resend) ✅

- [ ] Account created at https://resend.com
- [ ] API key generated and copied to `RESEND_API_KEY`
- [ ] Sender domain verified
- [ ] Test email sent successfully

**Test**:
```bash
# API endpoint
curl -X POST https://api.resend.com/emails \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -d "from=onboarding@resend.dev" \
  -d "to=email@example.com" \
  -d "subject=Test" \
  -d "html=<p>Test email</p>"
```

---

## Security (Cloudflare Turnstile) ✅

- [ ] Account created at https://dash.cloudflare.com
- [ ] Turnstile site created
- [ ] Site Key copied to `TURNSTILE_SITE_KEY`
- [ ] Secret Key copied to `TURNSTILE_SECRET_KEY`

---

## Payments (Stripe) ✅

- [ ] Dashboard at https://dashboard.stripe.com
- [ ] API keys generated
- [ ] Secret key (sk_) copied to `STRIPE_SECRET_KEY`
- [ ] Publishable key (pk_) copied to `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Webhook endpoint configured
- [ ] Webhook secret copied to `STRIPE_WEBHOOK_SECRET`
- [ ] Product prices created and IDs copied

---

## Error Tracking (Sentry) ✅

- [ ] Account created at https://sentry.io
- [ ] Project created
- [ ] DSN copied to `SENTRY_DSN`
- [ ] Test event sent: `Sentry.captureException(new Error("test"))`

---

## Analytics (PostHog) ✅

- [ ] Account created at https://posthog.com
- [ ] Project created
- [ ] API key copied to `POSTHOG_API_KEY`
- [ ] Public key copied to `NEXT_PUBLIC_POSTHOG_KEY`

---

## Storage (AWS S3) ✅ (Optional)

- [ ] AWS account and IAM user created
- [ ] Access key ID copied to `AWS_ACCESS_KEY_ID`
- [ ] Secret access key copied to `AWS_SECRET_ACCESS_KEY`
- [ ] S3 bucket created in correct region
- [ ] Bucket name copied to `S3_BUCKET_NAME`
- [ ] Region copied to `AWS_REGION`
- [ ] CloudFront distribution (optional) URL copied to `CDN_URL`

---

## Production Deployment Checklist

### Pre-Deployment
- [ ] All CRITICAL variables configured
- [ ] All IMPORTANT variables configured (or feature disabled)
- [ ] Secrets stored in vault/secrets manager (not committed)
- [ ] Database backups enabled
- [ ] SSL certificates configured
- [ ] Monitoring and alerting set up
- [ ] Rollback plan documented

### During Deployment
- [ ] Health checks passing
- [ ] No error spikes in Sentry
- [ ] User authentication working
- [ ] API requests responding normally
- [ ] Database queries performing well

### Post-Deployment
- [ ] End-to-end test completed
- [ ] User sign-up flow works
- [ ] OAuth providers working
- [ ] Email notifications sent
- [ ] Payments processing (if enabled)
- [ ] Analytics events tracked

---

## Troubleshooting

### "Cannot connect to database"
→ Check `DATABASE_URL` format and network access
→ Verify PostgreSQL is running
→ Check credentials with: `psql $DATABASE_URL`

### "Sessions not persisting"
→ Check `REDIS_URL` is correct
→ Verify Redis is running: `redis-cli ping`
→ Check Redis has enough memory

### "OAuth sign-in fails"
→ Verify callback URL matches `BETTER_AUTH_URL`
→ Check Client ID/Secret are correct
→ Review OAuth app settings

### "Emails not sending"
→ Check `RESEND_API_KEY` is valid
→ Verify sender domain is verified in Resend
→ Check logs for SMTP errors

### "API key rejected"
→ Ensure `SNAPBACK_API_KEY` format is correct
→ Verify key is not expired
→ Check key has required permissions

---

## Generate Required Secrets

```bash
# BETTER_AUTH_SECRET (32+ chars)
openssl rand -base64 32

# Database password
openssl rand -hex 16

# Redis password
openssl rand -hex 16

# API key
openssl rand -hex 32
```

---

## See Also

- Full reference: `ENVIRONMENT_VARIABLES_BY_IMPORTANCE.md`
- Setup guide: `ENV_CONFIG_SETUP.md`
- Quick start: `ENV_QUICKSTART.md`
- Validation: Run `bash scripts/validate-env.sh`
