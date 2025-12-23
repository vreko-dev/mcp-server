#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

/**
 * Add .js extensions to relative imports in ESM files
 * Required for Node.js v22+ strict ESM compliance
 */

function addJsExtensions(dir) {
	const files = readdirSync(dir);
	
	for (const file of files) {
		const filePath = join(dir, file);
		const stat = statSync(filePath);
		
		if (stat.isDirectory()) {
			addJsExtensions(filePath);
		} else if (extname(file) === '.js') {
			let content = readFileSync(filePath, 'utf8');
			
			// Add .js to relative imports: from "./auth" -> from "./auth.js"
			// Matches: import ... from "./path" or "../path"
			content = content.replace(
				/(from\s+['"])(\.[^'"]+)(['"])/g,
				(match, prefix, path, suffix) => {
					// Skip if already has extension
					if (path.match(/\.\w+$/)) return match;
					return `${prefix}${path}.js${suffix}`;
				}
			);
			
			writeFileSync(filePath, content, 'utf8');
		}
	}
}

const distDir = join(process.cwd(), 'dist');
addJsExtensions(distDir);
console.log('[mcp-server] Added .js extensions to ESM imports');
