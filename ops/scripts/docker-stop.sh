#!/bin/bash

# SnapBack Docker - Stop Script
# Gracefully stops all Docker services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.dev.yml}"
ENV_FILE="${ENV_FILE:-.env.docker}"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo -e "${BLUE}🛑 SnapBack Docker - Stopping Services${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Navigate to project directory
cd "$PROJECT_DIR"

# Check if services are running
if ! docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  No running services found${NC}"
    exit 0
fi

# Show what will be stopped
echo -e "${BLUE}📋 Services to stop:${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
echo ""

# Ask for confirmation
read -p "Stop all services? (Y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}❌ Cancelled by user${NC}"
    exit 0
fi

# Stop services
echo -e "${BLUE}🛑 Stopping services...${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down

echo ""
echo -e "${GREEN}✅ All services stopped successfully!${NC}"
echo ""

# Ask if they want to remove volumes
read -p "Remove volumes (database data will be lost)? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Removing volumes...${NC}"
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down -v
    echo -e "${GREEN}✅ Volumes removed${NC}"
else
    echo -e "${BLUE}💾 Volumes preserved${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Cleanup complete!${NC}"
