#!/bin/bash

# Commit script for SnapBack backend migration

echo "Staging all changes..."
git add .

echo "Committing changes..."
git commit -m "feat: Migrate to backend API architecture - Remove client-side Guardian, add API clients

- Removed all client-side Guardian code from VSCode extension, MCP server, and CLI
- Created API client services for all platforms
- Updated all components to use backend API endpoints
- Added offline fallback functionality
- Moved all proprietary algorithms server-side
- Created comprehensive documentation for deployment"

echo "Changes committed successfully!"
echo "To push to GitHub: git push origin main"

echo "Deployment files created:"
echo "- DEPLOYMENT_SUMMARY.md"
echo "- GITHUB_DEPLOYMENT_README.md"
echo "- COMMIT_AND_DEPLOY.md"
echo "- commit-changes.sh"