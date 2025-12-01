# SnapBack SDK Troubleshooting Guide

Common issues, solutions, and diagnostic procedures for the SnapBack SDK.

## Quick Diagnosis

Run this to check SDK health:

```typescript
import { Snapback, THRESHOLDS } from '@snapback/sdk'

async function diagnose() {
  console.log('SDK Version:', require('@snapback/sdk/package.json').version)
  console.log('THRESHOLDS:', THRESHOLDS)
  console.log('Node Version:', process.version)
}
```

---

## Common Issues

### Issue: "Module not found" errors

**Symptoms:**
- `Cannot find module '@snapback/sdk'`
- `Cannot find module '@snapback/contracts'`

**Solutions:**

1. **Ensure dependencies are installed**
   ```bash
   pnpm install @snapback/sdk @snapback/contracts
   ```

2. **Check tsconfig paths**
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "bundler",
       "paths": {
         "@snapback/*": ["../snapback-monorepo/packages/*/src"]
       }
     }
   }
   ```

3. **Build in correct order**
   ```bash
   pnpm build:deps  # Build dependencies first
   pnpm build       # Then build your project
   ```

---

### Issue: Risk scores are inconsistent

**Symptoms:**
- Same code produces different risk scores
- Risk scores outside 0-10 range
- Blocking threshold not working

**Solutions:**

1. **Verify THRESHOLDS configuration**
   ```typescript
   import { THRESHOLDS } from '@snapback/sdk'

   console.log('Blocking threshold:', THRESHOLDS.risk.blockingThreshold)
   console.log('Should be between 5.0 and 10.0')
   ```

2. **Check for stale THRESHOLDS updates**
   ```typescript
   // ❌ WRONG - Updates don't persist
   THRESHOLDS.risk.blockingThreshold = 8.0

   // ✅ CORRECT - Use updateThresholds()
   import { updateThresholds } from '@snapback/sdk'
   updateThresholds({
     risk: { blockingThreshold: 8.0 }
   })
   ```

3. **Reset to defaults**
   ```typescript
   // Start fresh with default thresholds
   const analyzer = new RiskAnalyzer()
   console.log(analyzer.getThresholds())
   ```

---

### Issue: Snapshots fail to create

**Symptoms:**
- `Error: Snapshot creation failed`
- Storage backend errors
- File system permission errors

**Solutions:**

1. **Check storage directory exists**
   ```typescript
   import * as fs from 'fs/promises'

   try {
     await fs.mkdir('/path/to/.snapback/storage', { recursive: true })
   } catch (error) {
     console.error('Failed to create storage:', error)
   }
   ```

2. **Verify file permissions**
   ```bash
   # Ensure writable by your process
   chmod -R 755 /path/to/.snapback/storage
   ```

3. **Check disk space**
   ```bash
   df -h /path/to/.snapback
   # Ensure at least 100MB available
   ```

4. **Enable detailed logging**
   ```typescript
   import { logger } from '@snapback/infrastructure'

   logger.debug('Creating snapshot', {
     fileCount: files.length,
     totalSize: getTotalSize(files)
   })
   ```

---

### Issue: Memory usage grows unbounded

**Symptoms:**
- Memory leak warning
- Out of memory errors
- Process crashes after many snapshots

**Solutions:**

1. **Check cache configuration**
   ```typescript
   const limits = {
     maxSnapshots: THRESHOLDS.resources.snapshotMaxSnapshots,
     dedupCacheSize: THRESHOLDS.resources.dedupCacheSize
   }

   // Default 500 snapshots, adjust if needed
   updateThresholds({
     resources: { snapshotMaxSnapshots: 100 }
   })
   ```

2. **Implement cleanup**
   ```typescript
   async function cleanupOldSnapshots() {
     const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days
     const snapshots = await sdk.listSnapshots()

     for (const s of snapshots) {
       if (s.timestamp < cutoff) {
         await sdk.deleteSnapshot(s.id)
       }
     }
   }

   // Run daily
   setInterval(cleanupOldSnapshots, 24 * 60 * 60 * 1000)
   ```

3. **Monitor heap usage**
   ```typescript
   const { heapUsed, heapTotal } = process.memoryUsage()
   const percentUsed = (heapUsed / heapTotal) * 100

   if (percentUsed > 90) {
     logger.warn('High memory usage', { percentUsed })
     // Trigger cleanup
   }
   ```

---

### Issue: Risk analysis missing patterns

**Symptoms:**
- Dangerous code not detected
- Risk score too low
- False negatives

**Solutions:**

1. **Verify pattern detection**
   ```typescript
   const analyzer = new RiskAnalyzer()
   const result = analyzer.analyze('eval(userInput)')

   console.log('Detected patterns:', result.factors)
   // Should include 'eval execution'
   ```

2. **Check custom patterns**
   ```typescript
   analyzer.addPattern({
     name: 'custom-danger',
     pattern: /myDangerousFunction/,
     score: 8,
     recommendation: 'Use safe alternative'
   })
   ```

3. **Language-specific patterns**
   ```typescript
   // Patterns should detect across languages
   const patterns = [
     'eval', 'exec', 'Function(',    // JS
     'eval', 'exec', '__import__',   // Python
     'eval', 'system', 'backtick'    // Bash
   ]
   ```

---

### Issue: Snapshot restoration fails

**Symptoms:**
- `Error: Snapshot not found`
- Restored files are empty or corrupted
- Diff application fails

**Solutions:**

1. **Verify snapshot exists**
   ```typescript
   const snapshot = await sdk.getSnapshot(id)

   if (!snapshot) {
     console.error('Snapshot does not exist:', id)
     // List available
     const all = await sdk.listSnapshots()
     console.log('Available:', all.map(s => s.id))
   }
   ```

2. **Check file contents**
   ```typescript
   const snapshot = await sdk.getSnapshot(id)

   if (snapshot?.fileContents) {
     for (const [path, content] of Object.entries(snapshot.fileContents)) {
       console.log(`${path}: ${content.length} bytes`)
     }
   }
   ```

3. **Verify restore permissions**
   ```typescript
   import * as fs from 'fs/promises'

   try {
     await fs.access(targetDir, fs.constants.W_OK)
   } catch {
     console.error('Target directory not writable')
   }
   ```

4. **Try dry-run restore**
   ```typescript
   const result = await sdk.restoreSnapshot(id, targetDir, {
     dryRun: true  // Validate without writing
   })

   if (isErr(result)) {
     console.error('Restore would fail:', result.error)
   }
   ```

---

### Issue: Session tracking not working

**Symptoms:**
- Sessions not created
- Events not recorded
- Metrics missing

**Solutions:**

1. **Verify session coordinator**
   ```typescript
   import { SessionCoordinator } from '@snapback/sdk'

   const coord = new SessionCoordinator()
   const session = coord.createSession({ userId: 'user1' })

   console.log('Session created:', session.id)
   ```

2. **Record events properly**
   ```typescript
   coord.recordEvent(session.id, {
     type: 'file-change',
     path: 'app.ts',
     timestamp: Date.now()
   })
   ```

3. **Finalize and check metrics**
   ```typescript
   const metrics = coord.finalizeSession(session.id)
   console.log('Metrics:', metrics)
   // Should include duration, eventCount, etc.
   ```

---

## Performance Troubleshooting

### Slow Snapshot Creation

```typescript
const start = performance.now()
const result = await sdk.createSnapshot(files)
const elapsed = performance.now() - start

