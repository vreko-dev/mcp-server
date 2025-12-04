Key Changes Based on Research
What We Had vs. What We Need
AreaOur Earlier ApproachResearch EnrichmentChange NeededIdentityAssumed authenticated usersAnonymous-first with stable fingerprintsAdd Layer 0AI DetectionPattern matching → toolPattern + extension + confidence scoringEnhanceUser ContextAsked via formsInferred from git metadataReplaceOrg/TeamRequired inputParsed from git remotesAdd inferenceRole/SeniorityNot capturedInferred from commit patternsAdd inferenceConversionStandard auth flowRetroactive event linkageAdd merge logicValue DisplayAfter loginBefore login (anonymous dashboard)Add pre-auth view

Enriched Architecture: 8 Layers
Let me map your research into our existing SnapBack architecture:
┌──────────────────────────────────────────────────────────────────────────────┐
│                    SNAPBACK INVISIBLE TELEMETRY STACK                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  LAYER 0: STABLE ANONYMOUS IDENTITY (NEW)                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Device Fingerprint + Workspace Hash + Extension Version                │ │
│  │  → Survives restarts, persists in globalState + .snapback/identity     │ │
│  │  → 100% passive, zero user interaction                                  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  LAYER 1: PASSIVE GIT INTELLIGENCE (ENHANCED)                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Read .git/config directly (no git commands)                            │ │
│  │  → Organization from remotes                                            │ │
│  │  → Team size from commit graph                                          │ │
│  │  → Author name/email (pre-fill login)                                   │ │
│  │  → Project maturity, hooks, branch patterns                             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  LAYER 2: BEHAVIORAL INFERENCE (NEW)                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Role/Seniority: commit frequency, file spread, test ratio              │ │
│  │  Workflow: uses rebase? PRs? advanced git?                              │ │
│  │  AI Tool Preference: which tools detected most often?                   │ │
│  │  → All with confidence scores (0-1)                                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  LAYER 3: AI DETECTION (ENHANCED)                                           │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Priority: Extension check → Metadata tag → Pattern match → Heuristic   │ │
│  │  Confidence scoring per detection method                                │ │
│  │  Tool-specific signatures (Claude vs Cursor vs Copilot)                 │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  LAYER 4: SUGGESTION LIFECYCLE (EXISTING + ENHANCED)                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Received → Displayed → Accepted/Rejected/Modified → Committed          │ │
│  │  → Survived Review → Survived CI → Rolled Back?                         │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  LAYER 5: INVISIBLE EVENT COLLECTION (EXISTING)                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  All events tagged with: anonymousId + sessionId + context              │ │
│  │  Batched, compressed, privacy-sanitized                                 │ │
│  │  Sent to backend every 30s or on significant event                      │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  LAYER 6: RETROACTIVE LINKAGE (NEW)                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  On login: anonymousId → userId merge                                   │ │
│  │  All prior events attributed to authenticated user                      │ │
│  │  Complete funnel visibility from install to conversion                  │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                              ↓                                               │
│  LAYER 7: OPT-IN VISIBILITY SURFACES                                        │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  Extension WebView: Commit-time insights, rollback summaries            │ │
│  │  Web Dashboard: Full metrics, team analytics, tool comparison           │ │
│  │  Pre-Auth Preview: Value display before requiring login                 │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

New Components to Implement
1. Anonymous Identity Service (Layer 0)
typescript// packages/analytics/src/identity/anonymous-identity.ts

import * as vscode from 'vscode';
import * as crypto from 'crypto';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Stable anonymous identity that:
 * - Persists across VS Code restarts
 * - Is deterministic for same device + workspace
 * - Requires zero user input
 * - Links to authenticated identity on login
 */
export interface AnonymousIdentity {
  /** Stable fingerprint: device + workspace + extension */
  anonymousId: string;

  /** Device-level ID (survives workspace changes) */
  deviceId: string;

  /** Workspace-level ID (changes per project) */
  workspaceId: string;

  /** Session ID (changes daily) */
  sessionId: string;

