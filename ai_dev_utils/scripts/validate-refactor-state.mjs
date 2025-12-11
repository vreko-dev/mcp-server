#!/usr/bin/env node

/**
 * Validates config refactor state files against their JSON schemas
 *
 * Usage:
 *   node ai_dev_utils/scripts/validate-refactor-state.mjs
 *
 * Exit codes:
 *   0 - All validations passed
 *   1 - Validation failed
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const stateDir = join(rootDir, 'ai_dev_utils/state/config-refactor');

// Schema and state file mappings
const validations = [
  {
    name: 'Discovery State',
    schemaPath: join(stateDir, 'discovery-state.schema.json'),
    statePath: join(stateDir, 'discovery-state.json'),
  },
  {
    name: 'Migration State',
    schemaPath: join(stateDir, 'migration-state.schema.json'),
    statePath: join(stateDir, 'migration-state.json'),
  },
  {
    name: 'Cleanup Queue',
    schemaPath: join(stateDir, 'cleanup-queue.schema.json'),
    statePath: join(stateDir, 'cleanup-queue.json'),
  },
];

let totalErrors = 0;

console.log('🔍 Validating config refactor state files...\n');

for (const { name, schemaPath, statePath } of validations) {
  // Check if files exist
  if (!existsSync(schemaPath)) {
    console.error(`❌ ${name}: Schema file not found at ${schemaPath}`);
    totalErrors++;
    continue;
  }

  if (!existsSync(statePath)) {
    console.error(`❌ ${name}: State file not found at ${statePath}`);
    totalErrors++;
    continue;
  }

  try {
    // Load schema and state
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    const state = JSON.parse(readFileSync(statePath, 'utf8'));

    // Validate
    const validate = ajv.compile(schema);
    const valid = validate(state);

    if (!valid) {
      console.error(`❌ ${name}: Validation failed`);
      console.error('   Errors:');
      for (const error of validate.errors) {
        console.error(`   - ${error.instancePath || '/'}: ${error.message}`);
        if (error.params) {
          console.error(`     Params: ${JSON.stringify(error.params)}`);
        }
      }
      totalErrors++;
    } else {
      console.log(`✅ ${name}: Valid`);
    }
  } catch (error) {
    console.error(`❌ ${name}: ${error.message}`);
    totalErrors++;
  }
}

console.log('');

// Additional logic validation
try {
  const migrationState = JSON.parse(
    readFileSync(join(stateDir, 'migration-state.json'), 'utf8')
  );

  // Check test coverage thresholds
  if (migrationState.test_coverage) {
    for (const [component, coverage] of Object.entries(migrationState.test_coverage)) {
      if (coverage < 95) {
        console.warn(`⚠️  Test coverage for ${component} is ${coverage}% (target: 95%+)`);
      }
    }
  }

  // Check error rate
  if (migrationState.rollout_status?.error_rate) {
    const errorRate = migrationState.rollout_status.error_rate;
    if (errorRate > 0.001) {
      console.error(`❌ Error rate too high: ${(errorRate * 100).toFixed(2)}% (target: <0.1%)`);
      totalErrors++;
    }
  }

  // Check cooldown period
  if (migrationState.rollout_status?.cooldown_start) {
    const cooldownStart = new Date(migrationState.rollout_status.cooldown_start);
    const daysSince = Math.floor((Date.now() - cooldownStart.getTime()) / (1000 * 60 * 60 * 24));

    if (migrationState.rollout_status.rollout_percentage === 100 && daysSince < 7) {
      console.warn(`⚠️  Cooldown period: ${daysSince} days (7 days recommended before cleanup)`);
    }
  }
} catch (error) {
  // Migration state might not exist yet, that's okay
  if (error.code !== 'ENOENT') {
    console.error(`❌ Logic validation failed: ${error.message}`);
    totalErrors++;
  }
}

// Exit with appropriate code
if (totalErrors > 0) {
  console.error(`\n❌ Validation failed with ${totalErrors} error(s)\n`);
  process.exit(1);
} else {
  console.log('✅ All state validations passed\n');
  process.exit(0);
}
