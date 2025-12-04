#!/bin/bash
# scripts/validate-env.sh
#
# Validate that all required environment variables are set
# for the current environment (NODE_ENV)
#
# Usage:
#   bash scripts/validate-env.sh
#   NODE_ENV=staging bash scripts/validate-env.sh
#   NODE_ENV=production bash scripts/validate-env.sh

set -e

# Get current environment
ENV_NAME=${NODE_ENV:-development}

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Environment Validation: $ENV_NAME${NC}"
echo -e "${GREEN}========================================${NC}"

# Determine which .env file to check
case "$ENV_NAME" in
  development)
    ENV_FILE=".env.local"
    ;;
  staging)
    ENV_FILE=".env.staging"
    ;;
  production)
    ENV_FILE=".env.production"
    ;;
  *)
    echo -e "${RED}Error: Unknown NODE_ENV: $ENV_NAME${NC}"
    exit 1
    ;;
esac

# Check if env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}✗ Environment file not found: $ENV_FILE${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Found $ENV_FILE${NC}\n"

# Define required variables per environment
declare -a REQUIRED_VARS_ALL=(
  "NODE_ENV"
  "DATABASE_URL"
  "DIRECT_URL"
  "REDIS_URL"
  "BETTER_AUTH_SECRET"
  "BETTER_AUTH_URL"
  "APP_URL"
)

declare -a REQUIRED_VARS_STAGING=(
  "${REQUIRED_VARS_ALL[@]}"
  "GITHUB_CLIENT_ID"
  "GITHUB_CLIENT_SECRET"
  "GOOGLE_CLIENT_ID"
  "GOOGLE_CLIENT_SECRET"
  "RESEND_API_KEY"
  "TURNSTILE_SECRET_KEY"
)

declare -a REQUIRED_VARS_PROD=(
  "${REQUIRED_VARS_STAGING[@]}"
  "STRIPE_SECRET_KEY"
  "SENTRY_DSN"
)

# Select which variables to check
case "$ENV_NAME" in
  development)
    REQUIRED_VARS=("${REQUIRED_VARS_ALL[@]}")
    ;;
  staging)
    REQUIRED_VARS=("${REQUIRED_VARS_STAGING[@]}")
    ;;
  production)
    REQUIRED_VARS=("${REQUIRED_VARS_PROD[@]}")
    ;;
esac

# Load env file
set -a
source "$ENV_FILE"
set +a

# Check required variables
MISSING_VARS=()

echo -e "${YELLOW}Checking required variables...${NC}"

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
    echo -e "${RED}✗ Missing: $var${NC}"
  else
    # Mask sensitive values
    if [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"KEY"* ]] || [[ "$var" == *"PASSWORD"* ]] || [[ "$var" == *"TOKEN"* ]]; then
      echo -e "${GREEN}✓ Set: $var (masked)${NC}"
    else
      echo -e "${GREEN}✓ Set: $var${NC}"
    fi
  fi
done

echo ""

# Summary
if [ ${#MISSING_VARS[@]} -eq 0 ]; then
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}All required variables are set!${NC}"
  echo -e "${GREEN}========================================${NC}"
  exit 0
else
  echo -e "${RED}========================================${NC}"
  echo -e "${RED}Missing ${#MISSING_VARS[@]} variables:${NC}"
  printf '%s\n' "${MISSING_VARS[@]}"
  echo -e "${RED}========================================${NC}"
  exit 1
fi
