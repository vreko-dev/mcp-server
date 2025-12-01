#!/bin/bash

# Start only the required services for E2E tests
echo "Starting PostgreSQL service..."
docker-compose --env-file .env.docker -f docker-compose.minimal.yml up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 10

# Check if PostgreSQL is running
echo "Checking PostgreSQL status..."
docker-compose --env-file .env.docker -f docker-compose.minimal.yml ps

# Run a simple test to verify PostgreSQL connectivity
echo "Testing PostgreSQL connectivity..."
docker-compose --env-file .env.docker -f docker-compose.minimal.yml exec -T postgres pg_isready -U snapback

if [ $? -eq 0 ]; then
    echo "PostgreSQL is ready. Running E2E tests..."
    # Run the E2E tests
    pnpm playwright test
else
    echo "PostgreSQL is not ready. Exiting..."
    exit 1
fi

# Stop the services
echo "Stopping services..."
docker-compose --env-file .env.docker -f docker-compose.minimal.yml down
