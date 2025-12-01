#!/bin/bash

# SnapBack Docker - Hosts File Setup Script
# Adds subdomain entries for local development

set -e

echo "🔧 SnapBack Docker - Hosts File Setup"
echo "======================================"
echo ""

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    HOSTS_FILE="/etc/hosts"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    HOSTS_FILE="/etc/hosts"
else
    echo "❌ Unsupported operating system: $OSTYPE"
    exit 1
fi

# Required subdomain entries
SUBDOMAINS=(
    "snapback.dev"
    "console.snapback.dev"
    "docs.snapback.dev"
    "api.snapback.dev"
    "mcp.snapback.dev"
)

echo "📋 Checking hosts file entries..."
echo ""

MISSING_ENTRIES=()
for subdomain in "${SUBDOMAINS[@]}"; do
    if ! grep -q "127.0.0.1.*$subdomain" "$HOSTS_FILE"; then
        MISSING_ENTRIES+=("$subdomain")
        echo "❌ Missing: $subdomain"
    else
        echo "✅ Found: $subdomain"
    fi
done

echo ""

if [ ${#MISSING_ENTRIES[@]} -eq 0 ]; then
    echo "✅ All subdomain entries are already configured!"
    exit 0
fi

echo "⚠️  Found ${#MISSING_ENTRIES[@]} missing entries"
echo ""
echo "The following entries will be added to $HOSTS_FILE:"
echo ""
for subdomain in "${MISSING_ENTRIES[@]}"; do
    echo "  127.0.0.1 $subdomain"
done
echo ""

# Ask for confirmation
read -p "Do you want to add these entries? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled by user"
    exit 1
fi

# Create backup
BACKUP_FILE="$HOSTS_FILE.backup.$(date +%Y%m%d_%H%M%S)"
echo "📦 Creating backup: $BACKUP_FILE"
sudo cp "$HOSTS_FILE" "$BACKUP_FILE"

# Add entries
echo "✏️  Adding entries to $HOSTS_FILE..."
for subdomain in "${MISSING_ENTRIES[@]}"; do
    echo "127.0.0.1 $subdomain" | sudo tee -a "$HOSTS_FILE" > /dev/null
    echo "  ✅ Added: $subdomain"
done

echo ""
echo "✅ Hosts file updated successfully!"
echo ""
echo "📋 Verification:"
echo ""
grep "snapback.dev" "$HOSTS_FILE" | while read -r line; do
    echo "  $line"
done
echo ""
echo "🎉 Setup complete! You can now access:"
echo ""
echo "  🌐 Main Site:    http://snapback.dev"
echo "  📱 Console:      http://console.snapback.dev"
echo "  📚 Docs:         http://docs.snapback.dev"
echo "  🔌 API:          http://api.snapback.dev:8080"
echo "  🤖 MCP Server:   http://mcp.snapback.dev:8081"
echo ""
