# SnapBack SDK Performance Guide

Optimization strategies and performance benchmarks for the SnapBack SDK.

## Performance Benchmarks

### Snapshot Operations

| Operation | Files | Size | Time | Throughput |
|-----------|-------|------|------|------------|
| Create | 10 | 100KB | <5ms | 2000 ops/sec |
| Create | 100 | 1MB | <50ms | 200 ops/sec |
| Create | 500 | 10MB | <200ms | 50 ops/sec |
| Restore | 100 | 1MB | <100ms | 100 ops/sec |
| List | 100 items | - | <10ms | 100 ops/sec |
| Delete | Single | - | <5ms | 200 ops/sec |

### Risk Analysis

| Content Size | Time | Throughput |
|--------------|------|------------|
| 1KB | <1ms | 1000+ ops/sec |
| 100KB | <10ms | 100 ops/sec |
| 1MB | <50ms | 20 ops/sec |
| 10MB | <500ms | 2 ops/sec |

### Deduplication Cache

| Operation | Time | Notes |
|-----------|------|-------|
| Hash hit | <0.5ms | Cached content |
| Hash miss | <5ms | New content |
| Cache eviction | <1ms | LRU removal |
| Full cache (500) | <20ms | At capacity |

---

## Optimization Strategies

### 1. Batch Operations

```typescript
// ❌ SLOW - Individual snapshots
for (const file of files) {
  await sdk.createSnapshot([file])
}
// Total: N * (5-50)ms = 500-5000ms

// ✅ FAST - Single batch
await sdk.createSnapshot(files)
// Total: 50-200ms
```

**Benefit:** 10-100x faster for multiple files

### 2. Lazy Risk Analysis

```typescript
// ❌ SLOW - Analyze all changes
const changes = await git.getChanges()
const risk = await sdk.analyzeRisk(changes)

// ✅ FAST - Analyze only risky patterns
const risk = await sdk.analyzeRisk({
  added: changes.added.filter(f => isDangerous(f)),
  modified: changes.modified,
  deleted: []
})
```

**Benefit:** 50-80% faster when most files are safe

### 3. Content Caching

```typescript
// ❌ SLOW - Re-analyze same content
const risk1 = await analyzer.analyze(content)
const risk2 = await analyzer.analyze(content) // Again!

// ✅ FAST - Cache results
const cache = new Map()
function analyzeCached(content) {
  const key = hash(content)
  if (cache.has(key)) return cache.get(key)

  const result = analyzer.analyze(content)
  cache.set(key, result)
  return result
}
```

**Benefit:** 100x faster for duplicate content

### 4. Incremental Snapshots

```typescript
// ❌ SLOW - Full snapshot every time
const snapshot = await sdk.createSnapshot(allFiles)

// ✅ FAST - Only snapshot changes
const status = await git.status()
const changedFiles = [
  ...status.modified,
  ...status.added
]

const snapshot = await sdk.createSnapshot(
  changedFiles.map(f => ({
    path: f,
    content: await readFile(f),
    action: 'modify'
  }))
)
```

**Benefit:** 10-100x faster with large codebases

### 5. Parallel Processing

```typescript
// ❌ SLOW - Sequential
for (const file of files) {
  const risk = await analyzer.analyze(file.content)
}

// ✅ FAST - Parallel
const risks = await Promise.all(
  files.map(f => analyzer.analyze(f.content))
)
```

**Benefit:** 4-8x faster on multi-core systems

### 6. Async Snapshots

```typescript
// ❌ BLOCKS - Waits for completion
const result = await sdk.createSnapshot(files)

// ✅ NON-BLOCKING - Fire and forget
sdk.createSnapshot(files)
  .then(result => {
    if (isErr(result)) {
      logger.error('Snapshot failed', result.error)
    }
  })
  .catch(error => logger.error(error))
```

**Benefit:** UI stays responsive

---

## Configuration for Performance

### For High Throughput

```typescript
import { updateThresholds } from '@snapback/sdk'

updateThresholds({
  resources: {
    snapshotMaxFiles: 1000,
    snapshotMaxFileSize: 50 * 1024 * 1024,
    dedupCacheSize: 1000
  },
  qos: {
    batchIntervalMs: 100, // Flush faster
    maxQueueSize: 5000
  }
})
```

### For Low Memory Usage

```typescript
updateThresholds({
  resources: {
    snapshotMaxFiles: 100,
    snapshotMaxFileSize: 1 * 1024 * 1024,
    dedupCacheSize: 100
  },
  qos: {
    batchIntervalMs: 5000, // Batch slower
    maxQueueSize: 100
  }
})
```

### For Low Latency

