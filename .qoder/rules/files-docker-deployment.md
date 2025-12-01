# Docker Deployment Configuration Patterns

**Applies to:** `Dockerfile`, `docker-compose.yml`, `.env.docker*`, `apps/**/*Dockerfile`, `apps/**/docker-entrypoint.sh`
**Authority:** Deployment architecture standard
**Enforcement:** Critical - deployment failures without compliance

---

## 1. Dockerfile Package Reference Accuracy

### Pattern: Correct Filter Names in Multi-Package Monorepo

```dockerfile
# ✅ CORRECT - Use actual package name from package.json
RUN pnpm --filter @snapback/platform run db:generate

# ❌ WRONG - Package alias that doesn't exist
RUN pnpm --filter database run generate
```

**Verified Real Case:**
- **File:** `/apps/web/Dockerfile` (root Dockerfile line 74)
- **Issue:** Referenced non-existent "database" package
- **Actual Package:** `@snapback/platform` with scripts: `db:generate`, `db:migrate`, `db:push`
- **Impact:** Build fails silently during Docker build or silently skips

**How to find correct name:**
```bash
# Option 1: Check packages/ directory
ls packages/*/package.json | xargs grep -l '"name"'

# Option 2: Check turbo.json inter_dependencies
cat turbo.json | grep -A5 "inter_dependencies"
```

**Rule:**
- Every `pnpm --filter <name>` in Dockerfile MUST match a `"name"` field in some `package.json`
- Prefer `@snapback/*` namespace patterns for workspace packages
- Validate by running: `pnpm list --depth=-1`

---

## 2. Script Name Matching in Dockerfile

### Pattern: RUN and CMD Must Match package.json Scripts

```json
{
  "scripts": {
    "build": "tsup --clean",
    "start": "node dist/index.js"
  }
}
```

```dockerfile
# ✅ CORRECT - Exact script names
RUN pnpm run build
CMD ["pnpm", "start"]

# ❌ WRONG - Non-existent variants
RUN pnpm run build:mcp        # Script 'build:mcp' doesn't exist
CMD ["pnpm", "start:mcp"]     # Script 'start:mcp' doesn't exist

# ❌ WRONG - Missing 'run' keyword for custom scripts
RUN pnpm build                # Will try to execute build command, not run script
```

**Verified Real Cases:**
- **File:** `/apps/mcp-server/Dockerfile` lines 25, 48
  - `RUN pnpm run build:mcp` → Should be `pnpm run build` (line 61 in package.json)
  - `CMD ["pnpm", "start:mcp"]` → Should be `pnpm start` (line 64 in package.json)
- **File:** `/Dockerfile` (root web Dockerfile)
  - Line 74: `RUN pnpm --filter database run generate` → Should be `pnpm --filter @snapback/platform run db:generate`

**Anti-Pattern - Derived/Inferred Script Names:**
Don't assume script variants exist:
```dockerfile
# ❌ BAD - Assuming a :dev variant exists
RUN pnpm run build:dev

# ✅ GOOD - Check package.json first
# If only "build" exists, use that
RUN pnpm run build
# Or use conditional if variants needed:
RUN sh -c 'if [ "$NODE_ENV" = "production" ]; then pnpm run build; else pnpm run build:dev; fi'
```

**Validation Strategy:**
```bash
# Extract all script names from target package.json
PACKAGE_DIR="apps/mcp-server"
grep -A20 '"scripts"' "$PACKAGE_DIR/package.json" | grep '"' | awk -F'"' '{print $2}' | head -20

# Validate Dockerfile uses only these scripts
grep "pnpm run\|pnpm.*build\|pnpm.*start" "$PACKAGE_DIR/Dockerfile"
```

---

## 3. Database Migration Execution in Docker

### Pattern: Migrations Must Run Before App Startup

```dockerfile
# ❌ WRONG - No migration execution
FROM base AS builder
RUN pnpm build --filter @snapback/api-service
# App starts without schema - OAuth fails, user tables missing

FROM base AS runner
RUN chown -R nodejs:nodejs /app
CMD ["node", "apps/api/dist/server.js"]  # Will fail on first DB access
```

```dockerfile
# ✅ CORRECT - Migrations run before app
FROM base AS builder
RUN pnpm build --filter @snapback/api-service

# Generate Drizzle schema files
RUN pnpm --filter @snapback/platform run db:generate

# Prepare migration runner
COPY packages/platform/drizzle ./drizzle
COPY packages/platform/drizzle.config.ts ./

FROM base AS runner
# Copy migration files
COPY --from=builder /app/drizzle ./drizzle

# Entrypoint script runs migrations first
COPY apps/api/docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh
CMD ["/app/docker-entrypoint.sh"]
```

