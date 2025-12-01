#!/bin/bash

# Cleanup script to remove redundant documentation files
# that have been incorporated into the Fumadocs structure

echo "Starting documentation cleanup..."

# Remove redundant documentation files that have been incorporated into Fumadocs
echo "Removing redundant documentation files..."
rm -f /Users/user1/WebstormProjects/SnapBack-Site/snapback-implementation-guide.md
rm -f /Users/user1/WebstormProjects/SnapBack-Site/snapback-implementation.md
rm -f /Users/user1/WebstormProjects/SnapBack-Site/DASHBOARD_IMPLEMENTATION.md

# These files contain important project information, so we'll keep them
# rm -f /Users/user1/WebstormProjects/SnapBack-Site/PROJECT_STATUS.md
# rm -f /Users/user1/WebstormProjects/SnapBack-Site/TEST_REPORT.md
# rm -f /Users/user1/WebstormProjects/SnapBack-Site/CLAUDE.md
# rm -f /Users/user1/WebstormProjects/SnapBack-Site/DOCKER.md

echo "Documentation cleanup completed!"

echo "The following documentation has been consolidated into Fumadocs:"
echo "- Implementation guides"
echo "- Component documentation"
echo ""
echo "The following files have been kept as they contain important project information:"
echo "- PROJECT_STATUS.md"
echo "- TEST_REPORT.md"
echo "- CLAUDE.md"
echo "- DOCKER.md"