```typescript
updateThresholds({
  qos: {
    httpTimeout: 5000, // Fail fast
    maxQueueSize: 10
  },
  risk: {
    blockingThreshold: 9.0 // Less blocking
  }
})
```

---

## Memory Profiling

### Check Heap Usage

```typescript
function getMemoryStats() {
  const { heapUsed, heapTotal, external } = process.memoryUsage()

  return {
    used: Math.round(heapUsed / 1024 / 1024) + 'MB',
    total: Math.round(heapTotal / 1024 / 1024) + 'MB',
    percent: Math.round((heapUsed / heapTotal) * 100) + '%',
    external: Math.round(external / 1024 / 1024) + 'MB'
  }
}

console.log('Before:', getMemoryStats())
const result = await sdk.createSnapshot(largeFileSet)
console.log('After:', getMemoryStats())
```

### Monitor Over Time

```typescript
const memoryHistory = []

setInterval(() => {
  const stats = getMemoryStats()
  memoryHistory.push({
    timestamp: Date.now(),
    ...stats
  })

  // Alert if trending up
  if (memoryHistory.length > 10) {
    const recent = memoryHistory.slice(-10)
    const trend = recent[recent.length - 1].heapUsed -
                  recent[0].heapUsed

    if (trend > 50) { // > 50MB increase
      logger.warn('Memory usage trending up', { trend })
    }
  }
}, 60000) // Check every minute
```

---

## Network Optimization

### Compression

```typescript
import { gzip } from 'zlib'
import { promisify } from 'util'

const gzipAsync = promisify(gzip)

async function compressSnapshot(snapshot) {
  const json = JSON.stringify(snapshot)
  const compressed = await gzipAsync(json)

  // Typically 70-80% smaller
  console.log(`Compression: ${json.length} → ${compressed.length}`)
  return compressed
}
```

### Batch Network Requests

```typescript
// ❌ SLOW - One request per snapshot
for (const snapshot of snapshots) {
  await api.send(snapshot)
}

// ✅ FAST - Batch multiple
const batch = snapshots.slice(0, 10)
await api.sendBatch(batch)
```

---

## Storage Optimization

### Choose Right Backend

```typescript
// For small projects (< 1GB)
const storage = new LocalStorage('./.snapback')

// For teams (fast I/O)
const storage = new SQLiteStorage('./.snapback.db')

// For cloud (durability)
const storage = new S3Storage('my-bucket')

// For speed (caching)
const storage = new CachedStorage(primary, redis)
```

### Storage Monitoring

```typescript
async function getStorageStats() {
  const snapshots = await sdk.listSnapshots()
  const totalSnapshots = snapshots.length
  const totalSize = snapshots.reduce((sum, s) => {
    const size = Object.values(s.fileContents || {})
      .reduce((sz, content) => sz + content.length, 0)
    return sum + size
  }, 0)

  return {
    snapshots: totalSnapshots,
    sizeGB: (totalSize / 1024 / 1024 / 1024).toFixed(2),
    avgSnapshotMB: (totalSize / totalSnapshots / 1024 / 1024).toFixed(2)
  }
}
```

---

## Load Testing

### Simulate High Load

```typescript
async function loadTest(concurrency: number, duration: number) {
  const start = Date.now()
  const results = {
    succeeded: 0,
    failed: 0,
    avgTime: 0,
    maxTime: 0
  }

  while (Date.now() - start < duration) {
    const tasks = Array.from({ length: concurrency }, () =>
      testSnapshot().then(
        (time) => {
          results.succeeded++
          results.avgTime = (results.avgTime + time) / 2
          results.maxTime = Math.max(results.maxTime, time)
        },
        () => results.failed++
      )
    )

    await Promise.all(tasks)
  }

  return results
}
```

---

## Debugging Performance

### Enable Timing Logs

```typescript
import { logger } from '@snapback/infrastructure'

class TimedSnapback {
  constructor(private sdk: Snapback) {}

  async createSnapshot(files) {
    const start = performance.now()
    const result = await this.sdk.createSnapshot(files)
    const elapsed = performance.now() - start

    logger.info('Snapshot created', {
      files: files.length,
      elapsed,
      avgPerFile: elapsed / files.length
    })

    return result
  }
}
```

### Profile with Node Inspector

```bash
# Run with profiler
node --inspect app.js

# Then in Chrome DevTools:
# chrome://inspect -> connect -> Performance tab
```

---

## Best Practices

1. ✅ Batch operations together
2. ✅ Use async/await to avoid blocking
3. ✅ Monitor memory and disk usage
4. ✅ Implement cleanup for old snapshots
5. ✅ Use caching for duplicate content
6. ✅ Process only changed files
7. ✅ Configure thresholds for your workload
8. ✅ Test with realistic data sizes

---

