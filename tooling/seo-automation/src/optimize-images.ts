#!/usr/bin/env tsx
/**
 * Automated Image Optimization for SEO
 * 
 * Optimizes all images in web/docs apps:
 * - Converts to WebP/AVIF for modern browsers
 * - Generates responsive sizes
 * - Adds blur placeholders
 * - Validates alt text presence
 * - Compresses with quality settings
 */

import { glob } from 'glob';
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename, extname, join } from 'node:path';

interface ImageOptimizationConfig {
  quality: number;
  formats: ('webp' | 'avif' | 'jpeg')[];
  sizes: number[];
  generateBlurPlaceholder: boolean;
  minifyMetadata: boolean;
}

const DEFAULT_CONFIG: ImageOptimizationConfig = {
  quality: 85,
  formats: ['webp', 'avif'],
  sizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  generateBlurPlaceholder: true,
  minifyMetadata: true,
};

async function optimizeImage(imagePath: string, config: ImageOptimizationConfig = DEFAULT_CONFIG) {
  const image = sharp(imagePath);
  const metadata = await image.metadata();
  
  console.log(`📸 Optimizing: ${basename(imagePath)}`);
  
  // Validate image
  if (!metadata.width || !metadata.height) {
    console.error(`   ✗ Invalid image: ${imagePath}`);
    return;
  }

  const outputDir = join(dirname(imagePath), 'optimized');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const baseName = basename(imagePath, extname(imagePath));
  const results: string[] = [];

  // Generate optimized formats
  for (const format of config.formats) {
    const outputPath = join(outputDir, `${baseName}.${format}`);
    
    try {
      await image
        .clone()
        [format]({ quality: config.quality })
        .toFile(outputPath);
      
      results.push(`   ✓ Generated ${format}: ${outputPath}`);
    } catch (error) {
      console.error(`   ✗ Failed ${format}:`, error);
    }
  }

  // Generate blur placeholder (base64 data URL)
  if (config.generateBlurPlaceholder) {
    const placeholder = await image
      .clone()
      .resize(20, 20, { fit: 'inside' })
      .blur(1)
      .webp({ quality: 20 })
      .toBuffer();
    
    const dataUrl = `data:image/webp;base64,${placeholder.toString('base64')}`;
    const placeholderPath = join(outputDir, `${baseName}.placeholder.txt`);
    writeFileSync(placeholderPath, dataUrl);
    results.push(`   ✓ Blur placeholder: ${placeholderPath}`);
  }

  // Generate responsive sizes
  for (const size of config.sizes.filter(s => s < (metadata.width || 0))) {
    const sizePath = join(outputDir, `${baseName}-${size}w.webp`);
    
    try {
      await image
        .clone()
        .resize(size, null, { withoutEnlargement: true })
        .webp({ quality: config.quality })
        .toFile(sizePath);
      
      results.push(`   ✓ Responsive ${size}w: ${sizePath}`);
    } catch (error) {
      console.error(`   ✗ Failed ${size}w:`, error);
    }
  }

  console.log(results.join('\n'));
  console.log('');
}

async function validateAltText(contentPath: string) {
  const content = readFileSync(contentPath, 'utf-8');
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const matches = [...content.matchAll(imageRegex)];
  
  const missingAlt = matches.filter(m => !m[1] || m[1].trim() === '');
  
  if (missingAlt.length > 0) {
    console.error(`⚠️  Missing alt text in ${basename(contentPath)}:`);
    for (const match of missingAlt) {
      console.error(`   - Image: ${match[2]}`);
    }
    return false;
  }
  
  return true;
}

async function main() {
  console.log('🎨 Starting Image Optimization for SEO...\n');

  const rootDir = resolve(process.cwd(), '../..');
  
  // Find all images in web/docs apps
  const imagePatterns = [
    'apps/web/public/**/*.{jpg,jpeg,png}',
    'apps/docs/public/**/*.{jpg,jpeg,png}',
    'apps/web/app/**/*.{jpg,jpeg,png}',
    'apps/docs/app/**/*.{jpg,jpeg,png}',
  ];

  const images = await glob(imagePatterns, { 
    cwd: rootDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/optimized/**', '**/.next/**']
  });

  console.log(`Found ${images.length} images to optimize\n`);

  for (const image of images) {
    await optimizeImage(image);
  }

  // Validate alt text in markdown/mdx
  console.log('\n📝 Validating Alt Text in Content...\n');
  
  const contentPatterns = [
    'apps/web/**/*.{md,mdx}',
    'apps/docs/**/*.{md,mdx}',
  ];

  const contentFiles = await glob(contentPatterns, {
    cwd: rootDir,
    absolute: true,
    ignore: ['**/node_modules/**', '**/.next/**']
  });

  let altTextValid = true;
  for (const file of contentFiles) {
    const valid = await validateAltText(file);
    if (!valid) altTextValid = false;
  }

  if (altTextValid) {
    console.log('\n✅ All images have alt text');
  } else {
    console.error('\n❌ Some images missing alt text (critical for SEO)');
    process.exit(1);
  }

  console.log('\n✅ Image optimization complete!');
}

main().catch(console.error);
