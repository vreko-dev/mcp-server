#!/bin/bash

# Test Runner - Industry Standard
# Handles server startup, test execution, and cleanup

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧪 SnapBack E2E Test Runner${NC}"
echo "========================================"
echo ""

# Parse arguments
MODE=${1:-"headless"}
FILTER=${2:-""}

# Kill existing servers
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
pkill -f "next dev" 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Clean Next.js cache
echo -e "${YELLOW}🗑️  Clearing cache...${NC}"
rm -rf apps/web/.next

# Start dev server in background
echo -e "${YELLOW}🚀 Starting dev server...${NC}"
cd apps/web
pnpm dev > /dev/null 2>&1 &
SERVER_PID=$!
cd ../..

# Wait for server to be ready
echo -e "${YELLOW}⏳ Waiting for server...${NC}"
for i in {1..30}; do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server ready!${NC}"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${RED}❌ Server failed to start${NC}"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

echo ""

# Run tests based on mode
case $MODE in
  ui)
    echo -e "${GREEN}🖥️  Running in UI mode...${NC}"
    pnpm --filter @snapback/web test:e2e:ui $FILTER
    ;;
  headed)
    echo -e "${GREEN}🖥️  Running in headed mode...${NC}"
    pnpm --filter @snapback/web test:e2e:headed $FILTER
    ;;
  debug)
    echo -e "${GREEN}🐛 Running in debug mode...${NC}"
    pnpm --filter @snapback/web test:e2e:debug $FILTER
    ;;
  auth)
    echo -e "${GREEN}🔐 Running auth tests...${NC}"
    pnpm --filter @snapback/web test:e2e:auth
    ;;
  *)
    echo -e "${GREEN}🏃 Running headless tests...${NC}"
    pnpm --filter @snapback/web test:e2e $FILTER
    ;;
esac

TEST_EXIT_CODE=$?

# Cleanup
echo ""
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
kill $SERVER_PID 2>/dev/null || true

# Show report
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✅ Tests passed!${NC}"
  echo ""
  echo "View HTML report: pnpm --filter @snapback/web test:e2e:report"
else
  echo ""
  echo -e "${RED}❌ Tests failed${NC}"
  echo ""
  echo "View HTML report: pnpm --filter @snapback/web test:e2e:report"
  exit 1
fi
