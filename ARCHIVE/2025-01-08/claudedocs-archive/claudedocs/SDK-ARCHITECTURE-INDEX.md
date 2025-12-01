# SnapBack SDK - Complete Architecture Documentation

**Comprehensive Design Package for @snapback/sdk**

---

## Document Overview

This architecture package provides complete specifications for implementing the @snapback/sdk - a platform-agnostic TypeScript SDK for snapshot management and file protection.

**Total Documentation**: 5 core documents
**Total Words**: ~25,000+
**Implementation Timeline**: 7 weeks
**Status**: ✅ Design Complete, Ready for Implementation

---

## Core Documents

### 1. [sdk-architecture-design.md](./sdk-architecture-design.md)

**Purpose**: Complete architectural specification
**Length**: ~11,000 words
**Audience**: Architects, Senior Developers

**Contents**:

-   Layer architecture (Client, Manager, Storage)
-   Component dependency graph
-   Complete interface contracts
-   Storage strategy (SQLite schema, cloud API, memory)
-   Caching strategy (3-level cache system)
-   Error handling hierarchy
-   Plugin architecture
-   Data flow diagrams
-   Performance optimization points
-   Platform integration examples (VS Code, CLI, MCP, Web)

**Key Sections**:

1. Layer Architecture
2. Component Dependency Graph
3. Interface Contracts
4. Storage Strategy
5. Caching Strategy
6. Error Handling
7. Plugin Architecture
8. Data Flow Diagrams
9. Performance Optimization
10. Platform Integration
11. Summary

---

### 2. [sdk-architecture-visual-summary.md](./sdk-architecture-visual-summary.md)

**Purpose**: Quick reference guide
**Length**: ~2,500 words
**Audience**: All Developers

**Contents**:

-   Component responsibility matrix
-   Interface quick reference
-   Cache strategy matrix
-   Error hierarchy diagram
-   Storage schema reference
-   Performance optimization checklist
-   Platform integration patterns
-   Testing strategy overview
-   Key metrics and targets

**Key Tables**:

-   Component Responsibility Matrix
-   Cache Strategy Matrix
-   Storage Schema Tables
-   Performance Targets
-   Testing Strategy
-   Decision Guide

**Use Case**: Quick lookup during implementation

---

### 3. [sdk-implementation-roadmap.md](./sdk-implementation-roadmap.md)

**Purpose**: Implementation plan and guidelines
**Length**: ~5,500 words
**Audience**: Implementers, Project Managers

**Contents**:

-   Complete file structure
-   7-week implementation phases
-   Implementation guidelines
-   Code style standards
-   Testing standards
-   Performance benchmarks
-   Security considerations
-   Development workflow
-   Migration strategy
-   Common pitfalls and solutions
-   Success metrics

**Implementation Phases**:

1. **Week 1**: Foundation (Storage, Errors, Utils)
2. **Week 2**: Manager Layer (Business Logic)
3. **Week 3**: Client Layer (HTTP API)
4. **Week 4**: Caching Infrastructure
5. **Week 5**: Plugin System
6. **Week 6**: Sync & Conflict Resolution
7. **Week 7**: Integration & Examples

**Use Case**: Day-to-day implementation guide

---

### 4. [sdk-architecture-summary.md](./sdk-architecture-summary.md)

**Purpose**: Executive summary
**Length**: ~5,000 words
**Audience**: Stakeholders, Leadership, Quick Overview

**Contents**:

-   Overview and principles
-   Key components summary
-   Data flow examples
-   Caching strategy overview
-   Error handling summary
-   Performance targets
-   Platform integration overview
-   Implementation roadmap summary
-   Design decisions and trade-offs
-   Security considerations
-   Testing strategy
-   Success criteria
-   Next steps

**Use Case**: Stakeholder presentations, architecture reviews

---

### 5. [sdk-architecture-decisions.md](./sdk-architecture-decisions.md)

**Purpose**: Architecture Decision Records (ADR)
**Length**: ~4,000 words
**Audience**: Architects, Technical Leads

**Contents**:

-   15 Architecture Decision Records
-   Rationale for each decision
-   Alternatives considered
-   Consequences (pros/cons)
-   Performance implications

**Key Decisions**:

1. Three-Layer Architecture
2. SQLite as Local Storage
3. Content Deduplication Strategy
4. Multi-Level Caching Strategy
5. Plugin Architecture
6. Error Hierarchy and Recovery
7. QuickLRU for HTTP Caching
8. Ky for HTTP Client
9. Pattern Matching with Minimatch
10. Input Validation (Ow + Zod)
11. Better-SQLite3 for SQLite
12. Separate Client and Manager Layers
13. Platform Context and Capabilities
14. Reference Counting for GC
15. TypeScript Strict Mode

