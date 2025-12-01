# Development Workflow

## Overview

This monorepo contains multiple packages with different purposes and activation patterns.

## Development Servers

The `pnpm dev` command runs only the packages that provide persistent development servers:

```bash
pnpm dev
```

This command:

-   ✅ Starts **@snapback/web** on http://localhost:3000 (or next available port)
-   ✅ Runs database migrations automatically (`@snapback/database:generate`)
-   ❌ Does NOT start CLI or VSCode extension (they have separate workflows)

### Web Application Structure

The web application (`apps/web`) uses Next.js route groups for organization:

-   **Marketing Routes**: `apps/web/app/(marketing)/` - Public marketing pages
-   **SaaS Routes**: `apps/web/app/(saas)/` - Authenticated dashboard

**Important**: Route groups are organizational only - both run on the **same port** (single Next.js server).

## Package-Specific Workflows

### CLI Development

The CLI tool (`@snapback/cli`) is not a dev server - it's executed on-demand:

```bash
# Run CLI directly
pnpm --filter @snapback/cli run dev

# Or after building
pnpm --filter @snapback/cli run build
snapback [command]
```

### VSCode Extension Development

The VSCode extension (`apps/vscode`) has its own dev workflow:

```bash
# Package and install locally
pnpm --filter snapback-vscode run dev

# Or manual workflow
pnpm --filter snapback-vscode run package-vsix
code --install-extension apps/vscode/snapback-vscode-*.vsix --force
```

### MCP Server Development

The MCP server (`@snapback/mcp-server`) requires dependencies to be built first:

```bash
# Build dependencies
pnpm --filter @snapback/contracts run build
pnpm --filter @snapback/storage run build

# Then run MCP server
pnpm --filter @snapback/mcp-server run dev
```

## Build Command

Build all packages (including CLI and VSCode):

```bash
pnpm build
```

This runs the `build` script across all packages with proper dependency ordering.

## Architecture Decision

### Why Not Include CLI/VSCode in `pnpm dev`?

Following Turborepo best practices:

1. **CLI tools execute and exit** - Not persistent servers, so they cause failed dev processes
2. **IDE extensions require installation** - Cannot "run" like a server
3. **MCP server has build dependencies** - Needs contracts/storage built first
4. **Explicit filtering is clearer** - Makes it obvious which services are running

### Industry Standard Pattern

From Turborepo documentation, the recommended pattern is:

```json
{
	"scripts": {
		"dev": "turbo dev --filter=web --filter=docs"
	}
}
```

We explicitly filter to **only persistent dev servers**, excluding:

-   CLI tools (execute and exit)
-   IDE extensions (installed separately)
-   Build tools (invoked during build)
-   Services with complex dependencies (started manually when needed)

## Troubleshooting

### Port Already in Use

Next.js automatically finds the next available port if 3000 is taken:

```
⚠ Port 3000 is in use, using available port 3001 instead.
```

### Database Not Found

Make sure PostgreSQL is running and `.env.local` has correct `DATABASE_URL`:

```bash
# Check database connection
psql $DATABASE_URL
```

### Type Errors

Run type checking across all packages:

```bash
pnpm turbo type-check
```

## Development Database Seeding

For quick testing without going through signup flow:

```bash
pnpm seed:dev
```

This creates a development user:

-   **Email**: `dev@snapback.dev`
-   **Password**: `password123`

**⚠️ Development Only**: This script will not run in production environments.

### First Time Setup

1. Ensure database is running and migrated: `pnpm --filter @snapback/database run push:dev`
2. Run seed script: `pnpm seed:dev`
3. Start dev server: `pnpm dev`
4. Login at http://localhost:3000/auth/signin

The seed script is idempotent - running it multiple times is safe.

## Summary

-   **Dev workflow**: `pnpm dev` → Starts web app only
-   **Seed database**: `pnpm seed:dev` → Creates dev@snapback.dev user
-   **CLI workflow**: `pnpm --filter @snapback/cli run dev` → Runs CLI
-   **VSCode workflow**: `pnpm --filter snapback-vscode run dev` → Packages and installs
-   **MCP workflow**: Build deps first, then `pnpm --filter @snapback/mcp-server run dev`
-   **Feature flags**: See [Feature Manager](./feature-manager.md) for feature flag documentation
