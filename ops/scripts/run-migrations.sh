#!/bin/sh
set -e

# Database connection parameters from environment
export PGHOST=${POSTGRES_HOST:-postgres}
export PGPORT=${POSTGRES_PORT:-5432}
export PGDATABASE=${POSTGRES_DB:-snapback}
export PGUSER=${POSTGRES_USER:-snapback}
export PGPASSWORD=${POSTGRES_PASSWORD}

echo "🔄 Waiting for PostgreSQL to be ready..."

# Wait for PostgreSQL to be ready (max 30 seconds)
for i in $(seq 1 30); do
  if pg_isready -h $PGHOST -p $PGPORT -U $PGUSER -q; then
    echo "✅ PostgreSQL is ready!"
    break
  fi
  echo "⏳ Waiting for PostgreSQL... ($i/30)"
  sleep 1
done

# Final check
if ! pg_isready -h $PGHOST -p $PGPORT -U $PGUSER -q; then
  echo "❌ PostgreSQL is not ready after 30 seconds"
  exit 1
fi

echo "📦 Running database migrations..."

# Create migrations tracking table if it doesn't exist
psql -v ON_ERROR_STOP=1 <<-EOSQL
  CREATE TABLE IF NOT EXISTS _snapback_migrations (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) UNIQUE NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
  );
EOSQL

# Run migrations in order
MIGRATIONS_DIR="/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "⚠️  Migrations directory not found: $MIGRATIONS_DIR"
  exit 0
fi

cd "$MIGRATIONS_DIR"

# Get list of SQL files, sorted
for migration_file in $(ls -1 *.sql 2>/dev/null | sort); do
  # Check if migration has already been applied
  APPLIED=$(psql -tAc "SELECT COUNT(*) FROM _snapback_migrations WHERE filename = '$migration_file'")

  if [ "$APPLIED" -eq "0" ]; then
    echo "📝 Applying migration: $migration_file"

    # Run the migration
    if psql -v ON_ERROR_STOP=1 -f "$migration_file"; then
      # Record successful migration
      psql -v ON_ERROR_STOP=1 -c "INSERT INTO _snapback_migrations (filename) VALUES ('$migration_file')"
      echo "✅ Successfully applied: $migration_file"
    else
      echo "❌ Failed to apply migration: $migration_file"
      exit 1
    fi
  else
    echo "⏭️  Skipping already applied migration: $migration_file"
  fi
done

echo "✅ All migrations completed successfully!"
