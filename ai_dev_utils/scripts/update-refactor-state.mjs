#!/usr/bin/env node

/**
 * Update config refactor state files
 *
 * Usage:
 *   node ai_dev_utils/scripts/update-refactor-state.mjs \
 *     --phase discovery \
 *     --pass SYS_DET \
 *     --findings F_CONFIG_STORE_USAGES \
 *     --file src/activation/phase2.ts \
 *     --line 45
 *
 * Options:
 *   --phase <discovery|migrate|cleanup>  Phase to update
 *   --pass <SYS_*>                       Discovery pass name (for discovery phase)
 *   --findings <F_*>                     Findings key (for discovery phase)
 *   --file <path>                        File path
 *   --line <number>                      Line number
 *   --usage <read|write>                 Usage type
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');
const stateDir = join(rootDir, 'ai_dev_utils/state/config-refactor');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  options[key] = args[i + 1];
}

// Validate required options
if (!options.phase) {
  console.error('❌ --phase is required');
  process.exit(1);
}

// Helper to read JSON file
function readJSON(filename) {
  const filepath = join(stateDir, filename);
  return JSON.parse(readFileSync(filepath, 'utf8'));
}

// Helper to write JSON file
function writeJSON(filename, data) {
  const filepath = join(stateDir, filename);
  writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n');
}

try {
  switch (options.phase) {
    case 'discovery': {
      const state = readJSON('discovery-state.json');

      // Add pass to completed list if provided
      if (options.pass && !state.passes_completed.includes(options.pass)) {
        state.passes_completed.push(options.pass);
        console.log(`✅ Added pass: ${options.pass}`);
      }

      // Add finding if provided
      if (options.findings && options.file && options.line) {
        if (!state.findings[options.findings]) {
          state.findings[options.findings] = [];
        }

        state.findings[options.findings].push({
          file: options.file,
          line: parseInt(options.line, 10),
          usage: options.usage || 'unknown',
          context: options.context || '',
        });

        console.log(`✅ Added finding: ${options.findings} in ${options.file}:${options.line}`);
      }

      writeJSON('discovery-state.json', state);
      console.log('✅ Discovery state updated');
      break;
    }

    case 'migrate': {
      const state = readJSON('migration-state.json');

      // Update opportunity status
      if (options.opportunity && options.status) {
        const op = options.opportunity;

        switch (options.status) {
          case 'in_progress':
            if (!state.opportunities_in_progress.includes(op)) {
              state.opportunities_in_progress.push(op);
            }
            break;
          case 'completed':
            state.opportunities_in_progress = state.opportunities_in_progress.filter(
              (o) => o !== op
            );
            if (!state.opportunities_completed.includes(op)) {
              state.opportunities_completed.push(op);
            }
            break;
          case 'blocked':
            if (options.blocker) {
              state.opportunities_blocked.push({
                id: op,
                blocker: options.blocker,
              });
            }
            break;
        }

        console.log(`✅ Updated opportunity: ${op} → ${options.status}`);
      }

      // Update test coverage
      if (options.component && options.coverage) {
        state.test_coverage[options.component] = parseFloat(options.coverage);
        console.log(
          `✅ Updated test coverage: ${options.component} → ${options.coverage}%`
        );
      }

      // Update validation results
      if (options.validation && options.result) {
        state.validation_results[options.validation] = options.result;
        console.log(
          `✅ Updated validation: ${options.validation} → ${options.result}`
        );
      }

      writeJSON('migration-state.json', state);
      console.log('✅ Migration state updated');
      break;
    }

    case 'cleanup': {
      const state = readJSON('cleanup-queue.json');

      if (options.item && options.status) {
        const item = state.items.find((i) => i.id === options.item);

        if (item) {
          item.status = options.status;

          if (options.status === 'COMPLETE') {
            item.completed_at = new Date().toISOString();
          }

          console.log(`✅ Updated cleanup item: ${options.item} → ${options.status}`);
        } else {
          console.error(`❌ Cleanup item not found: ${options.item}`);
          process.exit(1);
        }
      }

      writeJSON('cleanup-queue.json', state);
      console.log('✅ Cleanup queue updated');
      break;
    }

    default:
      console.error(`❌ Unknown phase: ${options.phase}`);
      console.error('   Valid phases: discovery, migrate, cleanup');
      process.exit(1);
  }

  console.log('\n💡 Tip: Run validation to ensure state consistency:');
  console.log('   node ai_dev_utils/scripts/validate-refactor-state.mjs\n');
} catch (error) {
  console.error(`❌ Error updating state: ${error.message}`);
  process.exit(1);
}