  /** First seen timestamp (for funnel analysis) */
  firstSeenAt: number;

  /** Confidence that this is a unique user */
  confidence: number;
}

export class AnonymousIdentityService {
  private identity: AnonymousIdentity | null = null;
  private readonly STORAGE_KEY = 'snapback.anonymousIdentity';

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly workspaceRoot: string | undefined
  ) {}

  /**
   * Get or create stable anonymous identity
   * Called once at extension activation
   */
  async getOrCreate(): Promise<AnonymousIdentity> {
    // Check if we have a persisted identity
    const stored = this.context.globalState.get<AnonymousIdentity>(this.STORAGE_KEY);

    if (stored && this.validateIdentity(stored)) {
      // Update session ID if new day
      if (this.isNewSession(stored)) {
        stored.sessionId = this.generateSessionId();
        await this.persist(stored);
      }
      this.identity = stored;
      return stored;
    }

    // Create new identity
    const identity = this.createIdentity();
    await this.persist(identity);
    this.identity = identity;

    return identity;
  }

  /**
   * Get current identity (throws if not initialized)
   */
  get(): AnonymousIdentity {
    if (!this.identity) {
      throw new Error('Anonymous identity not initialized. Call getOrCreate() first.');
    }
    return this.identity;
  }

  /**
   * Create deterministic identity from device + workspace signals
   */
  private createIdentity(): AnonymousIdentity {
    const deviceId = this.generateDeviceId();
    const workspaceId = this.generateWorkspaceId();
    const sessionId = this.generateSessionId();

    // Composite anonymous ID
    const anonymousId = crypto
      .createHash('sha256')
      .update(`${deviceId}:${workspaceId}:${vscode.version}`)
      .digest('hex')
      .substring(0, 32);

    return {
      anonymousId,
      deviceId,
      workspaceId,
      sessionId,
      firstSeenAt: Date.now(),
      confidence: this.calculateConfidence(deviceId, workspaceId),
    };
  }

  /**
   * Device ID: stable across workspaces, unique per machine
   */
  private generateDeviceId(): string {
    const signals = [
      os.hostname(),
      os.platform(),
      os.arch(),
      os.cpus()[0]?.model || 'unknown-cpu',
      os.userInfo().username,
    ];

    return crypto
      .createHash('sha256')
      .update(signals.join(':'))
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Workspace ID: unique per project/repo
   */
  private generateWorkspaceId(): string {
    if (!this.workspaceRoot) {
      return 'no-workspace';
    }

    // Include git remote if available for better uniqueness
    const gitRemote = this.getGitRemote();
    const signal = gitRemote || this.workspaceRoot;

    return crypto
      .createHash('sha256')
      .update(signal)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Session ID: changes daily for session-based analytics
   */
  private generateSessionId(): string {
    const today = new Date().toISOString().split('T')[0];
    return crypto
      .createHash('sha256')
      .update(`${this.identity?.deviceId || 'new'}:${today}`)
      .digest('hex')
      .substring(0, 12);
  }

  /**
   * Try to read git remote (origin) without running git command
   */
  private getGitRemote(): string | null {
    if (!this.workspaceRoot) return null;

    try {
      const gitConfigPath = path.join(this.workspaceRoot, '.git', 'config');
      if (!fs.existsSync(gitConfigPath)) return null;

      const config = fs.readFileSync(gitConfigPath, 'utf8');
      const match = config.match(/\[remote "origin"\]\s+url\s*=\s*(.+)/);
      return match?.[1]?.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Confidence score based on signal quality
   */
  private calculateConfidence(deviceId: string, workspaceId: string): number {
    let confidence = 0.5; // Base

    // Device signals available
    if (deviceId !== 'unknown') confidence += 0.2;

    // Workspace signals available
    if (workspaceId !== 'no-workspace') confidence += 0.15;

    // Git remote provides strong uniqueness
    if (this.getGitRemote()) confidence += 0.15;

    return Math.min(confidence, 1);
  }

  private validateIdentity(stored: AnonymousIdentity): boolean {
    return !!(
      stored.anonymousId &&
      stored.deviceId &&
      stored.firstSeenAt
    );
  }

  private isNewSession(stored: AnonymousIdentity): boolean {
    const today = new Date().toISOString().split('T')[0];
    const storedDay = new Date(stored.firstSeenAt).toISOString().split('T')[0];
    // New session if different day
    return today !== storedDay;
  }

  private async persist(identity: AnonymousIdentity): Promise<void> {
    await this.context.globalState.update(this.STORAGE_KEY, identity);

    // Also store in workspace .snapback for cross-device correlation
    if (this.workspaceRoot) {
      try {
        const snapbackDir = path.join(this.workspaceRoot, '.snapback');
        if (!fs.existsSync(snapbackDir)) {
          fs.mkdirSync(snapbackDir, { recursive: true });
        }
        fs.writeFileSync(
          path.join(snapbackDir, 'identity.json'),
          JSON.stringify({ workspaceId: identity.workspaceId }, null, 2)
        );
      } catch {
        // Non-critical, ignore
      }
    }
  }
}
2. Passive Git Intelligence (Layer 1)
typescript// packages/analytics/src/inference/git-intelligence.ts

import * as fs from 'fs';
import * as path from 'path';

/**
 * Extract git metadata by reading .git directly
 * No git commands executed - faster and works without git installed
 */
export interface GitIntelligence {
  // Organization inference
  organization: string | null;
  platform: 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'self-hosted' | 'unknown';
  isOpenSource: boolean;

  // Team inference
  teamSize: 'solo' | 'small' | 'medium' | 'large' | 'unknown';
  estimatedContributors: number;

  // Author inference (for pre-fill)
  authorName: string | null;
  authorEmail: string | null;

  // Project maturity
  hasGitHooks: boolean;
  defaultBranch: string | null;
  approximateAge: 'new' | 'established' | 'mature' | 'unknown';

  // Confidence
  confidence: number;
}

export class GitIntelligenceService {
  constructor(private readonly workspaceRoot: string | undefined) {}

  /**
   * Extract all git intelligence passively
   * Called once at extension activation, cached
   */
  async extract(): Promise<GitIntelligence> {
    if (!this.workspaceRoot) {
      return this.emptyIntelligence();
    }

    const gitDir = path.join(this.workspaceRoot, '.git');
    if (!fs.existsSync(gitDir)) {
      return this.emptyIntelligence();
    }

    try {
      const config = this.readGitConfig(gitDir);
      const remotes = this.parseRemotes(config);
      const author = this.parseAuthor(config);
      const head = this.readHead(gitDir);
      const objectCount = this.countObjects(gitDir);

      return {
        // Organization
        organization: this.inferOrganization(remotes),
        platform: this.inferPlatform(remotes),
        isOpenSource: this.inferOpenSource(),

        // Team
        teamSize: this.inferTeamSize(objectCount),
        estimatedContributors: this.estimateContributors(objectCount),

        // Author
        authorName: author.name,
        authorEmail: author.email,

        // Maturity
        hasGitHooks: this.checkGitHooks(gitDir),
        defaultBranch: head.branch,
        approximateAge: this.inferAge(objectCount),

        confidence: this.calculateConfidence(remotes, author, objectCount),
      };
    } catch (error) {
      console.warn('[GitIntelligence] Failed to extract:', error);
      return this.emptyIntelligence();
    }
  }

  private readGitConfig(gitDir: string): string {
    const configPath = path.join(gitDir, 'config');
    return fs.existsSync(configPath)
      ? fs.readFileSync(configPath, 'utf8')
      : '';
  }

  private parseRemotes(config: string): { name: string; url: string }[] {
    const remotes: { name: string; url: string }[] = [];
    const regex = /\[remote "([^"]+)"\]\s+url\s*=\s*(.+)/g;
    let match;

    while ((match = regex.exec(config)) !== null) {
      remotes.push({ name: match[1], url: match[2].trim() });
    }

    return remotes;
  }

  private parseAuthor(config: string): { name: string | null; email: string | null } {
    const nameMatch = config.match(/\[user\]\s+name\s*=\s*(.+)/);
    const emailMatch = config.match(/\[user\]\s+email\s*=\s*(.+)/);

    return {
      name: nameMatch?.[1]?.trim() || null,
      email: emailMatch?.[1]?.trim() || null,
    };
  }

  private readHead(gitDir: string): { branch: string | null; commit: string | null } {
    try {
      const headPath = path.join(gitDir, 'HEAD');
      const head = fs.readFileSync(headPath, 'utf8').trim();

      // HEAD contains "ref: refs/heads/main" or a commit hash
      const refMatch = head.match(/^ref: refs\/heads\/(.+)$/);
      if (refMatch) {
        return { branch: refMatch[1], commit: null };
      }

      return { branch: null, commit: head };
    } catch {
      return { branch: null, commit: null };
    }
  }

  private countObjects(gitDir: string): number {
    try {
      const objectsDir = path.join(gitDir, 'objects');
      let count = 0;

      // Count loose objects (subdirectories with 2-char names)
      const entries = fs.readdirSync(objectsDir);
      for (const entry of entries) {
        if (entry.length === 2 && /^[0-9a-f]{2}$/.test(entry)) {
          const subdir = path.join(objectsDir, entry);
          count += fs.readdirSync(subdir).length;
        }
      }

      // Add packed objects estimate (pack files are compressed)
      const packDir = path.join(objectsDir, 'pack');
      if (fs.existsSync(packDir)) {
        const packFiles = fs.readdirSync(packDir).filter(f => f.endsWith('.pack'));
        // Rough estimate: each pack file contains ~1000 objects on average
        count += packFiles.length * 1000;
      }

      return count;
    } catch {
      return 0;
    }
  }

  private inferOrganization(remotes: { name: string; url: string }[]): string | null {
    const origin = remotes.find(r => r.name === 'origin')?.url || remotes[0]?.url;
    if (!origin) return null;

    // Parse: github.com/org/repo, gitlab.com/org/repo, etc.
    const patterns = [
      /github\.com[:/]([^/]+)\//,
      /gitlab\.com[:/]([^/]+)\//,
      /bitbucket\.org[:/]([^/]+)\//,
      /dev\.azure\.com[:/]([^/]+)\//,
      /ssh:\/\/git@[^/]+[:/]([^/]+)\//,
    ];

    for (const pattern of patterns) {
      const match = origin.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  private inferPlatform(remotes: { name: string; url: string }[]): GitIntelligence['platform'] {
    const origin = remotes.find(r => r.name === 'origin')?.url || '';

    if (origin.includes('github.com')) return 'github';
    if (origin.includes('gitlab.com')) return 'gitlab';
    if (origin.includes('bitbucket.org')) return 'bitbucket';
    if (origin.includes('azure.com') || origin.includes('visualstudio.com')) return 'azure';
    if (origin.includes('git@') || origin.includes('ssh://')) return 'self-hosted';

    return 'unknown';
  }

  private inferOpenSource(): boolean {
    if (!this.workspaceRoot) return false;

    // Check for common open source indicators
    const indicators = ['LICENSE', 'LICENSE.md', 'COPYING', 'CONTRIBUTING.md'];
    return indicators.some(f =>
      fs.existsSync(path.join(this.workspaceRoot!, f))
    );
  }

  private inferTeamSize(objectCount: number): GitIntelligence['teamSize'] {
    // Rough heuristic: more objects = more commits = larger team
    if (objectCount < 100) return 'solo';
    if (objectCount < 1000) return 'small';
    if (objectCount < 10000) return 'medium';
    if (objectCount >= 10000) return 'large';
    return 'unknown';
  }

  private estimateContributors(objectCount: number): number {
    // Very rough: ~50-100 objects per contributor on average
    return Math.max(1, Math.round(objectCount / 75));
  }

  private checkGitHooks(gitDir: string): boolean {
    const hooksDir = path.join(gitDir, 'hooks');
    if (!fs.existsSync(hooksDir)) return false;

    // Check for active hooks (not .sample files)
    const hooks = fs.readdirSync(hooksDir);
    return hooks.some(h => !h.endsWith('.sample'));
  }

  private inferAge(objectCount: number): GitIntelligence['approximateAge'] {
    if (objectCount < 50) return 'new';
    if (objectCount < 500) return 'established';
    if (objectCount >= 500) return 'mature';
    return 'unknown';
  }

  private calculateConfidence(
    remotes: { name: string; url: string }[],
    author: { name: string | null; email: string | null },
    objectCount: number
  ): number {
    let confidence = 0.3; // Base

    if (remotes.length > 0) confidence += 0.25;
    if (author.email) confidence += 0.2;
    if (author.name) confidence += 0.1;
    if (objectCount > 0) confidence += 0.15;

    return Math.min(confidence, 1);
  }

  private emptyIntelligence(): GitIntelligence {
    return {
      organization: null,
      platform: 'unknown',
      isOpenSource: false,
      teamSize: 'unknown',
      estimatedContributors: 0,
      authorName: null,
      authorEmail: null,
      hasGitHooks: false,
      defaultBranch: null,
      approximateAge: 'unknown',
      confidence: 0,
    };
  }
}
3. Role/Seniority Inference (Layer 2)
typescript// packages/analytics/src/inference/role-inference.ts

import { execSync } from 'child_process';

/**
 * Infer developer role and seniority from behavioral patterns
 * Only runs git commands if git is available, otherwise uses cached data
 */
export interface RoleInference {
  seniority: 'junior' | 'mid' | 'senior' | 'lead' | 'unknown';
  role: 'developer' | 'architect' | 'devops' | 'fullstack' | 'unknown';

  // Behavioral signals
  commitFrequency: number;  // Commits per week
  testCodeRatio: number;    // % of changes in test files
  fileOwnershipSpread: number;  // How many files touched
  usesAdvancedGit: boolean;

  confidence: number;
}

export class RoleInferenceService {
  private cachedResult: RoleInference | null = null;

  constructor(
    private readonly workspaceRoot: string | undefined,
    private readonly authorEmail: string | null
  ) {}

  /**
   * Infer role from git history
   * Called on first commit or dashboard view
   */
  async infer(): Promise<RoleInference> {
    if (this.cachedResult) {
      return this.cachedResult;
    }

    if (!this.workspaceRoot || !this.authorEmail) {
      return this.unknownRole();
    }

    try {
      const signals = await this.collectSignals();
      this.cachedResult = this.classifyRole(signals);
      return this.cachedResult;
    } catch {
      return this.unknownRole();
    }
  }

  private async collectSignals(): Promise<{
    commitCount: number;
    daysSinceFirstCommit: number;
    testCommits: number;
    totalCommits: number;
    uniqueFiles: number;
    usesRebase: boolean;
    usesCherryPick: boolean;
    usesStash: boolean;
  }> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    const since = threeMonthsAgo.toISOString().split('T')[0];

    // Count commits by this author
    const commitLog = this.runGit(
      `log --author="${this.authorEmail}" --since="${since}" --format="%H %s"`
    );
    const commits = commitLog.split('\n').filter(Boolean);

    // Count test-related commits
    const testCommits = commits.filter(c =>
      /test|spec|__tests__|\.test\.|\.spec\./i.test(c)
    ).length;

    // Count unique files touched
    const filesLog = this.runGit(
      `log --author="${this.authorEmail}" --since="${since}" --name-only --format=""`
    );
    const uniqueFiles = new Set(filesLog.split('\n').filter(Boolean)).size;

    // Check for advanced git usage
    const reflog = this.runGit('reflog --format="%gs" -n 100');

    return {
      commitCount: commits.length,
      daysSinceFirstCommit: 90, // We looked at 3 months
      testCommits,
      totalCommits: commits.length,
      uniqueFiles,
      usesRebase: reflog.includes('rebase'),
      usesCherryPick: reflog.includes('cherry-pick'),
      usesStash: reflog.includes('stash'),
    };
  }

  private classifyRole(signals: Awaited<ReturnType<typeof this.collectSignals>>): RoleInference {
    const commitFrequency = signals.commitCount / 13; // Per week over 3 months
    const testCodeRatio = signals.totalCommits > 0
      ? signals.testCommits / signals.totalCommits
      : 0;
    const usesAdvancedGit = signals.usesRebase || signals.usesCherryPick;

    // Classify seniority
    let seniority: RoleInference['seniority'] = 'unknown';
    let seniorityScore = 0;

    // High commit frequency → more senior
    if (commitFrequency > 10) seniorityScore += 2;
    else if (commitFrequency > 5) seniorityScore += 1;

    // Writes tests → more senior
    if (testCodeRatio > 0.3) seniorityScore += 2;
    else if (testCodeRatio > 0.1) seniorityScore += 1;

    // Wide file ownership → more senior
    if (signals.uniqueFiles > 50) seniorityScore += 2;
    else if (signals.uniqueFiles > 20) seniorityScore += 1;

    // Uses advanced git → more senior
    if (usesAdvancedGit) seniorityScore += 1;

    if (seniorityScore >= 6) seniority = 'lead';
    else if (seniorityScore >= 4) seniority = 'senior';
    else if (seniorityScore >= 2) seniority = 'mid';
    else if (seniorityScore >= 1) seniority = 'junior';

    // Classify role (simplified)
    const role: RoleInference['role'] = testCodeRatio > 0.4
      ? 'developer'
      : signals.uniqueFiles > 30
        ? 'fullstack'
        : 'developer';

    return {
      seniority,
      role,
      commitFrequency,
      testCodeRatio,
      fileOwnershipSpread: signals.uniqueFiles,
      usesAdvancedGit,
      confidence: this.calculateConfidence(signals),
    };
  }

  private calculateConfidence(signals: Awaited<ReturnType<typeof this.collectSignals>>): number {
    // More data = higher confidence
    if (signals.commitCount >= 30) return 0.85;
    if (signals.commitCount >= 10) return 0.7;
    if (signals.commitCount >= 5) return 0.55;
    return 0.4;
  }

  private runGit(command: string): string {
    try {
      return execSync(`git ${command}`, {
        cwd: this.workspaceRoot,
        encoding: 'utf8',
        timeout: 5000,
      });
    } catch {
      return '';
    }
  }

  private unknownRole(): RoleInference {
    return {
      seniority: 'unknown',
      role: 'unknown',
      commitFrequency: 0,
      testCodeRatio: 0,
      fileOwnershipSpread: 0,
      usesAdvancedGit: false,
      confidence: 0,
    };
  }
}
4. Retroactive Linkage API (Layer 6)
typescript// packages/api/modules/analytics/procedures/identify.ts

import { protectedProcedure, router } from '@snapback/api/trpc';
import { z } from 'zod';
import { db } from '@snapback/platform';
import { telemetryEvents, users, anonymousProfiles } from '@snapback/platform/schema';
import { eq, and, gte } from 'drizzle-orm';

export const identifyRouter = router({
  /**
   * Link anonymous identity to authenticated user
   * Called on login/signup
   */
  identify: protectedProcedure
    .input(z.object({
      anonymousId: z.string(),

      // Inferred signals (captured while anonymous)
      gitIntelligence: z.object({
        organization: z.string().nullable(),
        platform: z.string(),
        teamSize: z.string(),
        authorName: z.string().nullable(),
        authorEmail: z.string().nullable(),
      }),

      roleInference: z.object({
        seniority: z.string(),
        role: z.string(),
        confidence: z.number(),
      }).optional(),

      // First seen timestamp (for funnel analysis)
      firstSeenAt: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { userId, email } = ctx;

      // 1. Create anonymous profile snapshot (for cohort analysis)
      await db.insert(anonymousProfiles).values({
        anonymousId: input.anonymousId,
        organization: input.gitIntelligence.organization,
        teamSize: input.gitIntelligence.teamSize,
        role: input.roleInference?.role || 'unknown',
        firstEventAt: new Date(input.firstSeenAt),
        linkedAt: new Date(),
      }).onConflictDoNothing();

      // 2. Find all prior events with this anonymousId
      const priorEvents = await db
        .select({ id: telemetryEvents.id })
        .from(telemetryEvents)
        .where(eq(telemetryEvents.anonymousId, input.anonymousId));

      // 3. Re-attribute all events to authenticated user
      await db
        .update(telemetryEvents)
        .set({
          userId,
          email,
          authenticatedAt: new Date(),
          convertedFromAnonymous: true,

          // Enrich with verified metadata
          gitAuthorName: input.gitIntelligence.authorName,
          gitAuthorEmail: input.gitIntelligence.authorEmail,
          organization: input.gitIntelligence.organization,
        })
        .where(eq(telemetryEvents.anonymousId, input.anonymousId));

      // 4. Update or create user profile
      await db
        .insert(users)
        .values({
          userId,
          email,
          firstSeenAt: new Date(input.firstSeenAt),
          authenticatedAt: new Date(),
          gitAuthorName: input.gitIntelligence.authorName,
          gitAuthorEmail: input.gitIntelligence.authorEmail,
          organization: input.gitIntelligence.organization,
          enrollmentSource: 'extension',
          daysFromFirstSeenToLogin: Math.floor(
            (Date.now() - input.firstSeenAt) / (1000 * 60 * 60 * 24)
          ),
        })
        .onConflictDoUpdate({
          target: users.userId,
          set: {
            authenticatedAt: new Date(),
            organization: input.gitIntelligence.organization,
          },
        });

      // 5. Send to PostHog with alias
      await posthog.alias({
        distinctId: userId,
        alias: input.anonymousId,
      });

      return {
        success: true,
        eventsLinked: priorEvents.length,
        daysToConversion: Math.floor(
          (Date.now() - input.firstSeenAt) / (1000 * 60 * 60 * 24)
        ),
      };
    }),
});
5. Enhanced Event Schema with Anonymous Support
typescript// packages/contracts/src/telemetry/events.v3.ts

import { z } from 'zod';

/**
 * Base event schema that works for both anonymous and authenticated users
 */
export const BaseEventSchema = z.object({
  // Identity (one or the other, or both during/after conversion)
  anonymousId: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string(),

  // Timestamp
  timestamp: z.number(),

  // Context (always captured)
  context: z.object({
    // Device/workspace
    deviceId: z.string(),
    workspaceId: z.string(),

    // Environment
    extensionVersion: z.string(),
    vscodeVersion: z.string(),
    platform: z.enum(['darwin', 'linux', 'win32']),

    // Inferred signals (captured passively)
    inferred: z.object({
      organization: z.string().nullable(),
      teamSize: z.enum(['solo', 'small', 'medium', 'large', 'unknown']),
      seniority: z.enum(['junior', 'mid', 'senior', 'lead', 'unknown']),
      platform: z.enum(['github', 'gitlab', 'bitbucket', 'azure', 'self-hosted', 'unknown']),
    }).optional(),
  }),
});

/**
 * All events extend base with specific properties
 */
export const EventSchemas = {
  // Extension lifecycle
  extension_activated: BaseEventSchema.extend({
    event: z.literal('extension_activated'),
    properties: z.object({
      activationTime: z.number(),
      workspaceSize: z.number().optional(),
      isRemoteWorkspace: z.boolean(),
    }),
  }),

  // AI detection
  ai_code_detected: BaseEventSchema.extend({
    event: z.literal('ai_code_detected'),
    properties: z.object({
      aiTool: z.enum(['claude_code', 'cursor', 'github_copilot', 'cline', 'unknown']),
      detectionMethod: z.enum(['extension', 'metadata', 'pattern', 'heuristic']),
      confidence: z.number().min(0).max(1),
      linesOfCode: z.number(),
      fileType: z.string(),
    }),
  }),

  // Suggestion lifecycle
  ai_suggestion_action: BaseEventSchema.extend({
    event: z.literal('ai_suggestion_action'),
    properties: z.object({
      suggestionId: z.string(),
      aiTool: z.enum(['claude_code', 'cursor', 'github_copilot', 'cline', 'unknown']),
      action: z.enum(['accepted', 'rejected', 'modified', 'ignored']),
      latencyMs: z.number(),
      modificationRatio: z.number().min(0).max(1).optional(),
      fileType: z.string(),
      linesOfCode: z.number(),
    }),
  }),

  // Snapshot/rollback
  snapshot_created: BaseEventSchema.extend({
    event: z.literal('snapshot_created'),
    properties: z.object({
      snapshotId: z.string(),
      trigger: z.enum(['auto', 'manual', 'ai-detected', 'pre-save']),
      filesCount: z.number(),
      totalBytes: z.number(),
      aiToolsInvolved: z.array(z.string()),
      latencyMs: z.number(),
    }),
  }),

  snapshot_restored: BaseEventSchema.extend({
    event: z.literal('snapshot_restored'),
    properties: z.object({
      snapshotId: z.string(),
      reason: z.object({
        category: z.enum(['bug', 'security', 'performance', 'architecture', 'style', 'user_preference']),
        severity: z.enum(['critical', 'high', 'medium', 'low']),
        aiGenerated: z.boolean(),
        aiTool: z.string().optional(),
      }),
      filesRestored: z.number(),
      timeSinceCreationMs: z.number(),
    }),
  }),

  // Conversion moment
  conversion_triggered: BaseEventSchema.extend({
    event: z.literal('conversion_triggered'),
    properties: z.object({
      trigger: z.enum(['rollback_detected', 'value_shown', 'dashboard_viewed', 'manual_signup']),
      anonymousEventCount: z.number(),
      daysSinceInstall: z.number(),
    }),
  }),
};
```

---

## Invisible by Default, Visible on Demand

Here's how this maintains your core philosophy:

### What Happens Invisibly (No User Awareness)
```
Extension Activation
├── Generate/retrieve anonymous identity
├── Extract git intelligence (read .git/config)
├── Start passive event collection
├── AI detection on every file change
└── All data enriched with inferred context

File Saves
├── AI code detection (pattern + extension)
├── Suggestion tracking (if AI tool active)
├── Snapshot creation (if protected)
└── Events sent with full context

Background (Every 30s)
├── Batch pending events
├── Compress and send
└── No user-visible indicators
```

### What Becomes Visible (User Opt-In)
```
Extension WebView (On Demand)
├── Commit analysis panel
├── AI attribution on current file
├── Rollback summary after restore
└── "Learn more" → Dashboard

Web Dashboard (Login Required)
├── Acceptance rates by tool
├── Rollback analysis
├── Team comparison
└── Full metrics suite

Status Bar (Minimal)
├── Small icon indicating protection
├── Click → WebView
└── No notifications unless rollback

Implementation Priority
Phase 1: Foundation (Demo-Critical)
ComponentEffortImpactAnonymousIdentityServiceSRequired for all trackingGitIntelligenceService (passive)MPre-fills user contextEnhanced event schemasSEnables new metricsRetroactive linkage APIMConversion tracking
Phase 2: Intelligence (Week 2)
ComponentEffortImpactRoleInferenceServiceMSegmentationConfidence scoring systemSQuality metricsPre-auth dashboard viewLConversion optimization
Phase 3: Refinement (Month 1)
ComponentEffortImpactAdvanced AI tool detectionMBetter attributionBehavioral cohort analysisLGrowth insightsCommitment gate UISConversion nudge

Key Insight for Your "Invisible" Philosophy
The research validates your approach perfectly:

"Everything is trackable to identity, but operates beautifully in anonymous mode first."

This means:

No login wall - Full functionality works immediately
No forms - Everything inferred from environment
No interruptions - Events collected silently
Value first - Show insights before asking for anything
Conversion at moment of truth - Ask for signup only when they've seen value (rollback prevented)

The only visible surface is opt-in dashboards where they actively choose to see their metrics. The protection layer remains completely invisible until they want to see it.
