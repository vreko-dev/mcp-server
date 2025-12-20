/**
 * Semantic Context Retriever
 *
 * Implements Multiplier 2 from unified_context_system.md:
 * - 88% token reduction via semantic search
 * - Local embeddings using @huggingface/transformers (no API cost)
 * - SQLite database for section embeddings
 * - Returns only relevant context sections within token budget
 *
 * Token Impact:
 * - Without compression: 11,000 tokens (full context)
 * - With compression: ~1,500 tokens (relevant sections only)
 * - Savings: 88% token reduction
 */

import { type FeatureExtractionPipeline, pipeline } from "@huggingface/transformers";
import * as fs from "fs";
import * as path from "path";
// @ts-expect-error - sql.js doesn't have type declarations
import initSqlJs from "sql.js";
import { fileURLToPath } from "url";

// sql.js database type
type SqlJsDatabase = ReturnType<Awaited<ReturnType<typeof initSqlJs>>["Database"]> extends new (
	...args: any[]
) => infer R
	? R
	: never;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AI_DEV_UTILS = path.resolve(__dirname, "..");

interface Section {
	id: number;
	file: string;
	section: string;
	content: string;
	embedding: Uint8Array;
	tokens: number;
}

interface ScoredSection extends Section {
	score: number;
}

/**
 * Semantic Context Retriever
 *
 * Uses local embeddings to find and return only relevant context sections,
 * dramatically reducing token usage while maintaining context quality.
 */
export class SemanticContextRetriever {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private embedder: FeatureExtractionPipeline | null = null;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private db: any = null;
	private initialized = false;
	private dbPath: string;

	constructor(dbPath?: string) {
		this.dbPath = dbPath || path.join(AI_DEV_UTILS, "mcp", "embeddings.db");
	}

	/**
	 * Ensure database is loaded and schema exists
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private async ensureDb(): Promise<any> {
		if (this.db) return this.db;

		const SQL = await initSqlJs();

		// Load existing database or create new one
		if (fs.existsSync(this.dbPath)) {
			const fileBuffer = fs.readFileSync(this.dbPath);
			this.db = new SQL.Database(fileBuffer);
		} else {
			this.db = new SQL.Database();
		}

		// Ensure schema
		this.db.run(`
			CREATE TABLE IF NOT EXISTS sections (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				file TEXT NOT NULL,
				section TEXT NOT NULL,
				content TEXT NOT NULL,
				embedding BLOB,
				tokens INTEGER,
				indexed_at TEXT DEFAULT CURRENT_TIMESTAMP,
				UNIQUE(file, section)
			)
		`);

		return this.db;
	}

	/**
	 * Save database to disk
	 */
	private saveDb(): void {
		if (!this.db) return;
		const data = this.db.export();
		const buffer = Buffer.from(data);
		fs.writeFileSync(this.dbPath, buffer);
	}

	/**
	 * Initialize the embedder and database (lazy loading)
	 */
	async initialize(): Promise<void> {
		if (this.initialized) return;

		console.error("[SemanticRetriever] Initializing...");

		// Initialize database
		await this.ensureDb();

		// Use all-MiniLM-L6-v2: fast, 384-dimensional vectors
		console.error("[SemanticRetriever] Loading embedder model...");
		// @ts-expect-error - Pipeline type is complex
		this.embedder = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");

		this.initialized = true;
		console.error("[SemanticRetriever] Ready (Xenova/all-MiniLM-L6-v2)");
	}

