# Setup & Testing Guides
**Consolidated from**: setup_guides & testing_docs directories | **Date**: December 2025
**Purpose**: Environment setup, configuration, and testing strategies

---

## Part 1: Quick Start (Get Running in 15 Minutes)

### Prerequisites
- **Node.js** 20.11.0+ (check: `node --version`)
- **pnpm** 10.14.0+ (install: `npm install -g pnpm`)
- **Docker** 24+ (for Docker development)
- **Git** (for version control)

### Step 1: Clone & Install (5 min)
```bash
git clone https://github.com/snapback-io/snapback.git
cd SnapBack-Site
pnpm install
```

### Step 2: Configure Environment (3 min)
```bash
# Copy example environment file
cp .env.example .env.local

# Add your secrets (minimal set to run locally):
cat >> .env.local << EOF
NEXTAUTH_SECRET=your-secret-key-here
DATABASE_URL=sqlite://./snapback.db
API_URL=http://localhost:3001
EOF
```

### Step 3: Start Development (2 min)
```bash
# Terminal 1: Start web app + API
pnpm dev

# Terminal 2: Run tests (optional)
pnpm test:watch
```

**You're Done!**
- Web app: http://localhost:3000
- API: http://localhost:3001

---

## Part 2: Environment Variables Reference

### Critical Variables (Must Set)

| Variable | Purpose | Example | Source |
|----------|---------|---------|--------|
| **NEXTAUTH_SECRET** | Session encryption | `abc123...def456` | Generate: `openssl rand -hex 16` |
| **NEXTAUTH_URL** | Auth callback URL | `http://localhost:3000` | Your domain |
| **DATABASE_URL** | Database connection | `postgresql://user:pass@localhost/snapback` | Database admin |
| **API_URL** | Backend API endpoint | `http://localhost:3001` | Your API host |

### Optional Variables (Recommended)

| Variable | Purpose | Default | Options |
|----------|---------|---------|---------|
| **SENTRY_DSN** | Error tracking | undefined | Get from sentry.io |
| **POSTHOG_KEY** | Analytics | undefined | Get from posthog.com |
| **NODE_ENV** | Environment | development | production, staging |
| **LOG_LEVEL** | Logging detail | info | debug, info, warn, error |

### Feature Flags

| Variable | Purpose | Default |
|----------|---------|---------|
| **FEATURE_DETECTION** | Enable AI detection | true |
| **FEATURE_CLUSTERING** | Enable DBSCAN | true |
| **FEATURE_ANALYTICS** | Enable PostHog | false |

### Performance Tuning

| Variable | Purpose | Default | Range |
|----------|---------|---------|-------|
| **CACHE_TTL_SECONDS** | Cache duration | 3600 | 60-86400 |
| **RATELIMIT_REQUESTS_PER_HOUR** | Rate limit | 1000 | 100-10000 |
| **DATABASE_POOL_SIZE** | Connection pool | 10 | 5-50 |

### By Priority

**Priority 1 - Core Functionality**:
```bash
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=sqlite://./snapback.db
API_URL=http://localhost:3001
```

**Priority 2 - Monitoring** (optional but recommended):
```bash
SENTRY_DSN=https://...@sentry.io/...
POSTHOG_KEY=phc_...
```

**Priority 3 - Fine Tuning** (advanced):
```bash
CACHE_TTL_SECONDS=3600
LOG_LEVEL=debug
```

---

## Part 3: Installation Patterns

### Pattern 1: Fresh Local Development

```bash
# Clone repo
git clone https://github.com/snapback-io/snapback.git
cd SnapBack-Site

# Install dependencies (monorepo)
pnpm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your values

# Start development
pnpm dev
```

### Pattern 2: Docker Development

```bash
# Start with Docker Compose
docker-compose -f docker-compose.dev.yml up

# In another terminal
docker-compose exec web pnpm dev
docker-compose exec api pnpm dev
```

### Pattern 3: CI/CD Pipeline (GitHub Actions)

```bash
# Install in CI
pnpm install --frozen-lockfile

# Build
pnpm build

# Test
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint
```

---

## Part 4: Testing Strategy (TDD-Aligned)

### Test Pyramid

```
        ▲
       /  \ Unit Tests (60%)
      /────\
     /      \ Integration (25%)
    /────────\
   /          \ E2E (15%)
  /────────────\
```

### Unit Tests (60% of coverage)

**Pattern**: Test individual functions in isolation
```typescript
// src/lib/detection.test.ts
import { detectRisk } from './detection';

describe('Risk Detection', () => {
  it('should detect high-risk patterns', () => {
    const result = detectRisk('hardcoded_password');
    expect(result.level).toBe('high');
  });

  it('should ignore benign code', () => {
    const result = detectRisk('const message = "hello"');
    expect(result.level).toBe('low');
  });
});
```

**Run**:
```bash
pnpm test              # Run all tests
pnpm test:watch      # Watch mode
pnpm test:coverage   # Coverage report
```

### Integration Tests (25% of coverage)

