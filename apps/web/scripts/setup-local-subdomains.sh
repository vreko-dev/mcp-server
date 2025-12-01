#!/bin/bash

# Setup script for local development with subdomains
# This script provides instructions for setting up local subdomain development

echo "=== SnapBack Local Subdomain Development Setup ==="
echo ""

echo "To develop with subdomains locally, you have two options:"
echo ""
echo "Option 1: Edit your /etc/hosts file (macOS/Linux)"
echo "  1. Open /etc/hosts file with sudo privileges:"
echo "     sudo nano /etc/hosts"
echo ""
echo "  2. Add the following lines:"
echo "     127.0.0.1 docs.localhost"
echo "     127.0.0.1 app.localhost"
echo "     127.0.0.1 api.localhost"
echo ""
echo "  3. Save and exit"
echo ""
echo "Option 2: Use a tool like dnsmasq (macOS/Linux)"
echo "  1. Install dnsmasq:"
echo "     brew install dnsmasq (macOS) or apt-get install dnsmasq (Linux)"
echo ""
echo "  2. Configure dnsmasq to resolve *.localhost to 127.0.0.1"
echo ""
echo "After setup, you can access:"
echo "  - Main site: http://localhost:3000"
echo "  - Docs: http://docs.localhost:3000"
echo ""
echo "Note: Make sure to start the Next.js development server with:"
echo "  pnpm dev"
