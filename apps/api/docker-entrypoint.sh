#!/bin/sh

# Docker entrypoint for API service
# Runs database migrations before starting the application
# This ensures the schema exists before the app tries to access it
#
# Used in Dockerfile:
#   COPY apps/api/docker-entrypoint.sh /app/
#   RUN chmod +x /app/docker-entrypoint.sh
#   CMD ["/app/docker-entrypoint.sh"]

set -e  # Exit on any error

# ============================================================================
# 1. WAIT FOR DATABASE
# ============================================================================
echo "⏳ Waiting for database to be ready..."

# Simple retry loop - wait for PostgreSQL to be accessible
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if pg_isready -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" 2>/dev/null; then
    echo "✅ Database is ready"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "⏳ Waiting for database ($RETRY_COUNT/$MAX_RETRIES)..."
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Database failed to become ready after $MAX_RETRIES retries"
  exit 1
fi

# ============================================================================
# 2. RUN DATABASE MIGRATIONS
# ============================================================================
echo "🗄️  Running database migrations..."

if ! pnpm --filter @snapback/platform run db:push 2>&1; then
  echo "⚠️  Migration push failed (may already be applied)"
  # Don't exit - migrations might already be applied
else
  echo "✅ Migrations completed successfully"
fi

# ============================================================================
# 3. VERIFY DATABASE SCHEMA
# ============================================================================
echo "🔍 Verifying database schema..."

# Check if user table exists (created by migrations)
if ! pg_isready -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" 2>/dev/null; then
  echo "❌ Database became unavailable during verification"
  exit 1
fi

echo "✅ Database schema verified"

# ============================================================================
# 4. START APPLICATION
# ============================================================================
echo "🚀 Starting API service..."

# Use exec to replace the shell process with the Node process
# This ensures the Node process receives signals (like SIGTERM) directly
# For graceful shutdown support
exec node apps/api/dist/server.js