**Pattern**: Test multiple components together
```typescript
// src/services/snapshot.test.ts
import { SnapshotService } from './snapshot-service';
import { MockStorage } from '../__mocks__/storage';

describe('SnapshotService', () => {
  let service: SnapshotService;

  beforeEach(() => {
    service = new SnapshotService(new MockStorage());
  });

  it('should create and retrieve snapshots', async () => {
    const snapshot = await service.create({
      filePath: '/test/file.ts',
      content: 'const x = 1;',
    });

    const retrieved = await service.getById(snapshot.id);
    expect(retrieved).toEqual(snapshot);
  });
});
```

**Run**:
```bash
pnpm test -- --include='**/*.integration.test.ts'
```

### E2E Tests (15% of coverage)

**Pattern**: Test complete user workflows
```typescript
// e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test('user can create and view snapshot', async ({ page }) => {
  // Navigate to app
  await page.goto('http://localhost:3000/dashboard');

  // Create snapshot
  await page.click('button:has-text("New Snapshot")');
  await page.fill('input[name="filePath"]', '/test/file.ts');
  await page.click('button:has-text("Create")');

  // Verify snapshot appears in list
  await expect(page.locator('text=/test/file.ts')).toBeVisible();
});
```

**Run**:
```bash
pnpm test:e2e
pnpm test:e2e --debug
```

### Coverage Requirements

**Minimums by Category**:
- **API endpoints**: 80%+
- **Business logic**: 75%+
- **Utilities**: 70%+
- **Components**: 60%+
- **Overall**: 70%+

**View Coverage**:
```bash
pnpm test:coverage
open coverage/index.html
```

---

## Part 5: TDD Workflow

### Development Cycle

```
1. Write Test (Red)
   ↓
2. Write Minimal Code (Green)
   ↓
3. Refactor (Refactor)
   ↓
4. Commit & Continue
```

**Example TDD Session**:

```bash
# Step 1: Write test (will fail)
cat > src/utils/format.test.ts << 'EOF'
import { formatDate } from './format';

it('should format date to YYYY-MM-DD', () => {
  expect(formatDate(new Date('2025-01-15'))).toBe('2025-01-15');
});
EOF

# Step 2: Run test (RED - fails)
pnpm test format.test.ts

# Step 3: Write minimal code
cat > src/utils/format.ts << 'EOF'
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
EOF

# Step 4: Run test (GREEN - passes)
pnpm test format.test.ts

# Step 5: Refactor if needed
# (extract constants, simplify logic, etc.)

# Step 6: Commit
git add src/utils/format.{ts,test.ts}
git commit -m "feat: add formatDate utility"
```

---

## Part 6: Test Organization

### File Structure
```
src/
├── services/
│   ├── snapshot.ts
│   ├── snapshot.test.ts       # Unit test
│   ├── snapshot.integration.test.ts  # Integration test
│   └── __mocks__/
│       └── storage.ts         # Mock dependencies
├── lib/
│   ├── detection.ts
│   └── detection.test.ts
```

### Test Naming Convention
```
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange
      const input = ...;

      // Act
      const result = methodName(input);

      // Assert
      expect(result).toBe(...);
    });
  });
});
```

---

## Part 7: Continuous Integration (GitHub Actions)

**Automated on Every Push**:
- ✅ Install dependencies
- ✅ Run linter (Biome)
- ✅ Type check (TypeScript)
- ✅ Run tests (Vitest)
- ✅ Build (Turbo)
- ✅ Build Docker images

**Automated on Pull Request**:
- ✅ All above checks
- ✅ E2E tests (Playwright)
- ✅ Code coverage report
- ✅ Lighthouse performance audit

**Automated on Merge to Main**:
- ✅ Deploy to staging (Vercel)
- ✅ Deploy to production (if tagged)
- ✅ Generate release notes

---

## Part 8: Debugging Tips

### Visual Studio Code Setup

**Debug Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Next.js",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/next",
      "args": ["dev"],
      "console": "integratedTerminal"
    },
    {
      "name": "Jest",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Browser DevTools

```typescript
// Add debug breakpoints
debugger; // Execution pauses here when DevTools open

// Console logging
console.log('snapshot:', snapshot);
console.table([snapshot1, snapshot2]); // Table view

// Inspect element
const element = document.querySelector('.snapshot-card');
console.log(element);
```

### Server-Side Debugging

```bash
# Run with debug output
DEBUG=* pnpm dev

# Run with Node inspector
node --inspect ./node_modules/.bin/next dev
# Then open chrome://inspect in Chrome DevTools
```

---

## Part 9: Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| `pnpm install` fails | Missing Node.js | Install Node 20.11.0+ |
| Tests timeout | Slow database | Use SQLite for tests |
| Turbo cache miss | Config changed | Run `turbo build --force` |
| Docker build fails | Non-existent package | See P1.1 in IMPLEMENTATION_GUIDES.md |
| Port already in use | Another process | `lsof -i :3000` then kill |

---

## References

- **Environment Setup**: See `.env.example` for all variables
- **Testing Docs**: See TESTING_IMPLEMENTATION_GUIDE.md (legacy)
- **Docker Setup**: See INFRASTRUCTURE_AND_DEPLOYMENT.md
- **GitHub Actions**: See `.github/workflows/` directory

**Alignment**: Supporting PHASE 3 (MIGRATE) testing and validation
