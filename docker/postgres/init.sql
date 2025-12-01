-- PostgreSQL initialization script for SnapBack application
-- This script runs automatically when the PostgreSQL container starts for the first time

-- Ensure the database exists (usually created by POSTGRES_DB env var)
-- This is mainly for documentation and explicit confirmation

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create indexes that are commonly needed (Prisma will handle most schema)
-- These are performance optimizations for common query patterns

-- Set timezone to UTC for consistency
SET timezone = 'UTC';

-- Grant necessary permissions to the application user
GRANT ALL PRIVILEGES ON DATABASE snapback TO snapback;
GRANT ALL PRIVILEGES ON DATABASE snapback_dev TO snapback;

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'SnapBack PostgreSQL database initialized successfully';
END
$$;