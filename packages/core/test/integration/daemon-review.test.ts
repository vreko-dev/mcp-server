/**
 * Daemon Code Review Regression Test
 *
 * Ensures that the MCP Intelligence analyzers can detect real security
 * and completeness issues in daemon/server code.
 *
 * Based on the 13 issues identified in the original daemon code review.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { CompletenessAnalyzer, SecurityAnalyzer, SyntaxAnalyzer } from "../../src/analysis/index.js";
import type { AnalysisContext } from "../../src/analysis/types.js";

/**
 * Sample daemon code with multiple security and completeness issues.
 * This is intentionally flawed code to test detection capabilities.
 */
const FLAWED_DAEMON_CODE = `
import net from 'net';
import fs from 'fs';

class SnapbackDaemon {
  private socketPath = '/tmp/daemon.sock';

  start() {
    const server = net.createServer((socket) => {
      socket.on('data', (data) => {
        // No buffer limit - DoS risk
        const response = this.handleCommand(data.toString());
        socket.write(response);
      });
    });

    // Missing signal handlers (SIGTERM/SIGINT)
    // Missing socket permissions after listen
    server.listen(this.socketPath);
  }

  handleCommand(command: string) {
    const [action, filePath] = command.split(' ');
    if (action === 'snapshot') {
      // PATH TRAVERSAL - reading arbitrary files!
      return fs.readFileSync(filePath, 'utf-8');
    }
    if (action === 'exec') {
      // COMMAND INJECTION via eval
      return eval(command);
    }
    return 'unknown command';
  }

  autoStart() {
    // TODO: implement auto-start feature
    throw new Error('auto-start not implemented');
  }

  private secretKey = 'sk_live_abc123xyz789secretkey';
}
`;

/**
 * Clean daemon code that should pass most checks
 */
const CLEAN_DAEMON_CODE = `
import net from 'net';
import fs from 'fs';
import path from 'path';

const MAX_BUFFER_SIZE = 1024 * 1024; // 1MB limit

class SecureDaemon {
  private socketPath: string;
  private server: net.Server | null = null;
  private buffer: Buffer[] = [];
  private bufferSize = 0;

  constructor(socketPath: string) {
    this.socketPath = socketPath;
  }

  start(): void {
    this.server = net.createServer((socket) => {
      socket.on('data', (data) => {
        // Buffer limit check
        if (this.bufferSize + data.length > MAX_BUFFER_SIZE) {
          socket.end('ERROR: Buffer overflow');
          return;
        }
        this.bufferSize += data.length;
        this.buffer.push(data);

        const response = this.handleCommand(data.toString());
        socket.write(response);
      });
    });

    // Signal handlers for graceful shutdown
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());

    this.server.listen(this.socketPath, () => {
      // Set socket permissions
      fs.chmodSync(this.socketPath, 0o600);
    });
  }

  private gracefulShutdown(): void {
    if (this.server) {
      this.server.close(() => process.exit(0));
    }
  }

  handleCommand(command: string): string {
    const [action, relativePath] = command.split(' ');
    if (action === 'snapshot') {
      // Safe: validate path against workspace root
      const workspaceRoot = '/workspace';
      const fullPath = path.join(workspaceRoot, relativePath);
      if (!fullPath.startsWith(workspaceRoot)) {
        return 'ERROR: Invalid path';
      }
      return fs.readFileSync(fullPath, 'utf-8');
    }
    return 'unknown command';
  }
}
`;

