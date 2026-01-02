#!/bin/bash
#
# Local Docker Build & Test Script
#
# Tests the MCP server Docker image locally before deploying to Fly.io.
# This catches issues like missing dependencies, startup errors, etc.
#
# Usage: ./scripts/docker-test.sh [--no-cache] [--shell]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
MONOREPO_ROOT="$(dirname "$(dirname "$APP_DIR")")"

IMAGE_NAME="snapback-mcp-test"
CONTAINER_NAME="snapback-mcp-test-container"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BOLD}${CYAN}🐳 MCP Server Local Docker Test${NC}\n"

# Parse args
NO_CACHE=""
SHELL_MODE=false
for arg in "$@"; do
  case $arg in
    --no-cache)
      NO_CACHE="--no-cache"
      ;;
    --shell)
      SHELL_MODE=true
      ;;
  esac
done

# Cleanup function
cleanup() {
  echo -e "\n${CYAN}Cleaning up...${NC}"
  docker rm -f "$CONTAINER_NAME" 2>/dev/null || true
}
trap cleanup EXIT

# Build the image
echo -e "${CYAN}Building Docker image...${NC}"
cd "$MONOREPO_ROOT"

docker build \
  $NO_CACHE \
  -t "$IMAGE_NAME" \
  -f apps/mcp-server/Dockerfile \
  . 2>&1 | tee /tmp/docker-build.log

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Docker build failed!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Docker build successful${NC}\n"

# Shell mode - just start a shell in the container
if [ "$SHELL_MODE" = true ]; then
  echo -e "${CYAN}Starting shell in container...${NC}"
  docker run -it --rm \
    --name "$CONTAINER_NAME" \
    --entrypoint /bin/sh \
    "$IMAGE_NAME"
  exit 0
fi

# Start the container
echo -e "${CYAN}Starting container...${NC}"
docker run -d \
  --name "$CONTAINER_NAME" \
  -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  -e DATABASE_URL="${DATABASE_URL:-postgresql://test:test@localhost:5432/test}" \
  "$IMAGE_NAME"

# Wait for startup
echo -e "${CYAN}Waiting for server to start...${NC}"
sleep 3

# Check if container is still running
if ! docker ps | grep -q "$CONTAINER_NAME"; then
  echo -e "${RED}❌ Container crashed during startup!${NC}"
  echo -e "\n${YELLOW}Container logs:${NC}"
  docker logs "$CONTAINER_NAME"
  exit 1
fi

# Test health endpoint
echo -e "${CYAN}Testing health endpoint...${NC}"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/health 2>/dev/null || echo -e "\n000")
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n1)
BODY=$(echo "$HEALTH_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Health check passed!${NC}"
  echo -e "${CYAN}Response:${NC}"
  echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
else
  echo -e "${RED}❌ Health check failed (HTTP $HTTP_CODE)${NC}"
  echo -e "\n${YELLOW}Container logs:${NC}"
  docker logs "$CONTAINER_NAME"
  exit 1
fi

# Show container logs
echo -e "\n${CYAN}Container startup logs:${NC}"
docker logs "$CONTAINER_NAME" 2>&1 | head -20

# Summary
echo -e "\n${GREEN}${BOLD}✅ All tests passed!${NC}"
echo -e "${CYAN}The Docker image is ready for deployment.${NC}"
echo -e "\n${YELLOW}Commands:${NC}"
echo -e "  Deploy:     fly deploy . --config apps/mcp-server/fly.toml --dockerfile apps/mcp-server/Dockerfile"
echo -e "  Shell:      ./scripts/docker-test.sh --shell"
echo -e "  View logs:  docker logs $CONTAINER_NAME"