**Use Case**: Understanding architectural choices, future decision-making

---

## Quick Navigation

### By Role

**Architects**:

1. Start: [Architecture Summary](./sdk-architecture-summary.md)
2. Deep Dive: [Complete Design](./sdk-architecture-design.md)
3. Decisions: [Architecture Decisions](./sdk-architecture-decisions.md)

**Senior Developers**:

1. Start: [Visual Summary](./sdk-architecture-visual-summary.md)
2. Details: [Complete Design](./sdk-architecture-design.md)
3. Implementation: [Implementation Roadmap](./sdk-implementation-roadmap.md)

**Implementers**:

1. Start: [Implementation Roadmap](./sdk-implementation-roadmap.md)
2. Reference: [Visual Summary](./sdk-architecture-visual-summary.md)
3. Details: [Complete Design](./sdk-architecture-design.md)

**Project Managers**:

1. Start: [Architecture Summary](./sdk-architecture-summary.md)
2. Timeline: [Implementation Roadmap](./sdk-implementation-roadmap.md) (Section: Implementation Phases)
3. Metrics: [Visual Summary](./sdk-architecture-visual-summary.md) (Section: Key Metrics)

**Stakeholders/Leadership**:

1. Read: [Architecture Summary](./sdk-architecture-summary.md)
2. Decisions: [Architecture Decisions](./sdk-architecture-decisions.md)

---

## By Topic

### Architecture & Design

**Layer Architecture**:

-   [Complete Design](./sdk-architecture-design.md) - Section 1: Layer Architecture
-   [Visual Summary](./sdk-architecture-visual-summary.md) - Component Responsibility Matrix

**Component Design**:

-   [Complete Design](./sdk-architecture-design.md) - Section 2: Dependency Graph
-   [Complete Design](./sdk-architecture-design.md) - Section 3: Interface Contracts

**Data Flow**:

-   [Complete Design](./sdk-architecture-design.md) - Section 8: Data Flow Diagrams
-   [Summary](./sdk-architecture-summary.md) - Data Flow Examples

### Storage & Persistence

**Storage Strategy**:

-   [Complete Design](./sdk-architecture-design.md) - Section 4: Storage Strategy
-   [Visual Summary](./sdk-architecture-visual-summary.md) - Storage Schema

**SQLite Schema**:

-   [Complete Design](./sdk-architecture-design.md) - Section 4.1: LocalStorage
-   [Roadmap](./sdk-implementation-roadmap.md) - File: `src/storage/schema.sql`

**Deduplication**:

-   [Decisions](./sdk-architecture-decisions.md) - ADR-003: Content Deduplication
-   [Complete Design](./sdk-architecture-design.md) - Section 9.2: Deduplication Optimization

### Caching

**Cache Strategy**:

-   [Complete Design](./sdk-architecture-design.md) - Section 5: Caching Strategy
-   [Visual Summary](./sdk-architecture-visual-summary.md) - Cache Strategy Matrix
-   [Decisions](./sdk-architecture-decisions.md) - ADR-004: Multi-Level Caching

**Cache Implementation**:

-   [Complete Design](./sdk-architecture-design.md) - Section 5.1-5.4
-   [Roadmap](./sdk-implementation-roadmap.md) - Phase 4: Caching Infrastructure

### Error Handling

**Error Hierarchy**:

-   [Complete Design](./sdk-architecture-design.md) - Section 6: Error Handling
-   [Visual Summary](./sdk-architecture-visual-summary.md) - Error Hierarchy
-   [Decisions](./sdk-architecture-decisions.md) - ADR-006: Error Hierarchy

**Recovery Strategies**:

-   [Complete Design](./sdk-architecture-design.md) - Section 6.2: Error Recovery
-   [Summary](./sdk-architecture-summary.md) - Error Handling Section

### Plugin System

**Plugin Architecture**:

-   [Complete Design](./sdk-architecture-design.md) - Section 7: Plugin Architecture
-   [Decisions](./sdk-architecture-decisions.md) - ADR-005: Plugin Architecture
-   [Roadmap](./sdk-implementation-roadmap.md) - Phase 5: Plugin System

**Built-in Plugins**:

-   [Complete Design](./sdk-architecture-design.md) - Section 7.2: Example Plugins
-   [Roadmap](./sdk-implementation-roadmap.md) - File: `src/plugins/builtin/`

### Platform Integration

**VS Code**:

-   [Complete Design](./sdk-architecture-design.md) - Section 10.1: VS Code Integration
-   [Roadmap](./sdk-implementation-roadmap.md) - File: `examples/vscode-extension.ts`

**CLI**:

