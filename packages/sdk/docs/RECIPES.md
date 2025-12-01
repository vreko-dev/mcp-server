# SnapBack SDK Recipes

Common integration patterns and real-world examples for using SnapBack SDK.

## Table of Contents

1. [Git Integration](#git-integration)
2. [CI/CD Pipeline Integration](#cicd-pipeline-integration)
3. [IDE Plugin Integration](#ide-plugin-integration)
4. [Monitoring & Alerting](#monitoring--alerting)
5. [Custom Storage Backends](#custom-storage-backends)

---

## Git Integration

### Auto-Snapshot on Commit

```typescript
import { Snapback } from '@snapback/sdk'
import { LocalStorage } from '@snapback/sdk'
import { simpleGit } from 'simple-git'

async function setupGitHooks(projectDir: string) {
  const storage = new LocalStorage(projectDir)
  const sdk = new Snapback(storage)
  const git = simpleGit(projectDir)

  // Hook into pre-commit to snapshot staged changes
  const preCommitHook = async () => {
    const status = await git.status()

    // Get staged files
    const stagedFiles = [
      ...status.staged.added,
      ...status.staged.modified,
      ...status.staged.deleted
    ]

    // Create snapshot before commit
    const files = await Promise.all(
      stagedFiles.map(async (path) => ({
        path,
        content: await fs.promises.readFile(path, 'utf-8').catch(() => ''),
        action: status.staged.added.includes(path) ? 'add' : 'modify'
      }))
    )

    const result = await sdk.createSnapshot(files)
    if (isErr(result)) {
      console.warn('Snapshot pre-commit failed:', result.error.message)
    }
  }

  // Install hook
  await fs.promises.writeFile(
    `${projectDir}/.git/hooks/pre-commit`,
    `#!/bin/bash\nnode ${__filename}\n`
  )
}
```

### Snapshot on Branch Change

```typescript
async function trackBranchSnapshots(projectDir: string) {
  const storage = new LocalStorage(projectDir)
  const sdk = new Snapback(storage)
  const git = simpleGit(projectDir)

  const previousBranch = await git.revparse(['--abbrev-ref', 'HEAD'])

  // Watch for branch changes
  setInterval(async () => {
    const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD'])

    if (currentBranch !== previousBranch) {
      // Create snapshot before switching branches
      const files = await getWorkingDirectoryFiles(projectDir)
      const result = await sdk.createSnapshot(files)

      if (isErr(result)) return

      console.log(`📸 Snapshot created before switching to ${currentBranch}`)
    }
  }, 5000)
}
```

---

## CI/CD Pipeline Integration

### GitHub Actions

```yaml
name: Snapshot Quality Gate

on: [pull_request]

jobs:
  snapshot-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Analyze with SnapBack
        run: |
          npx snapback-cli analyze \
            --base origin/main \
            --head HEAD \
            --threshold 7.0

      - name: Comment on PR
        if: failure()
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '⚠️ High risk changes detected. Please review.'
            })
```

### GitLab CI

```yaml
snapshot-security:
  image: node:18
  script:
    - npm ci
    - npx snapback-cli analyze
      --threshold 7.0
      --fail-on-high-risk
  allow_failure: false
  only:
    - merge_requests
```

---

## IDE Plugin Integration

### VS Code Status Bar

```typescript
import * as vscode from 'vscode'
import { Snapback } from '@snapback/sdk'

export class SnapshotStatusBar {
  private statusBarItem: vscode.StatusBarItem

  constructor(private sdk: Snapback) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    )
  }

  async updateOnFileChange() {
    vscode.workspace.onDidChangeTextDocument(async (event) => {
      const content = event.document.getText()

      // Quick risk check
      const riskResult = await this.sdk.analyzeRisk({
        added: [],
        modified: [event.document.fileName],
        deleted: []
      })

      if (isErr(riskResult)) return

      const score = riskResult.value.score
      const icon = score > 7 ? '🚫' : score > 5 ? '⚠️' : '✅'

      this.statusBarItem.text = `${icon} Risk: ${score.toFixed(1)}/10`
      this.statusBarItem.show()
    })
  }
}
```

---

## Monitoring & Alerting

### Snapshot Success Rate Tracking

```typescript
interface SnapshotMetrics {
  created: number
  failed: number
  avgDuration: number
  lastError?: Error
}

