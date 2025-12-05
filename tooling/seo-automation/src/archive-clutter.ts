#!/usr/bin/env tsx
/**
 * Automated File Archival for Clean Publishes
 * 
 * Moves non-essential files to .archive/ before publish:
 * - Development notes
 * - Scratch files
 * - Temporary artifacts
 * - Duplicate/old versions
 * 
 * Organizes by inferred category for easy retrieval
 */

import { glob } from 'glob';
import { statSync, existsSync, mkdirSync, renameSync, readFileSync } from 'node:fs';
import { resolve, dirname, basename, extname, join, relative } from 'node:path';

interface ArchiveRule {
  pattern: string | RegExp;
  category: string;
  description: string;
  test: (filepath: string, content?: string) => boolean;
}

const ARCHIVE_ROOT = '.archive';

/**
 * File categorization rules (inferred from filename/content)
 */
const ARCHIVE_RULES: ArchiveRule[] = [
  // Development notes and scratch files
  {
    pattern: /\.(scratch|notes?|draft|wip|tmp|temp|old|bak|backup)(\.\w+)?$/i,
    category: 'dev-notes',
    description: 'Development scratch files and notes',
    test: (filepath) => /\.(scratch|notes?|draft|wip|tmp|temp|old|bak|backup)(\.\w+)?$/i.test(filepath),
  },
  {
    pattern: /^(scratch|notes?|draft|wip|tmp|temp|TODO|NOTES|IDEAS)[\._-]/i,
    category: 'dev-notes',
    description: 'Development scratch files (prefix pattern)',
    test: (filepath) => /^(scratch|notes?|draft|wip|tmp|temp|TODO|NOTES|IDEAS)[\._-]/i.test(basename(filepath)),
  },
  
  // Review/feedback files
  {
    pattern: /_review\.(md|txt)$/i,
    category: 'reviews',
    description: 'Code review and feedback files',
    test: (filepath) => /_review\.(md|txt)$/i.test(filepath),
  },
  
  // Old/deprecated versions
  {
    pattern: /\.(v\d+|old\d*|deprecated|legacy)(\.\w+)?$/i,
    category: 'deprecated',
    description: 'Old versions and deprecated files',
    test: (filepath) => /\.(v\d+|old\d*|deprecated|legacy)(\.\w+)?$/i.test(filepath),
  },
  {
    pattern: /-(old|deprecated|legacy|backup|copy)(\.\w+)?$/i,
    category: 'deprecated',
    description: 'Old versions (suffix pattern)',
    test: (filepath) => /-(old|deprecated|legacy|backup|copy)(\.\w+)?$/i.test(filepath),
  },
  
  // Test artifacts and fixtures (non-essential)
  {
    pattern: /\.(fixture|mock|stub|sample|example|demo)(\.\w+)?$/i,
    category: 'test-artifacts',
    description: 'Test fixtures and sample data',
    test: (filepath, content) => {
      if (/\.(fixture|mock|stub|sample|example|demo)(\.\w+)?$/i.test(filepath)) {
        // Keep if in tests/ directory (essential)
        if (filepath.includes('/tests/') || filepath.includes('/__tests__/')) {
          return false;
        }
        return true;
      }
      return false;
    },
  },
  
  // Planning and design docs (non-code)
  {
    pattern: /^(PLAN|DESIGN|ARCHITECTURE|ROADMAP|BRAINSTORM|STRATEGY)[\._-]/i,
    category: 'planning',
    description: 'Planning and design documents',
    test: (filepath, content) => {
      const name = basename(filepath);
      if (/^(PLAN|DESIGN|ARCHITECTURE|ROADMAP|BRAINSTORM|STRATEGY)[\._-]/i.test(name)) {
        // Keep if it's referenced in README or package.json
        const parentDir = dirname(filepath);
        const readme = join(parentDir, 'README.md');
        const pkg = join(parentDir, 'package.json');
        
        if (existsSync(readme)) {
          const readmeContent = readFileSync(readme, 'utf-8');
          if (readmeContent.includes(name)) return false;
        }
        if (existsSync(pkg)) {
          const pkgContent = readFileSync(pkg, 'utf-8');
          if (pkgContent.includes(name)) return false;
        }
        
        return true;
      }
      return false;
    },
  },
  
  // Implementation guides (keep if referenced)
  {
    pattern: /implementation[\._-]?guide/i,
    category: 'implementation-guides',
    description: 'Implementation guides and tutorials',
    test: (filepath, content) => {
      if (/implementation[\._-]?guide/i.test(filepath)) {
        // Keep if in docs/ or content/ (published)
        if (filepath.includes('/docs/') || filepath.includes('/content/')) {
          return false;
        }
        return true;
      }
      return false;
    },
  },
  
  // Temporary build artifacts (should be in .gitignore already)
  {
    pattern: /\.(log|cache|swp|swo|DS_Store)$/i,
    category: 'temp-artifacts',
    description: 'Temporary build artifacts',
    test: (filepath) => /\.(log|cache|swp|swo|DS_Store)$/i.test(filepath),
  },
  
  // Duplicate files (same name in different location)
  {
    pattern: /\scopy(\s\d+)?(\.\w+)?$/i,
    category: 'duplicates',
    description: 'Duplicate files (macOS/Windows copies)',
    test: (filepath) => /\scopy(\s\d+)?(\.\w+)?$/i.test(filepath),
  },
];

