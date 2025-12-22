# @snapback/github-action

GitHub Action for SnapBack Guardian - automated code analysis for pull requests.

## Overview

**SnapBack Guardian** is a GitHub Action that analyzes pull request diffs and detects potential issues before they're merged. It:

- **Analyzes PR diffs** for code quality and security issues
- **Comments findings** directly on PRs for developer visibility
- **Fails checks on criticals** to prevent risky merges (configurable)
- **Integrates seamlessly** with GitHub workflows
- **Offline support** for CI/CD environments without internet access

## Quick Start

### Basic Usage

Add to your workflow (`.github/workflows/snapback.yml`):

```yaml
name: SnapBack Guardian

on: [pull_request]

jobs:
  guardian:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Run SnapBack Guardian
        uses: snapback/github-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          fail-on-critical: true
```

### With Custom Configuration

```yaml
- name: Run SnapBack Guardian
  uses: snapback/github-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    fail-on-critical: true
  env:
    SNAPBACK_API_KEY: ${{ secrets.SNAPBACK_API_KEY }}
    SNAPBACK_RULES: critical,security,performance
```

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github-token` | Yes | - | GitHub token for PR access and commenting |
| `fail-on-critical` | No | `true` | Fail the check if critical findings detected |

## Outputs

The action produces GitHub Check annotations visible in:
- PR checks list
- PR file-specific annotations
- GitHub Actions logs

Example output format:

```
## SnapBack Guardian Findings

### src/app.ts:42
**Severity:** Critical (8/10)
**Message:** Hardcoded secret key detected
**Suggestion:** Move to environment variables or use a secrets manager
```

## How It Works

### PR Analysis Flow

```
1. Trigger: Pull request opened/updated
   ↓
2. Fetch: Get PR diff from GitHub API
   ↓
3. Analyze: Run Guardian analysis on changed code
   ↓
4. Comment: Post findings as PR comment
   ↓
5. Check: Fail if critical issues found (if enabled)
   ↓
6. Report: Display results in GitHub UI
```

### Severity Levels

| Level | Range | Action | Example |
|-------|-------|--------|---------|
| Low | 0-3 | Info only | Minor style issue |
| Medium | 4-6 | Warning | Possible null pointer |
| High | 7-8 | Attention | Security concern |
| Critical | 9-10 | Fail | Hardcoded credentials |

### Finding Types

- **Security Issues**: Hardcoded secrets, SQL injection risks, auth bypasses
- **Performance**: N+1 queries, memory leaks, inefficient algorithms
- **Code Quality**: Type errors, null checks, error handling gaps
- **Best Practices**: Deprecated APIs, unsafe patterns, code smells

## Configuration

### Environment Variables

```bash
# Optional: SnapBack API key for enhanced analysis
SNAPBACK_API_KEY=sk_...

# Optional: Specific rule categories to check
SNAPBACK_RULES=critical,security,performance

# Optional: API endpoint (for self-hosted Guardian)
SNAPBACK_API_URL=https://guardian.example.com

# Optional: Minimum severity to fail on
SNAPBACK_MIN_SEVERITY=7
```

### Per-Repository Filtering

Create `.snapback/guardian.config.json`:

```json
{
  "enabled": true,
  "failOnCritical": true,
  "excludeFiles": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "dist/**",
    "node_modules/**"
  ],
  "rules": {
    "security": "error",
    "performance": "warn",
    "style": "off"
  },
  "ignorePatterns": [
    "// @snapback-ignore",
    "// @guardian-skip"
  ]
}
```

### Workflow Conditions

Run Guardian only on specific conditions:

```yaml
jobs:
  guardian:
    if: github.event.pull_request.draft == false
    runs-on: ubuntu-latest
    steps:
      - uses: snapback/github-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Advanced Usage

### Multiple Severity Levels

```yaml
- name: Run Guardian - Fail on Critical
  uses: snapback/github-action@v1
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    fail-on-critical: true
  continue-on-error: false

- name: Run Guardian - Warn on High
  if: failure()
  run: echo "High severity issues detected - review PR"
```

### Integration with Other Checks

```yaml
jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Type Check
        run: pnpm type-check

      - name: Lint
        run: pnpm lint

      - name: Guardian Analysis
        uses: snapback/github-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          fail-on-critical: true

      - name: Tests
        run: pnpm test
```

### Custom Comment Format

The action respects code comments to suppress findings:

```typescript
// @snapback-ignore: Security false positive - sanitized input
const query = unsafeQuery();

// @guardian-skip: Performance not critical for this PR
const unoptimized = processLargeArray();
```

## Viewing Results

### In GitHub UI

1. **PR Checks**: See "SnapBack Guardian" in checks section
2. **Files Changed**: View inline annotations on affected files
3. **PR Comment**: Review summary of all findings
4. **Check Details**: Click through for severity breakdown

### In GitHub Actions Logs