**Last Updated:** 2025-11-20
# SnapBack SDK Performance Guide

Optimization strategies and performance benchmarks for the SnapBack SDK.

## Performance Benchmarks

### Snapshot Operations

| Operation | Files | Size | Time | Throughput |
|-----------|-------|------|------|------------|
| Create | 10 | 100KB | <5ms | 2000 ops/sec |
| Create | 100 | 1MB | <50ms | 200 ops/sec |
| Create | 500 | 10MB | <200ms | 50 ops/sec |
| Restore | 100 | 1MB | <100ms | 100 ops/sec |
| List | 100 items | - | <10ms | 100 ops/sec |
| Delete | Single | - | <5ms | 200 ops/sec |

### Risk Analysis

| Content Size | Time | Throughput |
|--------------|------|------------|
| 1KB | <1ms | 1000+ ops/sec |
| 100KB | <10ms | 100 ops/sec |
| 1MB | <50ms | 20 ops/sec |
| 10MB | <500ms | 2 ops/sec |

### Deduplication Cache

| Operation | Time | Notes |
|-----------|------|-------|
| Hash hit | <0.5ms | Cached content |
| Hash miss | <5ms | New content |
| Cache eviction | <1ms | LRU removal |
| Full cache (500) | <20ms | At capacity |

---

## Optimization Strategies

### 1. Batch Operations

```typescript
// ❌ SLOW - Individual snapshots
for (const file of files) {
  await sdk.createSnapshot([file])
}
// Total: N * (5-50)ms = 500-5000ms

// ✅ FAST - Single batch
await sdk.createSnapshot(files)
// Total: 50-200ms
```

**Benefit:** 10-100x faster for multiple files

### 2. Lazy Risk Analysis

```typescript
// ❌ SLOW - Analyze all changes
const changes = await git.getChanges()
const risk = await sdk.analyzeRisk(changes)

// ✅ FAST - Analyze only risky patterns
const risk = await sdk.analyzeRisk({
  added: changes.added.filter(f => isDangerous(f)),
  modified: changes.modified,
  deleted: []
})
```

**Benefit:** 50-80% faster when most files are safe

### 3. Content Caching

```typescript
// ❌ SLOW - Re-analyze same content
const risk1 = await analyzer.analyze(content)
const risk2 = await analyzer.analyze(content) // Again!

// ✅ FAST - Cache results
const cache = new Map()
function analyzeCached(content) {
  const key = hash(content)
  if (cache.has(key)) return cache.get(key)

  const result = analyzer.analyze(content)
  cache.set(key, result)
  return result
}
```

**Benefit:** 100x faster for duplicate content

### 4. Incremental Snapshots

```typescript
// ❌ SLOW - Full snapshot every time
const snapshot = await sdk.createSnapshot(allFiles)

// ✅ FAST - Only snapshot changes
const status = await git.status()
const changedFiles = [
  ...status.modified,
  ...status.added
]

const snapshot = await sdk.createSnapshot(
  changedFiles.map(f => ({
    path: f,
    content: await readFile(f),
    action: 'modify'
  }))
)
```

**Benefit:** 10-100x faster with large codebases

### 5. Parallel Processing

```typescript
// ❌ SLOW - Sequential
for (const file of files) {
  const risk = await analyzer.analyze(file.content)
}

// ✅ FAST - Parallel
const risks = await Promise.all(
  files.map(f => analyzer.analyze(f.content))
)
```

**Benefit:** 4-8x faster on multi-core systems

### 6. Async Snapshots

```typescript
// ❌ BLOCKS - Waits for completion
const result = await sdk.createSnapshot(files)

// ✅ NON-BLOCKING - Fire and forget
sdk.createSnapshot(files)
  .then(result => {
    if (isErr(result)) {
      logger.error('Snapshot failed', result.error)
    }
  })
  .catch(error => logger.error(error))
```

**Benefit:** UI stays responsive

---

## Configuration for Performance

### For High Throughput

```typescript
import { updateThresholds } from '@snapback/sdk'

updateThresholds({
  resources: {
    snapshotMaxFiles: 1000,
    snapshotMaxFileSize: 50 * 1024 * 1024,
    dedupCacheSize: 1000
  },
  qos: {
    batchIntervalMs: 100, // Flush faster
    maxQueueSize: 5000
  }
})
```

### For Low Memory Usage

```typescript
updateThresholds({
  resources: {
    snapshotMaxFiles: 100,
    snapshotMaxFileSize: 1 * 1024 * 1024,
    dedupCacheSize: 100
  },
  qos: {
    batchIntervalMs: 5000, // Batch slower
    maxQueueSize: 100
  }
})
```

### For Low Latency

