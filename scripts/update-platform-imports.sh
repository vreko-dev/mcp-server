#!/bin/bash

# Update imports from @snapback/database to @snapback/platform/db
echo "Updating @snapback/database imports..."
find . -path "./node_modules" -prune -o -path "./.snapback" -prune -o -name "*.ts" -o -name "*.tsx" | xargs grep -l "@snapback/database" | xargs sed -i '' \
  -e "s/@snapback\/database/@snapback\/platform\/db/g"

# Update imports from @snapback/supabase to @snapback/platform/client
echo "Updating @snapback/supabase imports..."
find . -path "./node_modules" -prune -o -path "./.snapback" -prune -o -name "*.ts" -o -name "*.tsx" | xargs grep -l "@snapback/supabase" | xargs sed -i '' \
  -e "s/@snapback\/supabase/@snapback\/platform\/client/g"

echo "Import updates complete!"