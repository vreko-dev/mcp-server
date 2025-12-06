# Changelog

All notable changes to `@snapback-oss/sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.0] - 2025-12-06

### 🚀 Added
- Device trial integration for evaluating protection across new devices
- Pattern memory tier standardization (Free | Pro | Team | Enterprise)
- Consolidated error handling and retry logic from canonical utilities

### 📝 Changed
- Pricing tier names now consistently reflect market tiers
- Messaging aligned with Pattern Memory narrative (show behavior, not mechanism)
- Improved type safety for tier-gated features

### 🎯 What You See
- SDK now remembers which device tried protection last
- Tier gates work consistently across Pro/Team/Enterprise plans
- Clear error messages show what actually happened, not internal state

## [0.5.0] - 2025-12-05

### 🚀 Added
- Codecov integration for coverage tracking
- Enhanced API documentation with performance benchmarks

### 📝 Changed
- License section updated with proper Apache 2.0 badge
- CHANGELOG format aligned with Keep a Changelog standard

## [0.4.0] - 2025-12-01

### 🚀 Added
- Type-safe API client with full IDE autocomplete
- Automatic retries with exponential backoff
- Request/response logging for debugging

### 🐛 Fixed
- Storage adapter initialization race condition
- Edge case in snapshot restoration for large files

## [0.3.0] - 2025-11-28

### 🚀 Added
- Testing infrastructure overhaul
  - `SessionManager` unit tests
  - `QoSService` integration tests
  - `EncryptionService` security tests
- Property-based testing with fast-check

### ⚡ Performance
- Optimized snapshot listing with cursor pagination
- Reduced memory footprint for large file operations

## [0.2.0] - 2025-11-20

### 🚀 Added
- **Storage Adapters**: Flexible storage layer
  - Local storage with SQLite (optional)
  - HTTP storage for remote API
  - Clean interface for custom adapters
- **Snapshot CRUD**: Full lifecycle operations
  - Create snapshots with file patterns
  - List with filtering and pagination
  - Restore with conflict resolution

### 📝 Changed
- Moved `better-sqlite3` to optional peer dependency

## [0.1.0] - 2025-11-15

### 🚀 Added
- **Core SDK Structure**: Foundation for SnapBack API
- **HTTP Client**: Base client with auth handling
- **Type Safety**: Full TypeScript support
  - Validated request/response types
  - IDE autocomplete support
- **File Protection**: Declarative file protection
  - Protect files by pattern
  - Multiple protection levels
  - List protected files

### ✅ What's Included
- Complete SDK for SnapBack API
- Type-safe snapshot operations
- File protection management
- HTTP client with retries

### ❌ What's Not Included (Private)
- better-sqlite3 bundled (optional peer dep)
- Platform-specific integrations
- Premium/enterprise features

---

[Unreleased]: https://github.com/snapback-dev/sdk/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/snapback-dev/sdk/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/snapback-dev/sdk/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/snapback-dev/sdk/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/snapback-dev/sdk/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/snapback-dev/sdk/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/snapback-dev/sdk/releases/tag/v0.1.0
