#!/bin/bash
# scripts/add-licenses.sh
# Adds LICENSE files to all packages with correct license for public/private

set -e

YEAR=$(date +%Y)

echo "📜 Adding LICENSE files to packages..."
echo ""

# Apache-2.0 License Template (for public packages)
read -r -d '' APACHE_LICENSE << 'EOF' || true
Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright (c) YEAR SnapBack, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
EOF

# Replace YEAR placeholder
APACHE_LICENSE="${APACHE_LICENSE//YEAR/$YEAR}"

# Proprietary License Template (for private packages)
read -r -d '' PROPRIETARY_LICENSE << 'EOF' || true
Proprietary License

Copyright (c) YEAR SnapBack, Inc.
All Rights Reserved.

This software and associated documentation files (the "Software") may not be
used, copied, modified, merged, published, distributed, sublicensed, and/or
sold without express written permission from SnapBack, Inc.

NOTICE: This software contains confidential and proprietary information of
SnapBack, Inc. Any unauthorized use, reproduction, or disclosure of this
software is strictly prohibited and may result in legal action.
EOF

# Replace YEAR placeholder
PROPRIETARY_LICENSE="${PROPRIETARY_LICENSE//YEAR/$YEAR}"

# Public packages that need Apache-2.0
PUBLIC_PACKAGES=(
  "packages/sdk"
  "packages/core"
  "apps/mcp-server"
  "packages/contracts"
)

echo "✅ Adding Apache-2.0 LICENSE to public packages..."
for pkg in "${PUBLIC_PACKAGES[@]}"; do
  if [ -d "$pkg" ]; then
    echo "$APACHE_LICENSE" > "$pkg/LICENSE"
    echo "   ✓ $pkg/LICENSE"

    # Update package.json license field
    if [ -f "$pkg/package.json" ]; then
      # Use Node to update JSON properly
      node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('$pkg/package.json', 'utf8'));
        pkg.license = 'Apache-2.0';
        if (pkg.private) delete pkg.private;
        fs.writeFileSync('$pkg/package.json', JSON.stringify(pkg, null, 2) + '\n');
      "
      echo "   ✓ $pkg/package.json (license: Apache-2.0)"
    fi
  else
    echo "   ⚠️  $pkg does not exist, skipping"
  fi
done

echo ""
echo "✅ Adding Proprietary LICENSE to private packages..."

# Private packages that need UNLICENSED/Proprietary
PRIVATE_PACKAGES=(
  "apps/web"
  "packages/api"
  "packages/auth"
  "packages/logs"
  "packages/database"
  "packages/mail"
  "packages/payments"
  "packages/analytics"
  "packages/storage"
  "packages/telemetry"
)

for pkg in "${PRIVATE_PACKAGES[@]}"; do
  if [ -d "$pkg" ]; then
    echo "$PROPRIETARY_LICENSE" > "$pkg/LICENSE"
    echo "   ✓ $pkg/LICENSE"

    # Update package.json license field
    if [ -f "$pkg/package.json" ]; then
      node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('$pkg/package.json', 'utf8'));
        pkg.license = 'UNLICENSED';
        pkg.private = true;
        fs.writeFileSync('$pkg/package.json', JSON.stringify(pkg, null, 2) + '\n');
      "
      echo "   ✓ $pkg/package.json (license: UNLICENSED, private: true)"
    fi
  else
    echo "   ⚠️  $pkg does not exist, skipping"
  fi
done

echo ""
echo "✅ All LICENSE files added!"
echo ""
echo "📋 Summary:"
echo "   Public packages (Apache-2.0): ${#PUBLIC_PACKAGES[@]}"
echo "   Private packages (UNLICENSED): ${#PRIVATE_PACKAGES[@]}"
echo ""
echo "Next steps:"
echo "   1. Review changes: git diff"
echo "   2. Commit: git add . && git commit -m 'chore: add LICENSE files to all packages'"
echo "   3. Push: git push"