```
Run SnapBack Guardian v1.0.0
  Guardian analysis: 5 findings
  - 2 critical (failed check)
  - 1 high
  - 2 medium

  Critical findings:
  1. src/auth.ts:42 - Hardcoded API key
  2. src/db.ts:78 - SQL injection risk

  Action result: FAILED
```

## Troubleshooting

### "This action only works on pull requests"

**Cause**: Action triggered on a non-PR event
**Solution**: Ensure workflow triggers on `pull_request` events

```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
```

### No findings reported but expected

**Cause**: PR too small, or rules disabled
**Solution**: Check Guardian configuration and rule levels

```bash
# Debug: Enable verbose logging
GUARDIAN_DEBUG=true
```

### False positives in findings

**Use code comments to suppress**:

```typescript
// @snapback-ignore: This is a false positive - X is safe because Y
```

### Performance issues with large PRs

**Strategies**:
1. Exclude large files: `excludeFiles` in config
2. Limit analysis scope: `SNAPBACK_RULES` env var
3. Use timeout settings in workflow

## Development

### Getting Started

```bash
# Install dependencies
pnpm install

# Build the action
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check
```

### Project Structure

```
packages/github-action/
├── index.js              # Main action entry point
├── action.yml            # Action metadata
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── vitest.config.ts      # Test configuration
├── dist/                 # Compiled output
│   └── index.js         # Bundled action
└── test/                 # Test files (if present)
```

### Testing

```bash
# Run all tests
pnpm test

# With coverage
pnpm test --coverage

# Watch mode
pnpm test --watch

# Integration tests (simulated GitHub environment)
pnpm test:int
```

### Building for Distribution

```bash
# Build and bundle the action
npm run build

# Update dist/index.js with changes
npm run prepare

# Commit to repository
git add .
git commit -m "Update action"
git push
```

## GitHub Actions Specifications

### Metadata

- **Icon**: Shield (security focus)
- **Color**: Blue (trust/reliability)
- **Runtime**: Node.js 16+
- **Entry Point**: `index.js`

### Permissions

The action needs:

```yaml
permissions:
  pull-requests: write    # To comment on PRs
  statuses: write         # To set check status
  checks: write          # To create check runs
```

### Marketplace

Published on [GitHub Marketplace](https://github.com/marketplace/actions/snapback-guardian)

**Keywords**: security, code-analysis, guardian, pull-request, checks

## Performance Characteristics

| Metric | Typical | Maximum |
|--------|---------|---------|
| Startup | ~2s | ~5s |
| Analysis per 100 lines | ~1s | ~3s |
| PR comment | ~1s | ~2s |
| Total (small PR) | ~5s | ~10s |
| Total (large PR) | ~15s | ~30s |

## Integrations

### Pre-existing GitHub Apps

The action works alongside:
- Dependabot
- CodeQL (GitHub's security scanner)
- Renovate
- Pre-commit hooks

### CI/CD Platforms

Use from any platform supporting GitHub Actions webhooks:
- GitHub Actions (native)
- Gitea Actions (compatible)
- Act (local testing)

## Security Considerations

1. **Secrets**: GitHub token is secure in GitHub Actions environment
2. **API Keys**: Store additional keys in GitHub Secrets
3. **Logs**: Sensitive data is masked in logs by default
4. **Data**: PR diffs are analyzed locally when possible

## Limitations

- **Diff-only**: Analyzes only changed code, not full codebase
- **Context**: Limited to PR context, no project-wide analysis
- **Real-time**: Runs async, not blocking (by design)
- **Offline**: Requires GitHub connectivity (API calls)

## Contributing

To contribute to the GitHub Action:

1. Test locally with `act` or Docker
2. Update `index.js` for changes
3. Test in actual GitHub PR
4. Update `action.yml` if inputs changed
5. Submit PR with testing details

### Local Testing with `act`

```bash
# Install act: https://github.com/nektos/act

# Test workflow locally
act pull_request \
  -j guardian \
  -e events/pull_request.json \
  -s GITHUB_TOKEN=ghp_xxx
```

## Release Process

Versions follow [Semantic Versioning](https://semver.org):

1. **v1.x.x**: Stable releases
2. **v1**: Latest v1 (points to latest v1.x.x)
3. **latest**: Latest release

Example workflow usage:

```yaml
uses: snapback/github-action@v1          # Latest v1
uses: snapback/github-action@v1.2.3      # Specific version
uses: snapback/github-action@main        # Latest development
```

## Resources

- **Action Docs**: [GitHub Actions Documentation](https://docs.github.com/actions)
- **SnapBack Docs**: [Main Documentation](/docs)
- **Guardian Spec**: [Guardian Specification](../../../docs/mcp/index.md)
- **Contributing**: [How to Contribute](/docs/contributing)

## License

Proprietary - SnapBack GitHub Action is not open source
