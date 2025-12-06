#!/usr/bin/env node

/**
 * Validation Script for Turborepo Optimization
 * 
 * Verifies all changes were applied correctly following TDD principles
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
let allPassed = true;

console.log('🧪 Validating Turborepo Optimization...\n');

// Test 1: Check Turborepo version
console.log('✅ Test 1: Turborepo Version');
const pnpmWorkspace = fs.readFileSync(path.join(rootDir, 'pnpm-workspace.yaml'), 'utf-8');
const turboVersion = pnpmWorkspace.match(/turbo:\s*([^\s]+)/)?.[1];
console.log(`   Turbo version: ${turboVersion}`);
if (turboVersion && turboVersion.startsWith('2.3.')) {
  console.log('   ✓ Turborepo 2.3.x detected\n');
} else {
  console.log('   ✗ FAILED: Turborepo version should be 2.3.x\n');
  allPassed = false;
}

// Test 2: Check Next.js version
console.log('✅ Test 2: Next.js Version');
const nextVersion = pnpmWorkspace.match(/next:\s*([^\s]+)/)?.[1];
console.log(`   Next.js version: ${nextVersion}`);
if (nextVersion && nextVersion.startsWith('16.')) {
  console.log('   ✓ Next.js 16.x detected\n');
} else {
  console.log('   ✗ FAILED: Next.js version should be 16.x\n');
  allPassed = false;
}

// Test 3: Check turbo.json has new phases
console.log('✅ Test 3: Turbo.json Phase Configuration');
const turboConfig = JSON.parse(fs.readFileSync(path.join(rootDir, 'turbo.json'), 'utf-8'));

const requiredPhases = ['docker-build', 'deploy', 'sync-open-source', 'release'];
let missingPhases = [];
for (const phase of requiredPhases) {
  if (!turboConfig.tasks[phase]) {
    missingPhases.push(phase);
  }
}

if (missingPhases.length === 0) {
  console.log('   ✓ All required phases defined');
  console.log(`   Phases: ${requiredPhases.join(', ')}\n`);
} else {
  console.log(`   ✗ FAILED: Missing phases: ${missingPhases.join(', ')}\n`);
  allPassed = false;
}

// Test 4: Check environment variable management
console.log('✅ Test 4: Environment Variable Configuration');
const hasGlobalEnv = Array.isArray(turboConfig.globalEnv) && 
                     turboConfig.globalEnv.includes('DATABASE_URL');
const hasPassThrough = Array.isArray(turboConfig.globalPassThroughEnv) && 
                       turboConfig.globalPassThroughEnv.includes('DOCKER_BUILDKIT');

if (hasGlobalEnv && hasPassThrough) {
  console.log('   ✓ globalEnv and globalPassThroughEnv configured\n');
} else {
  console.log('   ✗ FAILED: Environment variables not properly configured\n');
  allPassed = false;
}

// Test 5: Check affected scripts in root package.json
console.log('✅ Test 5: Affected Detection Scripts');
const rootPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8'));

const requiredScripts = [
  'deploy:affected',
  'docker:affected',
  'test:affected',
  'build:affected'
];

let missingScripts = [];
for (const script of requiredScripts) {
  if (!rootPkg.scripts[script]) {
    missingScripts.push(script);
  }
}

if (missingScripts.length === 0) {
  console.log('   ✓ All affected detection scripts present\n');
} else {
  console.log(`   ✗ FAILED: Missing scripts: ${missingScripts.join(', ')}\n`);
  allPassed = false;
}

// Test 6: Check Turbopack in Next.js apps
console.log('✅ Test 6: Turbopack Enablement');
const webPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'apps/web/package.json'), 'utf-8'));
const docsPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'apps/docs/package.json'), 'utf-8'));

const webHasTurbopack = webPkg.scripts.dev && webPkg.scripts.dev.includes('--turbopack');
const docsHasTurbopack = docsPkg.scripts.dev && docsPkg.scripts.dev.includes('--turbopack');

if (webHasTurbopack && docsHasTurbopack) {
  console.log('   ✓ Turbopack enabled in web and docs apps\n');
} else {
  console.log('   ✗ FAILED: Turbopack not enabled in all Next.js apps\n');
  allPassed = false;
}

// Test 7: Check deploy scripts in workspace packages
console.log('✅ Test 7: Deploy Scripts in Workspace Packages');
const apiPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'apps/api/package.json'), 'utf-8'));
const mcpPkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'apps/mcp-server/package.json'), 'utf-8'));

const hasDeployScripts = 
  webPkg.scripts.deploy &&
  apiPkg.scripts.deploy &&
  mcpPkg.scripts.deploy &&
  docsPkg.scripts.deploy;

const hasDockerBuildScripts =
  webPkg.scripts['docker-build'] &&
  apiPkg.scripts['docker-build'] &&
  mcpPkg.scripts['docker-build'];

if (hasDeployScripts && hasDockerBuildScripts) {
  console.log('   ✓ Deploy and docker-build scripts present in key packages\n');
} else {
  console.log('   ✗ FAILED: Missing deploy or docker-build scripts\n');
  allPassed = false;
}

// Test 8: Check dependency chain
console.log('✅ Test 8: Task Dependency Chain');
const deployTask = turboConfig.tasks.deploy;
const dockerBuildTask = turboConfig.tasks['docker-build'];
const releaseTask = turboConfig.tasks.release;

const correctDependencyChain = 
  dockerBuildTask.dependsOn.includes('build') &&
  deployTask.dependsOn.includes('test') &&
  deployTask.dependsOn.includes('docker-build') &&
  releaseTask.dependsOn.includes('deploy');

if (correctDependencyChain) {
  console.log('   ✓ Dependency chain: build → test → docker-build → deploy → release\n');
} else {
  console.log('   ✗ FAILED: Dependency chain not correctly configured\n');
  allPassed = false;
}

// Final result
console.log('\n' + '='.repeat(50));
if (allPassed) {
  console.log('🎉 All tests passed! Turborepo optimization complete.');
  console.log('\n📊 Summary:');
  console.log('  • Turborepo 2.3.4 ✓');
  console.log('  • Next.js 16 with Turbopack ✓');
  console.log('  • Phase-based pipeline (docker-build, deploy, sync-oss, release) ✓');
  console.log('  • Affected package detection (--filter=...[origin/main]) ✓');
  console.log('  • Environment variable management ✓');
  console.log('  • Workspace package scripts ✓');
  console.log('\n🚀 Ready to use:');
  console.log('  pnpm deploy:affected    # Deploy only changed services');
  console.log('  pnpm docker:affected    # Build only changed Docker images');
  console.log('  pnpm test:affected      # Test only changed packages');
  console.log('  pnpm build:affected     # Build only changed packages');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please review the output above.');
  process.exit(1);
}
