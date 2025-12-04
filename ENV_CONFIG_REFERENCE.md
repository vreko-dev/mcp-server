# Environment Configuration Reference Card

**Quick lookup for SnapBack environment setup**

---

## Environment Files Cheat Sheet

| Location | File | Purpose | Git Status |
|---|---|---|---|
| Root | `.env.local` | Local development config | Ignored ✓ |
| Root | `.env.staging` | Staging config | Ignored ✓ |
| Root | `.env.production` | Production config | Ignored ✓ |
| Root | `.env.example` | Template (committed) | Tracked ✓ |
| `apps/api` | `.env.local` | API server dev | Ignored ✓ |
| `apps/web` | `.env.local` | Web app dev | Ignored ✓ |
| `apps/cli` | `.env.local` | CLI tool dev | Ignored ✓ |
| `apps/mcp-server` | `.env.local` | MCP server dev | Ignored ✓ |
| `apps/vscode` | `.env.local` | VSCode extension dev | Ignored ✓ |
| `packages/auth` | `.env.local` | Auth package dev | Ignored ✓ |
| `packages/platform` | `.env.local` | Platform package dev | Ignored ✓ |

---

## Quick Commands

### Setup Development Environment
```bash
bash scripts/setup-environments.sh dev
```

### Validate Configuration
```bash
bash scripts/validate-env.sh
NODE_ENV=staging bash scripts/validate-env.sh
NODE_ENV=production bash scripts/validate-env.sh
```

### Run Application
```bash
pnpm dev                              # Uses .env.local
NODE_ENV=staging pnpm build           # Uses .env.staging
NODE_ENV=production npm start         # Uses .env.production
```

### Using dotenv-cli
```bash
dotenv -e .env.local -- pnpm dev
dotenv -e .env.staging -- pnpm build
dotenv -e .env.production -- npm start
```

---

## Essential Variables

### Database
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
DIRECT_URL=postgresql://user:pass@host:5432/db    # For migrations
```

### Authentication
```env
BETTER_AUTH_SECRET=your-32-char-minimum-secret
BETTER_AUTH_URL=http://localhost:3001
APP_URL=http://localhost:3001
```

### Frontend (Next.js)
```env
NEXT_PUBLIC_APP_URL=http://console.localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### OAuth Providers
```env
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret
GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret
```

### Cache & Queue
```env
REDIS_URL=redis://localhost:6379
```

### Email Service
```env
RESEND_API_KEY=re_your_key_here
```

### CAPTCHA
```env
TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key
```

### Payments
```env
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Environment Identification
```env
NODE_ENV=development|staging|production
```

### Logging
```env
LOG_LEVEL=debug|info|warn|error
```

---

## Environment Values by Stage

| Variable | Dev | Staging | Production |
|---|---|---|---|
| `NODE_ENV` | `development` | `staging` | `production` |
| `BETTER_AUTH_URL` | `http://localhost:3001` | `https://api.staging.snapback.dev` | `https://api.snapback.dev` |
| `NEXT_PUBLIC_APP_URL` | `http://console.localhost:3000` | `https://console.staging.snapback.dev` | `https://console.snapback.dev` |
| `DATABASE_URL` | `localhost:5432` | `staging-db.internal` | `prod-db.internal` |
| `REDIS_URL` | `localhost:6379` | `staging-redis.internal` | `prod-redis.internal` |
| `LOG_LEVEL` | `debug` | `info` | `warn` |
| `RATE_LIMIT_ENABLED` | `false` | `true` | `true` |

---

## Get Secrets From

| Secret | Provider | Link |
|---|---|---|
| GitHub OAuth | GitHub | https://github.com/settings/developers |
| Google OAuth | Google Cloud | https://console.cloud.google.com/ |
| Resend API Key | Resend | https://resend.com/api-keys |
| Turnstile Keys | Cloudflare | https://dash.cloudflare.com/ |
| Stripe Keys | Stripe | https://dashboard.stripe.com/apikeys |
| Sentry DSN | Sentry | https://sentry.io/ |
| PostHog Key | PostHog | https://posthog.com/ |

---

## File Structure