/**
 * Protected patterns - NEVER archive these
 */
const PROTECTED_PATTERNS = [
  /package\.json$/,
  /tsconfig.*\.json$/,
  /README\.md$/i,
  /LICENSE/i,
  /\.gitignore$/,
  /\.env/,
  /Dockerfile/,
  /Makefile/,
  /\.github\//,
  /node_modules\//,
  /dist\//,
  /\.next\//,
  /\.turbo\//,
  /\.git\//,
  /\.archive\//,
];

function isProtected(filepath: string): boolean {
  return PROTECTED_PATTERNS.some(pattern => pattern.test(filepath));
}

function categorizeFile(filepath: string): { category: string; rule: ArchiveRule } | null {
  if (isProtected(filepath)) {
    return null;
  }
  
  // Read file content for content-based rules
  let content: string | undefined;
  try {
    const stats = statSync(filepath);
    if (stats.isFile() && stats.size < 1024 * 1024) { // Only read files < 1MB
      content = readFileSync(filepath, 'utf-8');
    }
  } catch {
    // Ignore read errors
  }
  
  for (const rule of ARCHIVE_RULES) {
    if (rule.test(filepath, content)) {
      return { category: rule.category, rule };
    }
  }
  
  return null;
}

interface ArchiveResult {
  archived: Array<{ from: string; to: string; category: string }>;
  skipped: Array<{ file: string; reason: string }>;
  errors: Array<{ file: string; error: string }>;
}

async function archiveFiles(dryRun = false): Promise<ArchiveResult> {
  const rootDir = resolve(process.cwd(), '../..');
  const archiveRoot = join(rootDir, ARCHIVE_ROOT);
  
  const result: ArchiveResult = {
    archived: [],
    skipped: [],
    errors: [],
  };
  
  // Find all potential files (exclude obvious directories)
  const patterns = [
    '**/*.{md,txt,json,yml,yaml,ts,tsx,js,jsx}',
    '!**/node_modules/**',
    '!**/.next/**',
    '!**/.turbo/**',
    '!**/dist/**',
    '!**/.git/**',
    '!**/.archive/**',
  ];
  
  const files = await glob(patterns, {
    cwd: rootDir,
    absolute: true,
    nodir: true,
  });
  
  console.log(`🔍 Scanning ${files.length} files for archival...\n`);
  
  for (const file of files) {
    const relativePath = relative(rootDir, file);
    
    try {
      const categorization = categorizeFile(file);
      
      if (!categorization) {
        continue; // Protected or not matching any rule
      }
      
      const { category, rule } = categorization;
      
      // Create archive directory structure
      const categoryDir = join(archiveRoot, category);
      const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const archiveDir = join(categoryDir, timestamp);
      
      // Preserve relative path structure within category
      const fileRelativeDir = dirname(relativePath);
      const archivePath = join(archiveDir, fileRelativeDir, basename(file));
      
      if (!dryRun) {
        // Create directory structure
        mkdirSync(dirname(archivePath), { recursive: true });
        
        // Move file
        renameSync(file, archivePath);
      }
      
      result.archived.push({
        from: relativePath,
        to: relative(rootDir, archivePath),
        category,
      });
      
      console.log(`📦 ${category}: ${relativePath}`);
      console.log(`   → ${relative(rootDir, archivePath)}`);
      
    } catch (error) {
      result.errors.push({
        file: relativePath,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error(`❌ Error archiving ${relativePath}:`, error);
    }
  }
  
  return result;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  
  console.log('🗂️  Starting Automated File Archival...');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no files moved)' : 'LIVE (files will be moved)'}\n`);
  
  const result = await archiveFiles(isDryRun);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Archival Summary\n');
  
  // Group by category
  const byCategory = result.archived.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof result.archived>);
  
  console.log('Files archived by category:');
  for (const [category, files] of Object.entries(byCategory)) {
    const rule = ARCHIVE_RULES.find(r => r.category === category);
    console.log(`\n  ${category} (${files.length} files)`);
    console.log(`  ${rule?.description || 'No description'}`);
    
    if (files.length <= 5) {
      for (const file of files) {
        console.log(`    - ${file.from}`);
      }
    } else {
      for (const file of files.slice(0, 3)) {
        console.log(`    - ${file.from}`);
      }
      console.log(`    ... and ${files.length - 3} more`);
    }
  }
  
  console.log(`\n✅ Total archived: ${result.archived.length}`);
  console.log(`⚠️  Errors: ${result.errors.length}`);
  
  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of result.errors) {
      console.log(`  - ${error.file}: ${error.error}`);
    }
  }
  
  if (isDryRun) {
    console.log('\n🔍 DRY RUN: No files were actually moved.');
    console.log('   Run without --dry-run to archive files.');
  } else {
    console.log(`\n📂 Archived files location: ${ARCHIVE_ROOT}/`);
    console.log('   (Add to .gitignore to prevent commits)');
  }
  
  if (result.archived.length > 0 && !isDryRun) {
    console.log('\n💡 To restore a file:');
    console.log(`   mv ${ARCHIVE_ROOT}/[category]/[date]/[path] [original-path]`);
  }
}

main().catch(console.error);