**Entrypoint Script Pattern:**
```bash
#!/bin/sh
set -e

echo "Running database migrations..."
pnpm --filter @snapback/platform run db:push

echo "Starting application..."
exec node apps/api/dist/server.js
```

**Verified Real Case:**
- **Location:** SnapBack uses Drizzle ORM (not Prisma)
- **Migration Files:** `packages/platform/drizzle/migrations/*.sql`
- **Issue:** No Dockerfile runs `db:migrate` or `db:push`
- **Result:** OAuth fails because better-auth tables don't exist (0003_auth.sql never executed)

**Critical Migrations:**
```
0001_wild_psynapse.sql (34.8KB - main schema)
0003_auth.sql (better-auth tables: user, session, account)
0005_auth_security_rls_audit.sql (auth RLS policies)
```

---

## 4. Environment Variable Configuration

### Pattern: .env.docker Must Exist and Be Complete

**Required File Structure:**
```bash
# File: .env.docker
# This file is loaded by: docker-compose --env-file .env.docker up

# Database (CRITICAL - without these, migrations fail)
DATABASE_URL=postgresql://snapback:PASSWORD@postgres:5432/snapback
POSTGRES_USER=snapback
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD
POSTGRES_DB=snapback

# Auth URLs (CRITICAL - OAuth callback routing)
# NEXT_PUBLIC_SITE_URL: Used by getBaseUrl() for browser-facing OAuth callbacks
# Must be the PUBLIC URL that browsers can access
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# BETTER_AUTH_URL: Used by services for internal auth server communication
# Must be the INTERNAL service URL within Docker network
BETTER_AUTH_URL=http://api:3001

# Auth Secret (generate with: openssl rand -base64 32)
BETTER_AUTH_SECRET=YOUR_32_CHAR_SECRET_HERE

# OAuth Credentials (must come from provider configuration)
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_ID=YOUR_GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET=YOUR_GITHUB_CLIENT_SECRET

# Node Environment
NODE_ENV=production
```

**Common Mistakes:**
```bash
# ❌ WRONG - Using internal service name for browser callbacks
NEXT_PUBLIC_SITE_URL=http://api:3001  # Browsers can't resolve "api" (Docker service name)

# ✅ CORRECT - Using localhost or public domain
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Development
NEXT_PUBLIC_SITE_URL=https://snapback.dev   # Production

# ❌ WRONG - Missing entirely (getBaseUrl() falls back to http://localhost:3000)
# This works accidentally in development but breaks production

# ✅ CORRECT - Explicitly set for explicit control
NEXT_PUBLIC_SITE_URL=${DEPLOY_URL}  # From CI/CD environment
```

**Validation in docker-compose.yml:**
```yaml
# ✅ CORRECT - Load from .env.docker
services:
  api:
    environment:
      NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL}
      BETTER_AUTH_URL: ${BETTER_AUTH_URL}
      # ... other vars

# Startup command
# docker-compose --env-file .env.docker up
```

---

## 5. Multi-Container Port Configuration

### Pattern: Service Port Exposure Must Not Conflict

```yaml
# ❌ WRONG - Port collision
services:
  web:
    ports:
      - "3000:3000"
  mcp-server:
    ports:
      - "3000:3000"  # Conflicts with web!
```

```yaml
# ✅ CORRECT - Unique host ports
services:
  web:
    ports:
      - "3000:3000"
    expose:
      - "3000"

  mcp-server:
    ports:
      - "3002:3002"  # Different from web
    expose:
      - "3002"

  api:
    ports:
      - "3001:3001"
    expose:
      - "3001"
```

**Internal Network Communication (docker-compose):**
```yaml
services:
  web:
    environment:
      # Internal network uses service name
      NEXT_PUBLIC_API_URL: http://api:3001  # ✅ Correct
      # Not: http://localhost:3001          # ❌ Wrong (localhost from inside web container means the web container itself)
```

**Verified Real Case:**
- **File:** `/apps/mcp-server/Dockerfile` line 45: `EXPOSE 3000`
- **Conflict:** Web app also on 3000
- **Fix:** Change MCP to 3002

---

## 6. Health Check Configuration

### Pattern: Health Checks Should Verify Dependencies

```dockerfile
# ❌ INCOMPLETE - Only checks if port is open
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/api/health

# ✅ BETTER - Health endpoint checks database
RUN echo 'import { db } from "@snapback/platform"; \
const result = await db.execute("SELECT 1 FROM \"user\" LIMIT 1"); \
process.exit(result ? 0 : 1);' > /app/healthcheck.mjs
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
    CMD node /app/healthcheck.mjs
```