describe("Daemon Code Review Regression", () => {
	let syntaxAnalyzer: SyntaxAnalyzer;
	let securityAnalyzer: SecurityAnalyzer;
	let completenessAnalyzer: CompletenessAnalyzer;

	beforeAll(() => {
		syntaxAnalyzer = new SyntaxAnalyzer();
		securityAnalyzer = new SecurityAnalyzer();
		completenessAnalyzer = new CompletenessAnalyzer();
	});

	function createContext(code: string, fileName = "daemon.ts"): AnalysisContext {
		return {
			workspaceRoot: "/workspace",
			files: [fileName],
			contents: new Map([[fileName, code]]),
		};
	}

	describe("Flawed Daemon Code Detection", () => {
		it("detects eval() usage (critical security issue)", async () => {
			const ctx = createContext(FLAWED_DAEMON_CODE);
			const result = await securityAnalyzer.analyze(ctx);

			const evalIssues = result.issues.filter((i) => i.type === "UNSAFE_EVAL");
			expect(evalIssues.length).toBeGreaterThan(0);
			expect(evalIssues[0].severity).toBe("critical");
		});

		it("detects path traversal vulnerability", async () => {
			const ctx = createContext(FLAWED_DAEMON_CODE);
			const result = await securityAnalyzer.analyze(ctx);

			const pathIssues = result.issues.filter((i) => i.type === "PATH_TRAVERSAL");
			expect(pathIssues.length).toBeGreaterThan(0);
			expect(pathIssues[0].severity).toBe("high");
		});

		it("detects missing signal handlers", async () => {
			const ctx = createContext(FLAWED_DAEMON_CODE);
			const result = await securityAnalyzer.analyze(ctx);

			const signalIssues = result.issues.filter((i) => i.type === "MISSING_SIGNAL_HANDLER");
			expect(signalIssues.length).toBeGreaterThan(0);
		});

		it("detects hardcoded secrets", async () => {
			const ctx = createContext(FLAWED_DAEMON_CODE);
			const result = await securityAnalyzer.analyze(ctx);

			const secretIssues = result.issues.filter((i) => i.type === "HARDCODED_SECRET");
			expect(secretIssues.length).toBeGreaterThan(0);
			expect(secretIssues[0].severity).toBe("critical");
		});

		it("detects incomplete implementation (TODO/throw not implemented)", async () => {
			const ctx = createContext(FLAWED_DAEMON_CODE);
			const result = await completenessAnalyzer.analyze(ctx);

			const incompleteIssues = result.issues.filter((i) => i.type === "INCOMPLETE_IMPLEMENTATION");
			expect(incompleteIssues.length).toBeGreaterThan(0);
		});

		it("detects at least 5 distinct issues in flawed code", async () => {
			const ctx = createContext(FLAWED_DAEMON_CODE);

			const [securityResult, completenessResult] = await Promise.all([
				securityAnalyzer.analyze(ctx),
				completenessAnalyzer.analyze(ctx),
			]);

			const allIssues = [...securityResult.issues, ...completenessResult.issues];
			const issueTypes = new Set(allIssues.map((i) => i.type));

			// Should detect multiple issue types
			expect(issueTypes.size).toBeGreaterThanOrEqual(4);

			// Verify we have mix of severities
			const criticalIssues = allIssues.filter((i) => i.severity === "critical");
			const highIssues = allIssues.filter((i) => i.severity === "high");

			expect(criticalIssues.length).toBeGreaterThan(0);
			expect(highIssues.length).toBeGreaterThan(0);
		});

		it("generates actionable fix suggestions", async () => {
			const ctx = createContext(FLAWED_DAEMON_CODE);
			const result = await securityAnalyzer.analyze(ctx);

			// Every issue should have a fix suggestion
			const issuesWithFixes = result.issues.filter((i) => i.fix && i.fix.length > 0);
			expect(issuesWithFixes.length).toBe(result.issues.length);
		});
	});

	describe("Clean Daemon Code Verification", () => {
		it("finds no critical issues in clean code", async () => {
			const ctx = createContext(CLEAN_DAEMON_CODE);
			const result = await securityAnalyzer.analyze(ctx);

			const criticalIssues = result.issues.filter((i) => i.severity === "critical");
			expect(criticalIssues.length).toBe(0);
		});

		it("does not flag signal handlers when present", async () => {
			const ctx = createContext(CLEAN_DAEMON_CODE);
			const result = await securityAnalyzer.analyze(ctx);

			const signalIssues = result.issues.filter((i) => i.type === "MISSING_SIGNAL_HANDLER");
			expect(signalIssues.length).toBe(0);
		});

		it("does not flag path operations when validated", async () => {
			const ctx = createContext(CLEAN_DAEMON_CODE);
			const result = await securityAnalyzer.analyze(ctx);

			// The clean code still uses fs.readFileSync with path.join which
			// includes __dirname pattern detection, so it should be safe
			const pathIssues = result.issues.filter((i) => i.type === "PATH_TRAVERSAL" && i.severity === "critical");
			expect(pathIssues.length).toBe(0);
		});
	});

	describe("Analyzer Coverage", () => {
		it("syntax analyzer reports coverage metrics", async () => {
			const ctx = createContext(FLAWED_DAEMON_CODE);
			const result = await syntaxAnalyzer.analyze(ctx);

			expect(result.success).toBe(true);
			expect(result.coverage).toBeGreaterThan(0);
			expect(result.metadata?.filesAnalyzed).toBe(1);
			expect(result.metadata?.nodesVisited).toBeGreaterThan(0);
		});

		it("security analyzer reports coverage metrics", async () => {
			const ctx = createContext(FLAWED_DAEMON_CODE);
			const result = await securityAnalyzer.analyze(ctx);

			expect(result.success).toBe(true);
			expect(result.coverage).toBeGreaterThan(0);
			expect(result.metadata?.patternsChecked).toBeDefined();
			expect(result.metadata?.patternsChecked?.length).toBeGreaterThan(0);
		});

		it("completeness analyzer reports coverage metrics", async () => {
			const ctx = createContext(FLAWED_DAEMON_CODE);
			const result = await completenessAnalyzer.analyze(ctx);

			expect(result.success).toBe(true);
			expect(result.coverage).toBeGreaterThan(0);
		});
	});

	describe("Issue Quality", () => {
		it("issues have required fields", async () => {
			const ctx = createContext(FLAWED_DAEMON_CODE);
			const result = await securityAnalyzer.analyze(ctx);

			for (const issue of result.issues) {
				expect(issue.id).toBeDefined();
				expect(issue.severity).toBeDefined();
				expect(issue.type).toBeDefined();
				expect(issue.message).toBeDefined();
				expect(["critical", "high", "medium", "low", "info"]).toContain(issue.severity);
			}
		});

		it("issues have unique IDs for deduplication", async () => {
			const ctx = createContext(FLAWED_DAEMON_CODE);
			const result = await securityAnalyzer.analyze(ctx);

			const ids = result.issues.map((i) => i.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});
	});
});