	/**
	 * Index all context files (run on startup or after changes)
	 */
	async indexContextFiles(): Promise<{ indexed: number; skipped: number }> {
		await this.initialize();

		const files = ["ARCHITECTURE.md", "CONSTRAINTS.md", "ROUTER.md", "patterns/codebase-patterns.md"];

		let indexed = 0;
		let skipped = 0;

		for (const file of files) {
			const fullPath = path.join(AI_DEV_UTILS, file);
			if (!fs.existsSync(fullPath)) {
				console.error(`[SemanticRetriever] File not found: ${file}`);
				skipped++;
				continue;
			}

			const content = fs.readFileSync(fullPath, "utf-8");
			const sections = this.splitIntoSections(content);

			for (const section of sections) {
				// Check if section exists with same content (sql.js API)
				const stmt = this.db!.prepare("SELECT id, content FROM sections WHERE file = ? AND section = ?");
				stmt.bind([file, section.header]);

				let existingContent: string | null = null;
				if (stmt.step()) {
					const row = stmt.getAsObject();
					existingContent = row.content as string;
				}
				stmt.free();

				// Skip if content unchanged
				if (existingContent === section.content) {
					skipped++;
					continue;
				}

				// Generate embedding
				const embedding = await this.embed(section.content);
				const tokens = this.estimateTokens(section.content);
				const embeddingBlob = new Uint8Array(new Float32Array(embedding).buffer);

				// Upsert section (sql.js uses INSERT OR REPLACE)
				this.db!.run(
					`INSERT OR REPLACE INTO sections (file, section, content, embedding, tokens, indexed_at)
					 VALUES (?, ?, ?, ?, ?, datetime('now'))`,
					[file, section.header, section.content, embeddingBlob, tokens],
				);

				indexed++;
			}
		}

		// Save to disk after indexing
		this.saveDb();

		console.error(`[SemanticRetriever] Indexed ${indexed} sections, skipped ${skipped}`);
		return { indexed, skipped };
	}

	/**
	 * Get relevant context for a query within token budget
	 */
	async getRelevantContext(
		query: string,
		maxTokens = 2000,
	): Promise<{
		context: string;
		tokensUsed: number;
		sectionsIncluded: number;
		compressionRatio: number;
	}> {
		await this.initialize();

		// Get all sections with embeddings (sql.js API)
		const sections: Section[] = [];
		const stmt = this.db!.prepare(
			"SELECT id, file, section, content, embedding, tokens FROM sections WHERE embedding IS NOT NULL",
		);
		while (stmt.step()) {
			const row = stmt.getAsObject();
			sections.push({
				id: row.id as number,
				file: row.file as string,
				section: row.section as string,
				content: row.content as string,
				embedding: row.embedding as Uint8Array,
				tokens: row.tokens as number,
			});
		}
		stmt.free();

		if (sections.length === 0) {
			// No indexed sections - return empty and suggest indexing
			return {
				context: "",
				tokensUsed: 0,
				sectionsIncluded: 0,
				compressionRatio: 0,
			};
		}

		// Embed the query
		const queryEmbedding = await this.embed(query);

		// Score all sections by similarity
		const scored: ScoredSection[] = sections
			.map((s) => {
				// Convert Uint8Array to Float32Array for embedding
				const embeddingArray = new Float32Array(
					s.embedding.buffer,
					s.embedding.byteOffset,
					s.embedding.byteLength / 4,
				);
				return {
					...s,
					score: this.cosineSimilarity(queryEmbedding, embeddingArray),
				};
			})
			.sort((a, b) => b.score - a.score);

		// Select top sections within token budget
		let totalTokens = 0;
		const selected: ScoredSection[] = [];

		for (const section of scored) {
			if (totalTokens + section.tokens <= maxTokens) {
				selected.push(section);
				totalTokens += section.tokens;
			} else if (selected.length >= 3) {
				// Have at least 3 sections, stop
				break;
			}
		}

		// Calculate total tokens in database (for compression ratio)
		const totalDbTokens = sections.reduce((sum, s) => sum + s.tokens, 0);

		// Format output
		const context = selected.map((s) => `## ${s.file} - ${s.section}\n${s.content}`).join("\n\n---\n\n");

		return {
			context,
			tokensUsed: totalTokens,
			sectionsIncluded: selected.length,
			compressionRatio: totalDbTokens > 0 ? 1 - totalTokens / totalDbTokens : 0,
		};
	}

	/**
	 * Embed text using local model
	 */
	private async embed(text: string): Promise<number[]> {
		if (!this.embedder) {
			throw new Error("Embedder not initialized. Call initialize() first.");
		}

		const result = await this.embedder(text, { pooling: "mean", normalize: true });
		return Array.from(result.data as Float32Array);
	}