export class SnapshotMonitoring {
  private metrics: SnapshotMetrics = {
    created: 0,
    failed: 0,
    avgDuration: 0
  }

  async trackSnapshot(operation: () => Promise<void>) {
    const start = performance.now()

    try {
      await operation()
      this.metrics.created++
    } catch (error) {
      this.metrics.failed++
      this.metrics.lastError = error instanceof Error ? error : new Error(String(error))

      // Alert on repeated failures
      if (this.metrics.failed > 5) {
        this.alertOncall({
          severity: 'critical',
          message: `Snapshot failures: ${this.metrics.failed} in last hour`,
          error: this.metrics.lastError
        })
      }
    } finally {
      const duration = performance.now() - start
      this.metrics.avgDuration =
        (this.metrics.avgDuration + duration) / 2
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.created /
        (this.metrics.created + this.metrics.failed)
    }
  }

  private alertOncall(alert: { severity: string; message: string; error?: Error }) {
    // Send to monitoring service (Datadog, New Relic, etc.)
    logger.error(alert.message, alert.error)
  }
}
```

---

## Custom Storage Backends

### S3 Storage

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import type { StorageAdapter, Snapshot } from '@snapback/sdk'

export class S3Storage implements StorageAdapter {
  private s3: S3Client

  constructor(private bucket: string, region: string) {
    this.s3 = new S3Client({ region })
  }

  async create(snapshot: Snapshot): Promise<Snapshot> {
    const key = `snapshots/${snapshot.id}/metadata.json`

    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: JSON.stringify(snapshot),
      ContentType: 'application/json'
    }))

    return snapshot
  }

  async get(id: string): Promise<Snapshot | null> {
    try {
      const response = await this.s3.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: `snapshots/${id}/metadata.json`
      }))

      const body = await response.Body?.transformToString()
      return body ? JSON.parse(body) : null
    } catch {
      return null
    }
  }

  async list(): Promise<Snapshot[]> {
    // List all snapshots in S3 bucket
    // Implementation omitted for brevity
    return []
  }

  async delete(id: string): Promise<void> {
    // Delete from S3
  }

  async save(snapshot: Snapshot): Promise<void> {
    await this.create(snapshot)
  }
}

// Usage
const storage = new S3Storage('my-snapshots', 'us-east-1')
const sdk = new Snapback(storage)
```

### Redis Cache Layer

```typescript
import Redis from 'ioredis'
import type { StorageAdapter, Snapshot } from '@snapback/sdk'

export class CachedStorage implements StorageAdapter {
  private redis: Redis

  constructor(
    private primary: StorageAdapter,
    redisUrl: string
  ) {
    this.redis = new Redis(redisUrl)
  }

  async get(id: string): Promise<Snapshot | null> {
    // Try cache first
    const cached = await this.redis.get(`snapshot:${id}`)
    if (cached) return JSON.parse(cached)

    // Fall back to primary storage
    const snapshot = await this.primary.get(id)
    if (snapshot) {
      // Cache for 1 hour
      await this.redis.setex(
        `snapshot:${id}`,
        3600,
        JSON.stringify(snapshot)
      )
    }

    return snapshot
  }

  async create(snapshot: Snapshot): Promise<Snapshot> {
    const result = await this.primary.create(snapshot)

    // Invalidate cache
    await this.redis.del(`snapshot:${snapshot.id}`)

    return result
  }

  // Other methods delegate to primary storage
  async list() { return this.primary.list() }
  async delete(id) {
    await this.redis.del(`snapshot:${id}`)
    return this.primary.delete(id)
  }
  async save(snapshot) { return this.primary.save(snapshot) }
}
```

---

**Last Updated:** 2025-11-20
