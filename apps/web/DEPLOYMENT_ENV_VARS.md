# apps/web - Production Environment Variables

Complete guide for deploying the SnapBack web application with multi-subdomain architecture.

---

## 🏗️ Domain Architecture

SnapBack uses a **multi-subdomain architecture**:

| Subdomain | URL | Purpose | Routes |
|-----------|-----|---------|--------|
| **Main** | `snapback.dev` | Marketing site | Landing, pricing, features, about |
| **Console** | `console.snapback.dev` | SaaS application | Dashboard, settings, admin, billing |
| **Docs** | `docs.snapback.dev` | Documentation | Guides, API docs, tutorials |

**Local Development URLs**:
- Marketing: `http://localhost:3000`
- Console: `http://console.localhost:3000`
- Docs: `http://docs.localhost:3000`

---

## 🔴 CRITICAL - Required for Basic Functionality

These variables **MUST** be set for the application to build and run.

### Site Configuration
```bash
NEXT_PUBLIC_SITE_URL="https://snapback.dev"
NEXT_PUBLIC_APP_URL="https://console.snapback.dev"
NEXT_PUBLIC_ROOT_DOMAIN="snapback.dev"
NODE_ENV="production"
```

**URL Structure**:
- **SITE_URL**: Marketing site (landing, pricing, features)
- **APP_URL**: SaaS application (dashboard, settings, admin)
- **ROOT_DOMAIN**: Base domain for subdomain routing (REQUIRED)

### Database (PostgreSQL)
```bash
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
```
**Source**: Database provider (Supabase, Railway, Neon, etc.)
**Format**: Must be a valid PostgreSQL connection string with SSL enabled

### Authentication (Better Auth)
```bash
BETTER_AUTH_SECRET="<generate-with-openssl-rand-base64-32>"
```
**Generate**: `openssl rand -base64 32`
**Important**: Must be exactly 32 bytes when base64 decoded

---

## 🟡 IMPORTANT - Required for Full Features

These variables enable core product features and integrations.

### OAuth Providers

