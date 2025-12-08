#!/bin/bash
# Smoke test for PostHog proxy implementation
# Verifies that PostHog is configured correctly and proxy endpoints work

set -e

echo "🧪 PostHog Proxy Smoke Test"
echo "=============================="
echo ""

# Check if dev server is running
echo "1. Checking if dev server is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Dev server is running"
else
    echo "   ❌ Dev server is NOT running"
    echo "   Please start with: pnpm dev"
    exit 1
fi

echo ""
echo "2. Testing PostHog proxy endpoints..."

# Test static assets endpoint
echo "   Testing /ingest/static/*..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ingest/static/array.js || echo "000")
if [ "$STATUS" -eq 200 ] || [ "$STATUS" -eq 404 ]; then
    echo "   ✅ Static endpoint reachable (${STATUS})"
else
    echo "   ❌ Static endpoint failed (${STATUS})"
fi

# Test decide endpoint
echo "   Testing /ingest/decide..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ingest/decide || echo "000")
if [ "$STATUS" -eq 200 ]; then
    echo "   ✅ Decide endpoint works (${STATUS})"
else
    echo "   ⚠️  Decide endpoint returned ${STATUS} (expected if disabled)"
fi

# Test event capture endpoint
echo "   Testing /ingest/e..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d '{"event":"test","properties":{}}' \
    http://localhost:3000/ingest/e || echo "000")
if [ "$STATUS" -eq 200 ]; then
    echo "   ✅ Event capture endpoint works (${STATUS})"
else
    echo "   ❌ Event capture failed (${STATUS})"
fi

echo ""
echo "3. Checking PostHog configuration..."

# Check if PostHog client uses proxy
if grep -q 'api_host: "/ingest"' apps/web/lib/posthog-client.tsx; then
    echo "   ✅ PostHog client uses proxy endpoint"
else
    echo "   ❌ PostHog client NOT using proxy"
fi

# Check if decide is disabled
if grep -q 'advanced_disable_decide: true' apps/web/lib/posthog-client.tsx; then
    echo "   ✅ Decide endpoint disabled (prevents fetch errors)"
else
    echo "   ⚠️  Decide endpoint enabled (may cause errors)"
fi

echo ""
echo "4. Browser DevTools check..."
echo "   📋 Manual verification needed:"
echo "   1. Open browser DevTools (F12)"
echo "   2. Go to Network tab"
echo "   3. Navigate to http://localhost:3000"
echo "   4. Verify you see /ingest/* requests, NOT posthog.com"
echo "   5. No console errors related to PostHog"

echo ""
echo "✅ Smoke test complete!"
echo ""
echo "If you see any console errors about 'Failed to fetch feature flags',"
echo "that's expected - we disabled feature flags intentionally."