-   [Complete Design](./sdk-architecture-design.md) - Section 10.2: CLI Integration
-   [Roadmap](./sdk-implementation-roadmap.md) - File: `examples/cli-tool.ts`

**MCP Server**:

-   [Complete Design](./sdk-architecture-design.md) - Section 10.3: MCP Integration
-   [Roadmap](./sdk-implementation-roadmap.md) - File: `examples/mcp-server.ts`

**Web**:

-   [Summary](./sdk-architecture-summary.md) - Platform Integration: Web Application

### Performance

**Performance Targets**:

-   [Visual Summary](./sdk-architecture-visual-summary.md) - Key Metrics
-   [Summary](./sdk-architecture-summary.md) - Performance Targets

**Optimization Points**:

-   [Complete Design](./sdk-architecture-design.md) - Section 9: Performance Optimization
-   [Roadmap](./sdk-implementation-roadmap.md) - Performance Benchmarks

### Implementation

**File Structure**:

-   [Roadmap](./sdk-implementation-roadmap.md) - Recommended File Structure

**Implementation Phases**:

-   [Roadmap](./sdk-implementation-roadmap.md) - Implementation Phases (7 weeks)

**Code Guidelines**:

-   [Roadmap](./sdk-implementation-roadmap.md) - Implementation Guidelines
-   [Roadmap](./sdk-implementation-roadmap.md) - Code Style

### Testing

**Testing Strategy**:

-   [Visual Summary](./sdk-architecture-visual-summary.md) - Testing Strategy
-   [Roadmap](./sdk-implementation-roadmap.md) - Testing Standards
-   [Summary](./sdk-architecture-summary.md) - Testing Strategy

**Test Coverage**:

-   [Roadmap](./sdk-implementation-roadmap.md) - Success Metrics

---

## Key Architectural Concepts

### 1. Three-Layer Architecture

```
┌─────────────────────────────────────────┐
│        Platform Layer                    │
│  (VS Code, CLI, MCP, Web)               │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌─────────────┐
│   Client    │  │   Manager   │
│  (Remote)   │  │   (Local)   │
└──────┬──────┘  └──────┬──────┘
       │                │
       └────────┬───────┘
                ▼
       ┌─────────────────┐
       │ Storage Adapter │
       └─────────────────┘
```

**Benefits**:

-   Platform-agnostic core
-   Offline-first capability
-   Flexible deployment (local/cloud/hybrid)

### 2. Content Deduplication

```sql
snapshot_contents (hash → content)
        ↑
        │ (ref_count)
        │
    snapshots (id → content_hash)
```

**Benefits**:

-   3:1+ space savings
-   Automatic garbage collection
-   Fast hash-based lookup

### 3. Multi-Level Caching

```
Level 1: HTTP Response Cache (QuickLRU)
Level 2: Query Result Cache (Map)
Level 3: Object Cache (Deduplication)
```

**Benefits**:

-   70%+ cache hit rate
-   50%+ latency reduction
-   Reduced database load

### 4. Plugin Architecture

```typescript
Platform → Plugin → SDK Core
         ↓
    Lifecycle Hooks
```

**Benefits**:

-   Platform-specific features isolated
-   Core remains platform-agnostic
-   Easy to extend

---

## Implementation Checklist

### Phase 1: Foundation (Week 1)

-   [ ] Storage adapters (LocalStorage, MemoryStorage)
-   [ ] Error hierarchy
-   [ ] Utility functions
-   [ ] Unit tests

### Phase 2: Manager Layer (Week 2)

-   [ ] SnapshotManager with deduplication
-   [ ] ProtectionManager with patterns
-   [ ] Deduplication cache
-   [ ] Integration tests

### Phase 3: Client Layer (Week 3)

-   [ ] SnapshotClient, ProtectionClient
-   [ ] CloudStorage adapter
-   [ ] HTTP caching
-   [ ] API tests

### Phase 4: Caching (Week 4)

-   [ ] Cache strategies
-   [ ] Cache coordinator
-   [ ] Performance optimization
-   [ ] Cache tests

### Phase 5: Plugins (Week 5)

-   [ ] Plugin system
-   [ ] Built-in plugins
-   [ ] Platform adapters
-   [ ] Plugin tests

### Phase 6: Sync (Week 6)

-   [ ] SyncCoordinator
-   [ ] Conflict resolution
-   [ ] Incremental sync
-   [ ] Sync tests

### Phase 7: Integration (Week 7)

-   [ ] VS Code example
-   [ ] CLI example
-   [ ] MCP example
-   [ ] Documentation
-   [ ] E2E tests

---

## Performance Targets

