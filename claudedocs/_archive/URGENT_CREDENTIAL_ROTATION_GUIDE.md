# 🚨 URGENT: Credential Rotation Guide

**Date**: 2025-01-13
**Priority**: 🔴 **CRITICAL - ACTION REQUIRED WITHIN 24 HOURS**
**Risk Level**: High - Production credentials exposed in `.env.local`

---

## Executive Summary

The security audit revealed that production credentials are currently stored in `apps/web/.env.local`. While this file is **not committed to git** (verified ✅), the credentials should be rotated as a security best practice since they were exposed during the audit.

**Good News**: No evidence of git history exposure
**Required Action**: Rotate all credentials listed below

---

## Credentials Requiring Rotation

### 1. Database Password (PostgreSQL)
**Current Location**: `apps/web/.env.local:20,39,42`
**Current Value**: `Samynn2017!!`

**Steps to Rotate**:
1. Go to [Supabase Dashboard](https://app.supabase.com/project/gjnopifuehuuuhubqajj/settings/database)
2. Navigate to **Settings → Database → Connection Pooling**
3. Click "Reset Database Password"
4. Copy the new password
5. Update in `.env.local`:
   ```bash
   DATABASE_URL="postgresql://postgres.gjnopifuehuuuhubqajj:NEW_PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
   SUPABASE_URL="postgresql://postgres:NEW_PASSWORD@db.gjnopifuehuuuhubqajj.supabase.co:5432/postgres"
   ```

**Impact**: Medium - Requires app restart, no downtime if done during deployment

---

### 2. Supabase Service Role Key
**Current Location**: `apps/web/.env.local:44`
**Current Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Steps to Rotate**:
1. Go to [Supabase Dashboard](https://app.supabase.com/project/gjnopifuehuuuhubqajj/settings/api)
2. Navigate to **Settings → API**
3. Under "Service Role", click "Reveal" then "Regenerate"
4. Copy the new service role key
5. Update in `.env.local`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY="NEW_SERVICE_ROLE_KEY"
   ```

**Impact**: High - Full admin access, rotate immediately

---

### 3. S3 Secret Access Key
**Current Location**: `apps/web/.env.local:46`
**Current Value**: `a716f2ab00ab81af3bed4956140d526bb8f59340cacc0c358ffbc73e98f67461`

**Steps to Rotate**:
1. Go to [Supabase Storage Settings](https://app.supabase.com/project/gjnopifuehuuuhubqajj/settings/storage)
2. Navigate to **Settings → Storage → S3 Access**
3. Generate new access key pair
4. Update in `.env.local`:
   ```bash
   S3_ACCESS_KEY_ID="NEW_ACCESS_KEY_ID"
   S3_SECRET_ACCESS_KEY="NEW_SECRET_ACCESS_KEY"
   ```

**Impact**: Medium - Affects file uploads/downloads

---

### 4. Resend API Key
**Current Location**: `apps/web/.env.local:66`
**Current Value**: `re_Jv8e12xQ_...`

**Steps to Rotate**:
1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Click "Create API Key"
3. Name it "SnapBack Production" with appropriate permissions
4. Copy the new key
5. Update in `.env.local`:
   ```bash
   RESEND_API_KEY="NEW_RESEND_KEY"
   ```
6. Delete the old key from Resend dashboard

**Impact**: Medium - Affects email sending (magic links, invitations)

---

### 5. Sentry Auth Token
**Current Location**: `apps/web/.env.local:52`
**Current Value**: `sntrys_eyJpYXQiOjE3NjI3MTg0NjYuMjEwNzc1...`

**Steps to Rotate**:
1. Go to [Sentry Settings](https://sentry.io/settings/snapback-web/developer-settings/auth-tokens/)
2. Navigate to **Settings → Auth Tokens**
3. Create new token with "Release: Admin" permission
4. Copy the new token
5. Update in `.env.local`:
   ```bash
   SENTRY_AUTH_TOKEN="NEW_SENTRY_TOKEN"
   ```
6. Revoke the old token

**Impact**: Low - Only affects error tracking uploads during deployment

---

### 6. HubSpot Access Token
**Current Location**: `apps/web/.env.local:71`
**Current Value**: `a58faabe-ac74-4493-a990-07942216f3c9`

**Steps to Rotate**:
1. Go to [HubSpot Private Apps](https://app.hubspot.com/settings/apps/private-apps)
2. Click on your existing app or create new
3. Rotate the access token or create new app
4. Update in `.env.local`:
   ```bash
   HUBSPOT_ACCESS_TOKEN="NEW_HUBSPOT_TOKEN"
   ```

**Impact**: Low - Affects CRM integration (contact sync)

---

### 7. Google OAuth Client Secret
**Current Location**: `apps/web/.env.local:17,83`
**Current Value**: `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`

**Steps to Rotate**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Click "Add Secret" to create new secret
4. Copy the new secret
5. Update in `.env.local`:
   ```bash
   GOOGLE_CLIENT_SECRET="NEW_GOOGLE_SECRET"
   ```
6. Delete the old secret after verifying new one works

**Impact**: High - Affects Google sign-in

---

### 8. Upstash Redis Token
**Current Location**: `apps/web/.env.local:77`
**Current Value**: `AX_BAAIncDI0OGI0MTEyYjQ1NzQ0ODA3YWJkYzY3N2E5YmM5MDE4MHAyMzI3MDU`

**Steps to Rotate**:
1. Go to [Upstash Console](https://console.upstash.com/)
2. Select your Redis instance
3. Navigate to "REST API" tab
4. Click "Regenerate Token"
5. Update in `.env.local`:
   ```bash
   UPSTASH_REDIS_REST_TOKEN="NEW_UPSTASH_TOKEN"
   ```

**Impact**: Low - Affects rate limiting and caching

---

## Rotation Checklist

Use this checklist to track your progress:

```
[ ] 1. Database Password (PostgreSQL)
[ ] 2. Supabase Service Role Key
[ ] 3. S3 Secret Access Key
[ ] 4. Resend API Key
[ ] 5. Sentry Auth Token
[ ] 6. HubSpot Access Token
[ ] 7. Google OAuth Client Secret
[ ] 8. Upstash Redis Token
[ ] 9. Update production environment (Vercel)
[ ] 10. Test all integrations
[ ] 11. Verify no old credentials remain
```

---

## Production Environment Update (Vercel)

After rotating credentials in `.env.local`, update them in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/your-project/settings/environment-variables)
2. Navigate to **Settings → Environment Variables**
3. For each credential:
   - Click "Edit" on existing variable
   - Replace with new value
   - Ensure it's set for "Production" environment
4. Trigger a new deployment:
   ```bash
   git commit --allow-empty -m "chore: rotate credentials"
   git push
   ```

---

## Testing After Rotation

### 1. Database Connection
```bash
# Test database connection
pnpm --filter @snapback/web dev
# Visit http://localhost:3000 and verify app loads
```

### 2. Email Functionality
```bash
# Test magic link email
curl -X POST http://localhost:3000/api/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### 3. Google OAuth
```bash
# Visit http://localhost:3000/auth/login
# Click "Sign in with Google"
# Verify sign-in flow completes
```

### 4. File Upload (S3)
```bash
# Test avatar upload in settings
# Visit http://localhost:3000/settings/profile
# Upload new avatar image
```

### 5. Error Tracking (Sentry)
```bash
# Verify Sentry receives events
# Visit http://localhost:3000/sentry-test
# Check Sentry dashboard for test error
```

---

## Security Best Practices Going Forward

### ✅ Implemented
- [x] `.env.local` properly gitignored
- [x] CSRF protection enabled
- [x] Rate limiting on API routes
- [x] Zod validation for auth context
- [x] Security headers configured
- [x] CORS restricted to allowed origins

### 🔄 Recommended
1. **Use Secret Management Service**
   - Consider [Vercel Secret Scanning](https://vercel.com/docs/security/secret-scanning)
   - Or [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
   - Or [HashiCorp Vault](https://www.vaultproject.io/)

2. **Rotate Credentials Regularly**
   - Database: Every 90 days
   - API Keys: Every 90 days
   - OAuth Secrets: Every 180 days

3. **Enable 2FA/MFA**
   - Supabase dashboard
   - Vercel account
   - Google Cloud Console
   - All service dashboards

4. **Monitor for Leaks**
   - Enable GitHub secret scanning
   - Use [GitGuardian](https://www.gitguardian.com/)
   - Set up alerts for credential exposure

---

## Emergency Contacts

If credentials were compromised:

1. **Immediate Actions**:
   - Rotate all credentials immediately
   - Review recent database/API activity
   - Check Sentry/CloudWatch logs for anomalies
   - Enable 2FA on all services

2. **Incident Response**:
   - Document what was exposed and when
   - Review access logs for unauthorized access
   - Notify affected users if data breach occurred
   - File incident report with security team

---

## Verification Commands

After rotation, run these commands to verify:

```bash
# 1. Check no credentials in git history
git log --all --full-history --source --oneline -- "**/.env*"
# Should be empty

# 2. Check .gitignore covers .env.local
grep -r "\.env\.local" .gitignore
# Should show .env.local is ignored

# 3. Run security audit
pnpm audit
# Should show no critical vulnerabilities

# 4. Test production build
pnpm --filter @snapback/web build
# Should succeed without errors
```

---

## Summary

**Total Credentials to Rotate**: 8
**Estimated Time**: 30-45 minutes
**Downtime Required**: None (zero-downtime rotation)
**Priority**: 🔴 CRITICAL - Complete within 24 hours

**Next Steps**:
1. Start with high-impact credentials (#2, #3, #7)
2. Test each rotation before moving to next
3. Update production environment (Vercel)
4. Run verification tests
5. Mark this task complete in audit tracker

---

**Questions?** Contact security team or refer to audit report: `COMPREHENSIVE_WEB_AUDIT_2025-11-08.md`