	/**
	 * Calculate cosine similarity between two vectors
	 */
	private cosineSimilarity(a: number[], b: Float32Array): number {
		let dotProduct = 0;
		let normA = 0;
		let normB = 0;

		for (let i = 0; i < a.length; i++) {
			dotProduct += a[i] * b[i];
			normA += a[i] * a[i];
			normB += b[i] * b[i];
		}

		const denominator = Math.sqrt(normA) * Math.sqrt(normB);
		return denominator === 0 ? 0 : dotProduct / denominator;
	}

	/**
	 * Split markdown content into sections by ## headers
	 */
	private splitIntoSections(content: string): Array<{ header: string; content: string }> {
		const sections: Array<{ header: string; content: string }> = [];
		const lines = content.split("\n");

		let currentHeader = "Introduction";
		let currentContent: string[] = [];

		for (const line of lines) {
			if (line.startsWith("## ")) {
				// Save previous section if it has content
				if (currentContent.length > 0) {
					const sectionContent = currentContent.join("\n").trim();
					if (sectionContent.length > 50) {
						// Only index sections with meaningful content
						sections.push({
							header: currentHeader,
							content: sectionContent,
						});
					}
				}
				currentHeader = line.replace("## ", "").trim();
				currentContent = [];
			} else {
				currentContent.push(line);
			}
		}

		// Don't forget the last section
		if (currentContent.length > 0) {
			const sectionContent = currentContent.join("\n").trim();
			if (sectionContent.length > 50) {
				sections.push({
					header: currentHeader,
					content: sectionContent,
				});
			}
		}

		return sections;
	}

	/**
	 * Estimate token count (rough: ~4 chars per token)
	 */
	private estimateTokens(text: string): number {
		return Math.ceil(text.length / 4);
	}

	/**
	 * Get statistics about indexed content
	 */
	getStats(): { totalSections: number; totalTokens: number; files: string[] } {
		if (!this.db) {
			return { totalSections: 0, totalTokens: 0, files: [] };
		}

		// Get counts (sql.js API)
		const countStmt = this.db.prepare("SELECT COUNT(*) as cnt, COALESCE(SUM(tokens), 0) as total FROM sections");
		let totalSections = 0;
		let totalTokens = 0;
		if (countStmt.step()) {
			const row = countStmt.getAsObject();
			totalSections = row.cnt as number;
			totalTokens = row.total as number;
		}
		countStmt.free();

		// Get distinct files
		const files: string[] = [];
		const filesStmt = this.db.prepare("SELECT DISTINCT file FROM sections");
		while (filesStmt.step()) {
			const row = filesStmt.getAsObject();
			files.push(row.file as string);
		}
		filesStmt.free();

		return { totalSections, totalTokens, files };
	}

	/**
	 * Close database connection and save
	 */
	close(): void {
		if (this.db) {
			this.saveDb();
			this.db.close();
			this.db = null;
		}
	}
}

/**
 * Test the semantic retriever
 */
export async function testSemanticRetriever(): Promise<void> {
	console.error("\n🧪 Testing Semantic Context Retriever...\n");

	const retriever = new SemanticContextRetriever();

	try {
		// Index context files
		console.error("📚 Indexing context files...");
		const indexResult = await retriever.indexContextFiles();
		console.error(`✅ Indexed: ${indexResult.indexed}, Skipped: ${indexResult.skipped}`);

		// Get stats
		const stats = retriever.getStats();
		console.error(`📊 Total sections: ${stats.totalSections}, Total tokens: ${stats.totalTokens}`);
		console.error(`📁 Files: ${stats.files.join(", ")}`);

		// Test queries
		const testQueries = [
			"add authentication to MCP server",
			"fix database query in API",
			"VS Code extension activation performance",
		];

		for (const query of testQueries) {
			console.error(`\n🔍 Query: "${query}"`);
			const result = await retriever.getRelevantContext(query, 2000);
			console.error(`   Sections: ${result.sectionsIncluded}`);
			console.error(`   Tokens: ${result.tokensUsed} / ${stats.totalTokens}`);
			console.error(`   Compression: ${(result.compressionRatio * 100).toFixed(1)}%`);
			console.error(`   Preview: ${result.context.slice(0, 100)}...`);
		}

		console.error("\n✅ Semantic retriever test complete!");
	} finally {
		retriever.close();
	}
}