| Metric                  | Target  | Notes                |
| ----------------------- | ------- | -------------------- |
| Snapshot create (local) | < 100ms | With deduplication   |
| Snapshot get (cached)   | < 10ms  | QuickLRU cache       |
| Snapshot get (storage)  | < 50ms  | SQLite indexed query |
| Protection check        | < 10ms  | Pattern matching     |
| List 20 snapshots       | < 100ms | SQLite query         |
| Cache hit rate          | > 70%   | HTTP response cache  |
| Deduplication ratio     | > 3:1   | Similar files        |
| Test coverage           | > 85%   | All code paths       |

---

## Technology Stack

### Core Dependencies

| Package          | Purpose            | Version |
| ---------------- | ------------------ | ------- |
| `ky`             | HTTP client        | 1.7.2   |
| `quick-lru`      | LRU cache          | 7.0.0   |
| `better-sqlite3` | SQLite binding     | Latest  |
| `minimatch`      | Pattern matching   | Latest  |
| `ow`             | Runtime validation | 1.0.0   |
| `p-retry`        | Retry logic        | 6.2.0   |
| `zod`            | Schema validation  | Latest  |

### Dev Dependencies

| Package          | Purpose              |
| ---------------- | -------------------- |
| `typescript`     | Type checking        |
| `vitest`         | Testing framework    |
| `@biomejs/biome` | Linting & formatting |

---

## Success Metrics

### Technical Quality

-   ✅ TypeScript strict mode
-   ✅ No 'any' types (except tests)
-   ✅ 85%+ test coverage
-   ✅ All public APIs documented
-   ✅ Biome checks passing

### Performance

-   ✅ < 100ms snapshot creation
-   ✅ < 50ms cached retrieval
-   ✅ 70%+ cache hit rate
-   ✅ 3:1+ deduplication ratio

### Reliability

-   ✅ All error scenarios handled
-   ✅ Transaction safety guaranteed
-   ✅ Graceful degradation
-   ✅ No data loss scenarios

### Developer Experience

-   ✅ Clear API documentation
-   ✅ Comprehensive examples
-   ✅ Migration guides
-   ✅ Good error messages

---

## Next Steps

1. **Review Architecture** ✅ Complete

    - Stakeholder review
    - Technical review
    - Approval to proceed

2. **Begin Implementation** 🎯 Next

    - Set up project structure
    - Phase 1: Foundation
    - Weekly progress reviews

3. **Set Up CI/CD**

    - Automated testing
    - Type checking
    - Linting
    - Build pipeline

4. **Create Project Board**

    - Track implementation
    - Assign tasks
    - Monitor progress

5. **Weekly Reviews**
    - Progress checkpoints
    - Blockers discussion
    - Adjustments as needed

---

## Frequently Asked Questions

### Q: Why separate Client and Manager layers?

**A**: Enables offline-first architecture. Manager layer works without network, Client layer provides cloud sync. Platforms can use one or both.

### Q: Why SQLite over other databases?

**A**: Best combination of query power, performance, and simplicity. ACID transactions, full-text search, no separate server.

### Q: How does deduplication work?

**A**: Content is hashed (SHA-256), identical content shares storage. Reference counting enables automatic garbage collection when no snapshots reference content.

### Q: What if network fails during sync?

**A**: Cache fallback strategy returns stale cache data. Operations continue locally, sync resumes when network available.

### Q: How to add a new platform?

**A**: Create platform adapter, implement platform services, register plugins. Core SDK is platform-agnostic.

### Q: What about security?

**A**: Input validation (Ow/Zod), prepared statements (SQL injection prevention), path traversal prevention, API key protection.

---

## Document Maintenance

**Review Schedule**: Monthly (first Monday)
**Update Triggers**:

-   Major architectural changes
-   New technology decisions
-   Implementation discoveries
-   Performance optimizations

**Owners**:

-   Architecture: Lead Architect
-   Implementation: Tech Lead
-   Documentation: Technical Writer

---

## Version History

| Version | Date       | Changes                     | Author                    |
| ------- | ---------- | --------------------------- | ------------------------- |
| 1.0.0   | 2025-10-21 | Initial architecture design | Claude (System Architect) |

---

## Glossary

**ADR**: Architecture Decision Record
**LRU**: Least Recently Used (cache eviction strategy)
**GC**: Garbage Collection
**TTL**: Time To Live (cache expiration)
**ACID**: Atomicity, Consistency, Isolation, Durability
**FTS**: Full-Text Search
**E2E**: End-to-End (testing)

---

**Architecture Status**: ✅ Design Complete
**Implementation Status**: 🟡 Ready to Begin
**Documentation Version**: 1.0.0
**Last Updated**: 2025-10-21
**Total Package Size**: ~25,000 words across 5 documents