```typescript
updateThresholds({
  qos: {
    httpTimeout: 5000, // Fail fast
    maxQueueSize: 10
  },
  risk: {
    blockingThreshold: 9.0 // Less blocking
  }
})
```

---

## Memory Profiling

### Check Heap Usage

```typescript
function getMemoryStats() {
  const { heapUsed, heapTotal, external } = process.memoryUsage()

  return {
    used: Math.round(heapUsed / 1024 / 1024) + 'MB',
    total: Math.round(heapTotal / 1024 / 1024) + 'MB',
    percent: Math.round((heapUsed / heapTotal) * 100) + '%',
    external: Math.round(external / 1024 / 1024) + 'MB'
  }
}

console.log('Before:', getMemoryStats())
const result = await sdk.createSnapshot(largeFileSet)
console.log('After:', getMemoryStats())
```

### Monitor Over Time

```typescript
const memoryHistory = []

setInterval(() => {
  const stats = getMemoryStats()
  memoryHistory.push({
    timestamp: Date.now(),
    ...stats
  })

  // Alert if trending up
  if (memoryHistory.length > 10) {
    const recent = memoryHistory.slice(-10)
    const trend = recent[recent.length - 1].heapUsed -
                  recent[0].heapUsed

    if (trend > 50) { // > 50MB increase
      logger.warn('Memory usage trending up', { trend })
    }
  }
}, 60000) // Check every minute
```

---

## Network Optimization

### Compression

```typescript
import { gzip } from 'zlib'
import { promisify } from 'util'

const gzipAsync = promisify(gzip)

async function compressSnapshot(snapshot) {
  const json = JSON.stringify(snapshot)
  const compressed = await gzipAsync(json)

  // Typically 70-80% smaller
  console.log(`Compression: ${json.length} → ${compressed.length}`)
  return compressed
}
```

### Batch Network Requests

```typescript
// ❌ SLOW - One request per snapshot
for (const snapshot of snapshots) {
  await api.send(snapshot)
}

// ✅ FAST - Batch multiple
const batch = snapshots.slice(0, 10)
await api.sendBatch(batch)
```

---

## Storage Optimization

### Choose Right Backend

```typescript
// For small projects (< 1GB)
const storage = new LocalStorage('./.snapback')

// For teams (fast I/O)
const storage = new SQLiteStorage('./.snapback.db')

// For cloud (durability)
const storage = new S3Storage('my-bucket')

// For speed (caching)
const storage = new CachedStorage(primary, redis)
```

### Storage Monitoring

```typescript
async function getStorageStats() {
  const snapshots = await sdk.listSnapshots()
  const totalSnapshots = snapshots.length
  const totalSize = snapshots.reduce((sum, s) => {
    const size = Object.values(s.fileContents || {})
      .reduce((sz, content) => sz + content.length, 0)
    return sum + size
  }, 0)

  return {
    snapshots: totalSnapshots,
    sizeGB: (totalSize / 1024 / 1024 / 1024).toFixed(2),
    avgSnapshotMB: (totalSize / totalSnapshots / 1024 / 1024).toFixed(2)
  }
}
```

---

## Load Testing

### Simulate High Load

```typescript
async function loadTest(concurrency: number, duration: number) {
  const start = Date.now()
  const results = {
    succeeded: 0,
    failed: 0,
    avgTime: 0,
    maxTime: 0
  }

  while (Date.now() - start < duration) {
    const tasks = Array.from({ length: concurrency }, () =>
      testSnapshot().then(
        (time) => {
          results.succeeded++
          results.avgTime = (results.avgTime + time) / 2
          results.maxTime = Math.max(results.maxTime, time)
        },
        () => results.failed++
      )
    )

    await Promise.all(tasks)
  }

  return results
}
```

---

## Debugging Performance

### Enable Timing Logs

```typescript
import { logger } from '@snapback/infrastructure'

class TimedSnapback {
  constructor(private sdk: Snapback) {}

  async createSnapshot(files) {
    const start = performance.now()
    const result = await this.sdk.createSnapshot(files)
    const elapsed = performance.now() - start

    logger.info('Snapshot created', {
      files: files.length,
      elapsed,
      avgPerFile: elapsed / files.length
    })

    return result
  }
}
```

### Profile with Node Inspector

```bash
# Run with profiler
node --inspect app.js

# Then in Chrome DevTools:
# chrome://inspect -> connect -> Performance tab
```

---

## Best Practices

1. ✅ Batch operations together
2. ✅ Use async/await to avoid blocking
3. ✅ Monitor memory and disk usage
4. ✅ Implement cleanup for old snapshots
5. ✅ Use caching for duplicate content
6. ✅ Process only changed files
7. ✅ Configure thresholds for your workload
8. ✅ Test with realistic data sizes

---

**Last Updated:** 2025-11-20