if (elapsed > 1000) {
  console.warn('Slow snapshot creation', {
    elapsed,
    fileCount: files.length,
    totalSize: getTotalSize(files)
  })
}
```

**Check:**
1. File count (limit to 500)
2. File sizes (limit to 10MB each)
3. Storage I/O (disk speed)
4. Network (if remote storage)

### Slow Risk Analysis

```typescript
const analyzer = new RiskAnalyzer()
const start = performance.now()
const result = analyzer.analyze(largeContent)
const elapsed = performance.now() - start

if (elapsed > 100) {
  console.warn('Slow risk analysis', {
    elapsed,
    contentSize: largeContent.length
  })
}
```

**Check:**
1. Content size (process in chunks > 10MB)
2. Pattern count (too many patterns = slower)
3. Regex complexity (simplify if needed)

---

## Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `SnapshotNotFoundError` | Snapshot ID doesn't exist | Verify ID, list snapshots |
| `StorageError` | Backend failure | Check disk space, permissions |
| `RiskAnalysisError` | Analysis failed | Verify content, check logs |
| `ValidationError` | Invalid input | Check file sizes, paths |
| `OutOfMemoryError` | Heap exceeded | Implement cleanup, reduce batch size |

---

## Getting Help

1. **Check logs** - Enable debug logging for detailed output
2. **Run diagnostics** - Use the diagnosis script above
3. **Search documentation** - See API-REFERENCE.md, MIGRATION.md
4. **GitHub Issues** - https://github.com/SnapBack-Dev/sdk/issues
5. **Email support** - support@snapback.dev

**Last Updated:** 2025-11-20
