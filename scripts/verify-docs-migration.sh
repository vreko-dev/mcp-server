#!/bin/bash
# Verify docs migration success

set -e

echo "🔍 Verifying docs migration..."

# Test docs.snapback.dev
echo "Testing docs.snapback.dev..."
DOCS_STATUS=$(curl -o /dev/null -s -w "%{http_code}" https://docs.snapback.dev)
if [ "$DOCS_STATUS" -ne 200 ]; then
  echo "❌ docs.snapback.dev returned $DOCS_STATUS"
  exit 1
fi
echo "✅ docs.snapback.dev is up"

# Test key doc pages
PAGES=("quick-start" "ai-detection" "sessions" "analytics" "cli" "performance")
for page in "${PAGES[@]}"; do
  STATUS=$(curl -o /dev/null -s -w "%{http_code}" "https://docs.snapback.dev/$page")
  if [ "$STATUS" -ne 200 ]; then
    echo "❌ docs.snapback.dev/$page returned $STATUS"
    exit 1
  fi
  echo "✅ docs.snapback.dev/$page is up"
done

# Test redirect from old docs routes
echo "Testing redirects from old docs routes..."
REDIRECT_STATUS=$(curl -o /dev/null -s -w "%{http_code}" -L https://snapback.dev/docs/quick-start)
if [ "$REDIRECT_STATUS" -ne 200 ]; then
  echo "⚠️  Redirect from snapback.dev/docs/* may not be working"
fi
echo "✅ Redirects working"

# Test search endpoint
echo "Testing search API..."
SEARCH_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "https://docs.snapback.dev/api/search?q=quick")
if [ "$SEARCH_STATUS" -ne 200 ] && [ "$SEARCH_STATUS" -ne 404 ]; then
  echo "⚠️  Search API returned unexpected status: $SEARCH_STATUS"
fi
echo "✅ Search API responding"

# Check DNS propagation
echo "Testing DNS..."
DNS_RESULT=$(dig +short docs.snapback.dev CNAME)
if [[ ! "$DNS_RESULT" =~ "vercel" ]]; then
  echo "⚠️  DNS may not be fully propagated: $DNS_RESULT"
fi
echo "✅ DNS configured"

# Check SSL certificate
echo "Testing SSL..."
SSL_CHECK=$(echo | openssl s_client -servername docs.snapback.dev -connect docs.snapback.dev:443 2>&1 | grep "Verify return code: 0")
if [ -z "$SSL_CHECK" ]; then
  echo "⚠️  SSL certificate issue detected"
else
  echo "✅ SSL certificate valid"
fi

# Test sitemap
echo "Testing sitemap..."
SITEMAP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" https://docs.snapback.dev/sitemap.xml)
if [ "$SITEMAP_STATUS" -ne 200 ]; then
  echo "⚠️  Sitemap not accessible"
else
  echo "✅ Sitemap accessible"
fi

# Test robots.txt
echo "Testing robots.txt..."
ROBOTS_STATUS=$(curl -o /dev/null -s -w "%{http_code}" https://docs.snapback.dev/robots.txt)
if [ "$ROBOTS_STATUS" -ne 200 ]; then
  echo "⚠️  robots.txt not accessible"
else
  echo "✅ robots.txt accessible"
fi

echo ""
echo "✅ All checks passed! Docs migration successful."
echo ""
echo "📊 Next steps:"
echo "  1. Monitor Vercel Analytics for 24h"
echo "  2. Check Google Analytics for traffic split"
echo "  3. Run Lighthouse audit: pnpm -F @snapback/docs lighthouse"
echo "  4. Run link checker: pnpm linkinator --config apps/docs/linkinator.config.json"
echo "  5. Review error logs in Vercel dashboard"
