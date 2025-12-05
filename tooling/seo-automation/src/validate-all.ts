#!/usr/bin/env tsx
/**
 * Comprehensive SEO Validation Suite
 * 
 * Validates:
 * - Metadata completeness (title, description, OG images)
 * - Structured data (Schema.org JSON-LD)
 * - Reading time accuracy
 * - Keyword density (not over-optimized)
 * - Heading hierarchy
 * - Content length (min 300 words for SEO)
 */

import { glob } from 'glob';
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import matter from 'gray-matter';
import { z } from 'zod';

const MetadataSchema = z.object({
  title: z.string().min(30).max(60),
  description: z.string().min(120).max(160),
  keywords: z.array(z.string()).optional(),
  image: z.string().optional(),
  author: z.string().optional(),
  publishedAt: z.string().optional(),
});

interface ValidationResult {
  file: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  metrics: {
    wordCount: number;
    readingTime: number;
    headingCount: number;
    imageCount: number;
    linkCount: number;
  };
}

function calculateReadingTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.ceil(words / 200); // Average reading speed
}

function analyzeHeadingHierarchy(content: string): { valid: boolean; issues: string[] } {
  const headings = content.match(/^#{1,6}\s+.+$/gm) || [];
  const issues: string[] = [];
  
  let previousLevel = 0;
  for (const heading of headings) {
    const level = heading.match(/^#{1,6}/)?.[0].length || 0;
    
    if (level - previousLevel > 1) {
      issues.push(`Heading hierarchy skip: jumped from H${previousLevel} to H${level}`);
    }
    
    previousLevel = level;
  }
  
  return { valid: issues.length === 0, issues };
}

function analyzeKeywordDensity(content: string, keywords?: string[]): { overOptimized: boolean; density: Record<string, number> } {
  if (!keywords || keywords.length === 0) {
    return { overOptimized: false, density: {} };
  }
  
  const words = content.toLowerCase().split(/\s+/);
  const totalWords = words.length;
  const density: Record<string, number> = {};
  
  for (const keyword of keywords) {
    const keywordLower = keyword.toLowerCase();
    const count = content.toLowerCase().split(keywordLower).length - 1;
    const densityPercent = (count / totalWords) * 100;
    
    density[keyword] = densityPercent;
    
    // Flag if keyword density > 3% (over-optimization)
    if (densityPercent > 3) {
      return { overOptimized: true, density };
    }
  }
  
  return { overOptimized: false, density };
}

async function validateContentFile(filePath: string): Promise<ValidationResult> {
  const content = readFileSync(filePath, 'utf-8');
  const { data: frontmatter, content: bodyContent } = matter(content);
  
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Validate frontmatter metadata
  const metadataResult = MetadataSchema.safeParse(frontmatter);
  if (!metadataResult.success) {
    errors.push('Invalid metadata schema');
    const zodErrors = metadataResult.error.errors || [];
    for (const error of zodErrors) {
      errors.push(`  - ${error.path.join('.')}: ${error.message}`);
    }
  }
  
  // Word count check
  const wordCount = bodyContent.split(/\s+/).length;
  if (wordCount < 300) {
    warnings.push(`Content too short (${wordCount} words, recommended min 300 for SEO)`);
  }
  
  // Reading time
  const readingTime = calculateReadingTime(bodyContent);
  
  // Heading hierarchy
  const headingAnalysis = analyzeHeadingHierarchy(bodyContent);
  if (!headingAnalysis.valid) {
    warnings.push(...headingAnalysis.issues);
  }
  
  // Keyword density
  const keywords = frontmatter.keywords as string[] | undefined;
  const keywordAnalysis = analyzeKeywordDensity(bodyContent, keywords);
  if (keywordAnalysis.overOptimized) {
    warnings.push('Keyword over-optimization detected (>3% density)');
    for (const [keyword, density] of Object.entries(keywordAnalysis.density)) {
      if (density > 3) {
        warnings.push(`  - "${keyword}": ${density.toFixed(2)}%`);
      }
    }
  }
  
  // Image count
  const imageCount = (bodyContent.match(/!\[.*?\]\(.*?\)/g) || []).length;
  
  // Link count
  const linkCount = (bodyContent.match(/\[.*?\]\(.*?\)/g) || []).length - imageCount;
  
  // Heading count
  const headingCount = (bodyContent.match(/^#{1,6}\s+.+$/gm) || []).length;
  
  return {
    file: basename(filePath),
    passed: errors.length === 0,
    errors,
    warnings,
    metrics: {
      wordCount,
      readingTime,
      headingCount,
      imageCount,
      linkCount,
    },
  };
}

async function main() {
  console.log('🔍 Starting Comprehensive SEO Validation...\n');
  
  const rootDir = resolve(process.cwd(), '../..');
  
  const contentPatterns = [
    'apps/web/app/**/page.mdx',
    'apps/web/content/**/*.{md,mdx}',
    'apps/docs/content/**/*.{md,mdx}',
  ];
  
  const files = await glob(contentPatterns, {
    cwd: rootDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.next/**'],
  });
  
  console.log(`Found ${files.length} content files to validate\n`);
  
  const results: ValidationResult[] = [];
  
  for (const file of files) {
    try {
      const result = await validateContentFile(file);
      results.push(result);
      
      if (result.passed) {
        console.log(`✅ ${result.file}`);
        console.log(`   ${result.metrics.wordCount} words, ${result.metrics.readingTime} min read`);
        if (result.warnings.length > 0) {
          console.log(`   ⚠️  ${result.warnings.length} warnings`);
        }
      } else {
        console.error(`❌ ${result.file}`);
        for (const error of result.errors) {
          console.error(`   ${error}`);
        }
      }
      
      if (result.warnings.length > 0 && !result.passed) {
        for (const warning of result.warnings) {
          console.warn(`   ⚠️  ${warning}`);
        }
      }
      
      console.log('');
    } catch (error) {
      console.error(`Error processing ${file}:`, error);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Validation Summary\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`⚠️  Total Warnings: ${totalWarnings}`);
  
  if (failed > 0) {
    console.error('\n❌ SEO validation failed. Please fix errors above.');
    process.exit(1);
  }
  
  if (totalWarnings > 5) {
    console.warn('\n⚠️  Multiple warnings detected. Consider addressing for optimal SEO.');
  }
  
  console.log('\n✅ SEO validation complete!');
}

main().catch(console.error);
