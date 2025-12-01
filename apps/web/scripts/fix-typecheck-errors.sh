#!/bin/bash

echo "Fixing TypeScript errors..."

# 1. Fix confetti color issues
echo "Fixing confetti color issues..."
sed -i '' 's/color: colors\[Math.floor(Math.random() \* colors.length)\],/color: colors[Math.floor(Math.random() \* colors.length)] \?\? "#10B981",/g' apps/web/modules/ui/components/magic/confetti.tsx
sed -i '' 's/color: colors\[Math.floor(Math.random() \* colors.length)\],/color: colors[Math.floor(Math.random() \* colors.length)] \?\? "#10B981",/g' apps/web/modules/ui/components/motion/magic/confetti.tsx

# 2. Fix slugify replacement option
echo "Fixing slugify replacement option..."
sed -i '' 's/replacement: "-"/separator: "-"/g' apps/web/modules/shared/lib/content.ts

echo "Done! Run pnpm type-check to verify"