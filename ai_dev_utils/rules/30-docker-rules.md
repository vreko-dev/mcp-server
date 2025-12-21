---
description: "Docker and infrastructure patterns"
globs:
  - "**/Dockerfile*"
  - "**/docker-compose*.yml"
  - "**/fly*.toml"
  - "config-templates/**"
alwaysApply: false
---

# Docker & Infrastructure Rules

**Applies to:** Dockerfiles, compose files, Fly.io configs

---

## Research-First Workflow

```
1. Web search for current best practices (pnpm, turbo, Docker, Fly.io)
2. Explore codebase for existing patterns
3. Validate all referenced packages/files exist
4. Implement with consistency checks
5. Verify with syntax checks
```

---

## Multi-Stage Build Pattern

```dockerfile
# Stage 1: Dependencies (cacheable)
FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# Stage 2: Builder
FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY packages-oss ./packages-oss
RUN pnpm install --frozen-lockfile
COPY apps/[APP] ./apps/[APP]
RUN pnpm --filter @snapback/[APP] build

# Stage 3: Production
FROM base AS production
COPY --from=builder /app/apps/[APP]/dist ./dist
ENV PORT=8080
CMD ["node", "dist/index.js"]
```

---

## Port Consistency Matrix

| Service | Local Dev | Docker | Fly.io |
|---------|-----------|--------|--------|
| API | 3001 | 8080 | 8080 |
| MCP | 3002 | 8080 | 8080 |
| Web | 3000 | 3000 | 3000 |

**Rule:** Fly.io always uses PORT=8080.

---

## Common Pitfalls

- **Missing packages in Dockerfile:** Verify with `ls packages/X`
- **Port mismatches:** Local ≠ Docker ≠ Fly.io
- **Duplicate Docker files:** Audit before creating
- **Wrong Dockerfile references:** Fly.io configs must point correctly
- **pnpm workspace issues:** Use `--frozen-lockfile` in production

---

## Verification Commands

```bash
# Validate Dockerfile syntax
docker buildx build --check -f apps/[APP]/Dockerfile .

# Validate docker-compose
docker-compose config

# Check Fly.io config
fly config validate
```