**docker-compose Health Check:**
```yaml
# ❌ INCOMPLETE - Only checks process, not schema
services:
  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U snapback"]

# ✅ BETTER - Verifies migrations ran
services:
  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U snapback && psql -U snapback -d snapback -c 'SELECT 1 FROM \"user\" LIMIT 1;'"]
```

---

## 7. Docker Compose Service Dependencies

### Pattern: Services Must List Database and Migration Dependencies

```yaml
# ❌ WRONG - API starts immediately after Postgres is healthy
services:
  api:
    depends_on:
      postgres:
        condition: service_healthy
    # No wait for migrations!

# ✅ CORRECT - Use init container or entrypoint
version: '3.8'
services:
  # Option A: Init container approach
  migrations:
    build:
      context: .
      dockerfile: apps/api/Dockerfile.migrations
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: ${DATABASE_URL}
    entrypoint: sh -c 'pnpm --filter @snapback/platform run db:push'

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    depends_on:
      migrations:
        condition: service_completed_successfully  # Wait for migrations!
      postgres:
        condition: service_healthy

  # Option B: Entrypoint script approach (simpler)
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
    entrypoint: /app/docker-entrypoint.sh  # Runs migrations before starting app
```

**Verified Real Case:**
- **File:** `/docker-compose.yml`
- **Services:** postgres, redis, api, web (MISSING: mcp-server service definition)
- **Issue:** MCP service not defined in compose file even though Dockerfile exists

---

## 8. Build Stage Script Execution Order

### Pattern: Generation Before Build, Migrations Before Runtime

```dockerfile
# Stage: Dependencies
FROM base AS deps
RUN pnpm install --frozen-lockfile

# Stage: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# CRITICAL: Generate all schema files before building
RUN pnpm --filter @snapback/platform run db:generate
RUN pnpm --filter @snapback/contracts run generate  # Type generation

# NOW build the application
RUN pnpm build --filter @snapback/api-service

# Stage: Runner
FROM base AS runner
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# At runtime, run migrations (will use generated schema)
CMD ["/app/docker-entrypoint.sh"]  # This script runs db:push
```

**Correct Order:**
1. Install dependencies
2. Generate schema files (db:generate, type generation)
3. Build applications
4. At runtime: Run migrations (db:push uses generated schema)

**Anti-Pattern:**
```dockerfile
# ❌ WRONG - Building before schema generation
RUN pnpm build --filter @snapback/api-service
RUN pnpm --filter @snapback/platform run db:generate  # Too late!
```

---

## Best Practices Summary

1. **Script Validation:** Every `pnpm run <name>` must exist in target `package.json`
2. **Package Names:** Use full `@snapback/*` names, never aliases
3. **Migration Execution:** Always run migrations before app startup (use entrypoint script)
4. **Environment Files:** `.env.docker` must be complete with all required vars
5. **OAuth URLs:** Distinguish between `NEXT_PUBLIC_SITE_URL` (browser) and `BETTER_AUTH_URL` (internal)
6. **Port Conflicts:** Each service gets unique host port (3000, 3001, 3002, ...)
7. **Health Checks:** Verify dependencies work (database connectivity, schema exists)
8. **Service Discovery:** Use internal service names only within Docker network
9. **Build Order:** Generate → Build → Run

---

## Troubleshooting Checklist

- [ ] All `pnpm --filter <name>` references exist in workspace
- [ ] All script names in `RUN`/`CMD` exist in target package.json
- [ ] `.env.docker` file exists and contains all required variables
- [ ] Database migrations run before app startup (via entrypoint or init container)
- [ ] No port conflicts between services in docker-compose.yml
- [ ] `NEXT_PUBLIC_SITE_URL` is set to publicly-accessible URL (not internal service names)
- [ ] OAuth provider (Google, GitHub) has redirect URIs matching `NEXT_PUBLIC_SITE_URL`
- [ ] `depends_on` in docker-compose includes service_healthy or service_completed_successfully conditions
- [ ] Health checks verify actual dependencies work, not just port availability

---

## References

- **SnapBack Dockerfile (Web):** `Dockerfile` (root)
- **SnapBack API Dockerfile:** `apps/api/Dockerfile`
- **SnapBack MCP Dockerfile:** `apps/mcp-server/Dockerfile`
- **Docker Compose:** `docker-compose.yml`
- **Platform/Database Package:** `packages/platform/package.json` (Drizzle ORM)
- **Authentication:** `packages/auth/src/auth.ts` (better-auth)
- **Environment Config:** `packages/config/src/env.ts`

**Last Updated:** 2025-11-19
**Created to prevent:** OAuth failures, build script failures, schema initialization issues, port conflicts