#### GitHub OAuth
```bash
GITHUB_CLIENT_ID="Ov23li..."
GITHUB_CLIENT_SECRET="1234567890abcdef..."
```
**Setup**: [GitHub OAuth Apps](https://github.com/settings/developers)
**Callback URLs** (add both):
- `https://console.snapback.dev/api/auth/callback/github`
- `https://snapback.dev/api/auth/callback/github` (fallback)

#### Google OAuth
```bash
GOOGLE_CLIENT_ID="123456789-abc.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abc123..."
```
**Setup**: [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
**Callback URLs** (add both):
- `https://console.snapback.dev/api/auth/callback/google`
- `https://snapback.dev/api/auth/callback/google` (fallback)

### Payments (Stripe)
```bash
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
```
**Source**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
**Webhook URL**: `https://console.snapback.dev/api/webhooks/stripe`
**Events to listen**: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

#### Stripe Price IDs (Optional - for pricing page)
```bash
STRIPE_SOLO_MONTHLY_PRICE_ID="price_..."
STRIPE_TEAM_MONTHLY_PRICE_ID="price_..."
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID="price_..."
NEXT_PUBLIC_PRICE_ID_PRO_MONTHLY="price_..."
NEXT_PUBLIC_PRICE_ID_PRO_YEARLY="price_..."
NEXT_PUBLIC_PRICE_ID_LIFETIME="price_..."
```
**Source**: Stripe Dashboard > Products > Price IDs

### Email (Resend)
```bash
RESEND_API_KEY="re_..."
```
**Source**: [Resend Dashboard](https://resend.com/api-keys)
**Used for**: Waitlist confirmations, transactional emails

---

## 🟢 RECOMMENDED - Enhanced Functionality

These variables enable monitoring, analytics, and advanced features.

### Analytics & Monitoring

#### PostHog (Product Analytics)
```bash
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
```
**Source**: [PostHog Dashboard](https://app.posthog.com)
**Optional**: If not set, analytics will be disabled
**Note**: PostHog is the canonical analytics engine for SnapBack

#### Sentry (Error Tracking)
```bash
NEXT_PUBLIC_SENTRY_DSN="https://...@sentry.io/..."
SENTRY_AUTH_TOKEN="sntrys_..."
SENTRY_ORG="your-org"
SENTRY_PROJECT="snapback-web"
```
**Source**: [Sentry Dashboard](https://sentry.io)
**CI Only**: Auth token only needed for CI/CD (source map uploads)

### Storage (Supabase)
```bash
SUPABASE_URL="https://xxxxx.supabase.co"
SUPABASE_PUBLISHABLE_DEFAULT_KEY="eyJhbGciOiJIUzI1..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1..."
NEXT_PUBLIC_AVATARS_BUCKET_NAME="avatars"
```
**Source**: [Supabase Project Settings](https://app.supabase.com/project/_/settings/api)
**Used for**: User avatar uploads

### Alternative S3 Storage (Optional)
```bash
S3_ACCESS_KEY_ID="AKIA..."
S3_SECRET_ACCESS_KEY="..."
S3_ENDPOINT="https://s3.amazonaws.com"
S3_REGION="us-east-1"
```
**Alternative to**: Supabase storage
**Providers**: AWS S3, DigitalOcean Spaces, Backblaze B2

---

## ⚪ OPTIONAL - Advanced Features

These variables enable optional integrations and features.

### CRM Integration (HubSpot)
```bash
HUBSPOT_ACCESS_TOKEN="pat-na1-..."
```
**Source**: [HubSpot Private Apps](https://app.hubspot.com/settings/apps/private-apps)
**Scopes**: `crm.objects.contacts.read`, `crm.objects.contacts.write`
**Used for**: Waitlist → HubSpot contact sync

### AI Services (OpenAI)
```bash
OPENAI_API_KEY="sk-..."
```
**Source**: [OpenAI API Keys](https://platform.openai.com/api-keys)
**Used for**: Future AI-powered features (currently optional)

### Redis (Caching/Rate Limiting)
```bash
REDIS_URL="redis://default:password@host:port"
```
**Providers**: Upstash, Redis Cloud, Railway
**Used for**: Rate limiting, session storage (optional)

### Docs Subdomain (Optional Override)
```bash
NEXT_PUBLIC_DOCS_URL="https://docs.snapback.dev"
```
**Default**: Automatically set to `https://docs.${ROOT_DOMAIN}`
**Override**: Only needed for custom docs domain

---

## 🌐 Subdomain Routing Configuration

The middleware automatically handles subdomain routing:

### Console Subdomain (`console.snapback.dev`)
**Auto-redirects from main domain**:
- `snapback.dev/dashboard` → `console.snapback.dev/dashboard`
- `snapback.dev/settings` → `console.snapback.dev/settings`
- `snapback.dev/admin` → `console.snapback.dev/admin`

**SaaS Routes**:
- `/dashboard` - Main dashboard
- `/settings/*` - User/org settings
- `/admin/*` - Admin panel
- `/api-keys` - API key management
- `/choose-plan` - Plan selection
- `/organization-invitation/*` - Org invites
- `/new-organization` - Create org
- `/onboarding` - User onboarding

### Docs Subdomain (`docs.snapback.dev`)
**Rewrites internally to `/docs/*`**:
- `docs.snapback.dev/quick-start` → `/docs/quick-start`
- `docs.snapback.dev/api` → `/docs/api`

### Main Domain (`snapback.dev`)
**Marketing routes**:
- `/` - Landing page
- `/pricing` - Pricing page
- `/features` - Features page
- `/about` - About page

---

## 📋 Platform-Specific Notes

### Vercel Deployment

#### 1. Domain Configuration
Add these domains in Vercel Dashboard > Settings > Domains:
- `snapback.dev` (main)
- `console.snapback.dev` (console)
- `docs.snapback.dev` (docs)
- `www.snapback.dev` (redirect to main)

#### 2. Environment Variables
Settings > Environment Variables:
```bash
# Production Environment
NEXT_PUBLIC_SITE_URL="https://snapback.dev"
NEXT_PUBLIC_APP_URL="https://console.snapback.dev"
NEXT_PUBLIC_ROOT_DOMAIN="snapback.dev"
# ... add all other variables
```

#### 3. Preview Deployments
Vercel automatically creates preview URLs:
- Main: `https://<branch>-snapback.vercel.app`
- Console: `https://console---<branch>-snapback.vercel.app`
- Docs: `https://docs---<branch>-snapback.vercel.app`

Set preview environment variables:
```bash
NEXT_PUBLIC_SITE_URL="https://<branch>-snapback.vercel.app"
NEXT_PUBLIC_APP_URL="https://console---<branch>-snapback.vercel.app"
NEXT_PUBLIC_ROOT_DOMAIN="<branch>-snapback.vercel.app"
```

#### 4. Auto-Detected Variables
- `NODE_ENV=production` (automatic)
- `VERCEL_URL` (provided by Vercel)
- SSL certificates (automatic)

### Docker Deployment
Create `.env.production` file:
```bash
docker build --build-arg NODE_ENV=production .
docker run --env-file .env.production -p 3000:3000 snapback-web
```

**Important**: Configure reverse proxy (nginx/Caddy) for subdomain routing:
```nginx
server {
  server_name console.snapback.dev;
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
  }
}

server {
  server_name docs.snapback.dev;
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
  }
}
```

### Railway/Render Deployment
1. Add custom domains for each subdomain
2. Ensure `DATABASE_URL` includes `?sslmode=require`
3. Set `NEXT_PUBLIC_ROOT_DOMAIN` to your root domain

---

## 🔒 Security Best Practices

### Never Commit
- ❌ Never commit `.env.local`, `.env.production` to git
- ✅ Always use `.env.example` as template
- ✅ Use platform secret management (Vercel Secrets, Railway Variables)

### Key Rotation
- **BETTER_AUTH_SECRET**: Rotate every 90 days (invalidates sessions)
- **Stripe Keys**: Use live keys only in production
- **OAuth Secrets**: Rotate if compromised

### Subdomain Security
- **CORS**: Ensure console.snapback.dev can communicate with snapback.dev APIs
- **Cookies**: Set `Domain=.snapback.dev` for shared authentication cookies
- **CSP**: Update Content Security Policy for subdomain resources

### Validation
The app validates all env vars at build time using [@t3-oss/env-nextjs](https://env.t3.gg/).
**Location**: `apps/web/lib/env.ts`

Build will fail if:
- Required variables are missing
- Variables have wrong format (e.g., URLs malformed, Stripe keys don't start with `sk_`)

---

## ✅ Deployment Checklist

### Pre-Deployment
- [ ] Copy `.env.example` → `.env.production`
- [ ] Generate `BETTER_AUTH_SECRET`: `openssl rand -base64 32`
- [ ] Set up PostgreSQL database with SSL
- [ ] Configure DNS for all subdomains (console, docs, www)
- [ ] Configure OAuth apps with ALL callback URLs (main + console)
- [ ] Create Stripe webhook for console subdomain
- [ ] Get Resend API key
- [ ] Set up Sentry project (optional)
- [ ] Verify `NEXT_PUBLIC_ROOT_DOMAIN` is set correctly

### Post-Deployment
- [ ] Test subdomain routing (main, console, docs)
- [ ] Verify redirects from main domain to console work
- [ ] Test OAuth login flows on console.snapback.dev
- [ ] Verify Stripe webhook receives events
- [ ] Check Sentry error tracking works
- [ ] Confirm analytics tracking (PostHog/GA)
- [ ] Test email sending (Resend)
- [ ] Verify database migrations ran
- [ ] Test cross-subdomain session persistence

### DNS Configuration
Ensure these records are set:
```
A     snapback.dev           → <your-server-ip>
CNAME console.snapback.dev   → snapback.dev
CNAME docs.snapback.dev      → snapback.dev
CNAME www.snapback.dev       → snapback.dev
```

For Vercel:
```
A     snapback.dev           → 76.76.21.21
CNAME console.snapback.dev   → cname.vercel-dns.com
CNAME docs.snapback.dev      → cname.vercel-dns.com
CNAME www.snapback.dev       → cname.vercel-dns.com
```

---

## 🆘 Troubleshooting

### Subdomain Routing Not Working
- Verify `NEXT_PUBLIC_ROOT_DOMAIN` is set correctly
- Check DNS records are propagated (use `dig console.snapback.dev`)
- Ensure middleware is not cached (clear `.next` folder)
- Test with `curl -H "Host: console.snapback.dev" http://localhost:3000/dashboard`

### OAuth Redirects to Wrong Domain
- Verify both main and console domains are in OAuth callback URLs
- Check `NEXT_PUBLIC_APP_URL` points to console subdomain
- Ensure Better Auth is using correct base URL

### Stripe Webhooks Failing
- Verify `STRIPE_WEBHOOK_SECRET` matches webhook in Stripe dashboard
- Ensure webhook URL is `console.snapback.dev/api/webhooks/stripe`
- Check webhook endpoint is publicly accessible
- Review Stripe webhook logs for errors

### Build Fails: "Environment validation failed"
- Check `apps/web/lib/env.ts` for required variables
- Ensure all URLs are valid (include protocol: `https://`)
- Verify `NEXT_PUBLIC_ROOT_DOMAIN` is set (REQUIRED)
- Verify Stripe keys start with `sk_`

### Cross-Subdomain Session Issues
- Ensure cookies are set with `Domain=.snapback.dev`
- Check Better Auth configuration for domain settings
- Verify `BETTER_AUTH_SECRET` is the same across all deployments

---

## 📚 Additional Resources

- **Environment Variables Guide**: [Next.js Docs](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- **Validation Schema**: `apps/web/lib/env.ts`
- **Example Config**: `apps/web/.env.example`
- **Middleware**: `apps/web/middleware.ts`
- **Better Auth Docs**: https://www.better-auth.com/docs
- **Stripe Integration**: https://stripe.com/docs/webhooks
- **Multi-Tenancy Pattern**: https://vercel.com/guides/nextjs-multi-tenant-application

---

## 📊 Quick Reference

### Local Development
```bash
# Main marketing site
http://localhost:3000

# Console (SaaS app)
http://console.localhost:3000/dashboard

# Docs
http://docs.localhost:3000/quick-start
```

### Production URLs
```bash
# Main marketing site
https://snapback.dev

# Console (SaaS app)
https://console.snapback.dev/dashboard

# Docs
https://docs.snapback.dev/quick-start
```

### Required Environment Variables (Minimal)
```bash
NEXT_PUBLIC_SITE_URL="https://snapback.dev"
NEXT_PUBLIC_APP_URL="https://console.snapback.dev"
NEXT_PUBLIC_ROOT_DOMAIN="snapback.dev"
DATABASE_URL="postgresql://..."
BETTER_AUTH_SECRET="<32-byte-base64>"
NODE_ENV="production"
```
