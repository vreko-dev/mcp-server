#!/bin/bash
# Try to run tests in packages that have their own test scripts

echo "Attempting selective test runs..."

# Try apps/vscode
echo "Testing apps/vscode..."
cd apps/vscode && pnpm test --reporter=json --outputFile=../../.test-audit-tmp/vscode-tests.json 2>&1 | head -50

# Try packages/core
echo "Testing packages/core..."
cd ../../packages/core && pnpm test --reporter=json --outputFile=../../.test-audit-tmp/core-tests.json 2>&1 | head -50

