#!/usr/bin/env node

/**
 * Validates OSS builds to ensure no IP leaks
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const FORBIDDEN_PATTERNS = [
  'subscription',
  'tier',
  'stripe',
  'posthog',
  'analytics-infra',
  'dashboard',
  'payment',
  'billing',
  'cohort',
  'correlation',
];

const OSS_DIR = path.join(__dirname, '../dist-oss');

async function validateOssBuilds() {
  console.log('🔍 Validating OSS builds for IP leaks...\n');

  if (!fs.existsSync(OSS_DIR)) {
    console.error('❌ dist-oss/ directory not found');
    console.error('   Run: pnpm build:oss');
    process.exit(1);
  }

  const files = await glob(`${OSS_DIR}/**/*.{js,d.ts,json}`, {
    ignore: ['**/node_modules/**'],
  });

  let leaksFound = false;
  const leaks = [];

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8').toLowerCase();
    const relativePath = path.relative(OSS_DIR, file);

    for (const pattern of FORBIDDEN_PATTERNS) {
      if (content.includes(pattern)) {
        leaksFound = true;
        leaks.push({ file: relativePath, pattern });
      }
    }
  }

  if (leaksFound) {
    console.error('🚨 IP LEAKS DETECTED:\n');
    for (const leak of leaks) {
      console.error(`   ${leak.file}`);
      console.error(`   → Found: "${leak.pattern}"\n`);
    }
    console.error('Please review and remove proprietary content from public/ directories\n');
    process.exit(1);
  }

  console.log('✅ No IP leaks detected in OSS builds');
  console.log(`   Validated ${files.length} files\n`);
}

validateOssBuilds().catch((err) => {
  console.error('❌ Validation failed:', err.message);
  process.exit(1);
});