```
SnapBack-Site/
├── .env.example               ← Master template (commit this)
├── .env.local                 ← Dev config (git-ignored)
├── .env.staging               ← Staging config (git-ignored)
├── .env.production            ← Prod config (git-ignored, vault-only)
│
├── ENV_CONFIG_SETUP.md        ← Detailed technical guide
├── ENV_QUICKSTART.md          ← Step-by-step setup
├── ENV_SETUP_COMPLETE.md      ← Overview of what was set up
│
├── apps/{api,web,cli,mcp-server,vscode}/
│   ├── .env.example           ← App template (commit this)
│   ├── .env.local             ← Dev config
│   ├── .env.staging           ← Staging config
│   └── .env.production        ← Prod config
│
└── scripts/
    ├── setup-environments.sh   ← One-command setup
    └── validate-env.sh         ← Validation
```

---

## Verification Checklist

### Before Running `pnpm dev`:
- [ ] `.env.local` created in root
- [ ] `.env.local` created in `apps/api`
- [ ] `.env.local` created in `apps/web`
- [ ] `.env.local` created in `packages/auth`
- [ ] `.env.local` created in `packages/platform`
- [ ] `DATABASE_URL` is set correctly
- [ ] `DIRECT_URL` is set correctly
- [ ] `REDIS_URL` is set correctly
- [ ] `BETTER_AUTH_SECRET` is 32+ characters
- [ ] PostgreSQL is running (`psql postgres`)
- [ ] Redis is running (`redis-cli ping`)

### Validation:
```bash
bash scripts/validate-env.sh
```

Expected output:
```
✓ Found .env.local
✓ Set: NODE_ENV
✓ Set: DATABASE_URL
✓ Set: BETTER_AUTH_SECRET (masked)
...
All required variables are set!
```

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `.env.local` not found | Run: `bash scripts/setup-environments.sh dev` |
| `DATABASE_URL` invalid | Check PostgreSQL is running on `localhost:5432` |
| `BETTER_AUTH_SECRET` too short | Generate new: `openssl rand -base64 32` |
| OAuth callback fails | Verify OAuth app redirect URL matches config |
| Cannot connect to Redis | Check Redis is running: `redis-cli ping` |
| Variables not loading | Ensure file is named `.env.local`, not `.env` |
| Permission denied on scripts | Fix: `chmod +x scripts/*.sh` |

---

## Next.js-Specific Notes

### Public Variables (exposed to browser)
```env
NEXT_PUBLIC_API_URL=...
NEXT_PUBLIC_APP_URL=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...  # OK - public key
NEXT_PUBLIC_POSTHOG_KEY=...              # OK - analytics
```

### Secret Variables (server-only)
```env
STRIPE_SECRET_KEY=...           # Server-side only
STRIPE_WEBHOOK_SECRET=...       # Server-side only
RESEND_API_KEY=...              # Server-side only
DATABASE_PASSWORD=...           # Server-side only
```

### Loading Order
1. `.env.{NODE_ENV}` (highest priority)
2. `.env.local`
3. `.env` (lowest priority)

---

## Production Deployment

### Never Do:
```bash
❌ git add .env.production
❌ git add .env.staging
❌ git add .env.local
❌ Copy secrets to local machine
❌ Commit secrets to version control
```

### Always Do:
```bash
✅ Use deployment platform secrets (Vercel, Fly.io, etc.)
✅ Store secrets in vault (Hashicorp, AWS Secrets, etc.)
✅ Rotate secrets regularly
✅ Audit secret access
✅ Use different keys per environment
```

### Deployment Platforms
- **Vercel**: Project Settings → Environment Variables
- **Fly.io**: `flyctl secrets set KEY=value`
- **Docker**: Use `--env-file` or `ENV` in Dockerfile
- **Kubernetes**: Use `Secret` resources in deployment manifests

---

## Security Checklist

- [ ] `.env.local`, `.env.staging`, `.env.production` in `.gitignore`
- [ ] Never share `.env.staging` or `.env.production` files
- [ ] Use different OAuth apps per environment
- [ ] Use different database per environment
- [ ] Rotate `BETTER_AUTH_SECRET` quarterly
- [ ] Rotate API keys quarterly
- [ ] Enable secret scanning in GitHub
- [ ] Use HTTPS for all production URLs
- [ ] Use managed databases (not local) for staging/prod
- [ ] Enable database encryption at rest

---

## Documentation Links

- **Full Guide**: `ENV_CONFIG_SETUP.md`
- **Quick Start**: `ENV_QUICKSTART.md`
- **Setup Summary**: `ENV_SETUP_COMPLETE.md`
- **This Cheat Sheet**: `ENV_CONFIG_REFERENCE.md`

---

**Last Updated**: 2025-12-04
**Applies To**: SnapBack Monorepo (all apps and packages)
**Standards**: Industry-standard environment naming (dev, stage, prod)
