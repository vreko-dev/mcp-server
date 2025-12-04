#!/bin/bash
# scripts/setup-environments.sh
#
# Initialize environment files for SnapBack monorepo
# Supports: development, staging, production
#
# Usage:
#   bash scripts/setup-environments.sh dev
#   bash scripts/setup-environments.sh staging
#   bash scripts/setup-environments.sh prod

set -e

ENVIRONMENT=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"

# Color output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Normalize environment name
case "$ENVIRONMENT" in
  dev|development|local)
    ENV_NAME="development"
    ENV_FILE=".env.local"
    ;;
  stage|staging)
    ENV_NAME="staging"
    ENV_FILE=".env.staging"
    ;;
  prod|production)
    ENV_NAME="production"
    ENV_FILE=".env.production"
    ;;
  *)
    echo -e "${RED}Error: Unknown environment '$ENVIRONMENT'${NC}"
    echo "Usage: $0 {dev|staging|prod}"
    exit 1
    ;;
esac

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}SnapBack Environment Setup${NC}"
echo -e "${GREEN}Environment: $ENV_NAME${NC}"
echo -e "${GREEN}========================================${NC}"

# Function to setup app environment
setup_app_env() {
  local app_path=$1
  local app_name=$(basename "$app_path")

  if [ ! -f "$app_path/.env.example" ]; then
    echo -e "${YELLOW}⚠ Skipping $app_name: no .env.example found${NC}"
    return
  fi

  if [ "$ENV_NAME" = "development" ] && [ ! -f "$app_path/$ENV_FILE" ]; then
    # For development, create from template
    cp "$app_path/.env.example" "$app_path/$ENV_FILE"
    echo -e "${GREEN}✓ Created $app_path/$ENV_FILE${NC}"
  elif [ "$ENV_NAME" != "development" ]; then
    # For staging/prod, check if file exists
    if [ -f "$app_path/$ENV_FILE" ]; then
      echo -e "${GREEN}✓ Found $app_path/$ENV_FILE${NC}"
    else
      echo -e "${YELLOW}⚠ Missing $app_path/$ENV_FILE (create manually with secure values)${NC}"
    fi
  fi
}

# Function to setup package environment
setup_package_env() {
  local pkg_path=$1
  local pkg_name=$(basename "$pkg_path")

  if [ ! -f "$pkg_path/.env.example" ]; then
    return
  fi

  if [ "$ENV_NAME" = "development" ] && [ ! -f "$pkg_path/$ENV_FILE" ]; then
    cp "$pkg_path/.env.example" "$pkg_path/$ENV_FILE"
    echo -e "${GREEN}✓ Created $pkg_path/$ENV_FILE${NC}"
  elif [ "$ENV_NAME" != "development" ]; then
    if [ -f "$pkg_path/$ENV_FILE" ]; then
      echo -e "${GREEN}✓ Found $pkg_path/$ENV_FILE${NC}"
    else
      echo -e "${YELLOW}⚠ Missing $pkg_path/$ENV_FILE (create manually with secure values)${NC}"
    fi
  fi
}

echo -e "\n${YELLOW}Setting up root environment...${NC}"

# Setup root .env file
if [ "$ENV_NAME" = "development" ] && [ ! -f "$REPO_ROOT/$ENV_FILE" ]; then
  cp "$REPO_ROOT/.env.example" "$REPO_ROOT/$ENV_FILE"
  echo -e "${GREEN}✓ Created $REPO_ROOT/$ENV_FILE${NC}"
elif [ "$ENV_NAME" != "development" ]; then
  if [ -f "$REPO_ROOT/$ENV_FILE" ]; then
    echo -e "${GREEN}✓ Found $REPO_ROOT/$ENV_FILE${NC}"
  else
    echo -e "${YELLOW}⚠ Missing $REPO_ROOT/$ENV_FILE (create manually with secure values)${NC}"
  fi
fi

echo -e "\n${YELLOW}Setting up app environments...${NC}"

# Setup apps
for app_dir in "$REPO_ROOT/apps"/*; do
  if [ -d "$app_dir" ]; then
    setup_app_env "$app_dir"
  fi
done

echo -e "\n${YELLOW}Setting up package environments...${NC}"

# Setup packages
for pkg_dir in "$REPO_ROOT/packages"/*; do
  if [ -d "$pkg_dir" ]; then
    setup_package_env "$pkg_dir"
  fi
done

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Environment Setup Complete${NC}"
echo -e "${GREEN}========================================${NC}"

if [ "$ENV_NAME" = "development" ]; then
  echo -e "\n${YELLOW}Next steps:${NC}"
  echo "1. Review and update .env.local files with your local values"
  echo "2. For OAuth, create apps at GitHub (https://github.com/settings/developers)"
  echo "3. For Email, get Resend API key at https://resend.com/api-keys"
  echo "4. For CAPTCHA, create Turnstile site at https://dash.cloudflare.com/"
  echo ""
  echo "Then run: pnpm dev"
else
  echo -e "\n${YELLOW}Next steps for $ENV_NAME:${NC}"
  echo "1. Populate .$ENV_FILE files with secure values from vault"
  echo "2. Verify all secrets are in place"
  echo "3. Test deployment in staging before production"
fi

echo ""
