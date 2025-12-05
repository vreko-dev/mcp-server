# Changelog

All notable changes to `@snapback-oss/contracts` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2025-12-05

### 🚀 Added
- OpenAPI specification generation from Zod schemas
- Legacy event migration utilities for backward compatibility

### 📝 Changed
- License section updated with proper Apache 2.0 badge
- CHANGELOG format aligned with Keep a Changelog standard

### 🔧 Maintenance
- Codecov integration for coverage tracking

## [0.3.0] - 2025-12-01

### 🚀 Added
- Session management type definitions
- `SessionContext` interface for auth flow integration
- ID generation utilities with nanoid

### 🐛 Fixed
- Type inference for optional fields in `RestoreOptions`

## [0.2.0] - 2025-11-28

### 🚀 Added
- Zod validation schemas for all core types
- `SnapshotMetadata` type with extended properties
- JSON schema validation helpers

### 📝 Changed
- Renamed `SnapBackOpts` → `SnapBackOptions` for consistency

## [0.1.0] - 2025-11-15

### 🚀 Added
- **Event Types**: Type-safe event definitions for snapshot lifecycle
  - `SnapshotCreated`, `SnapshotRestored`, `FileProtected`
  - Core event schemas with Zod validation
- **Type Definitions**: Comprehensive TypeScript types
  - `Snapshot` type with metadata
  - `FileProtection` configuration
  - `ProtectionLevel` enum

### ✅ What's Included
- Event type definitions (core, legacy)
- Snapshot and file types
- Zod validation schemas

### ❌ What's Not Included (Private)
- Subscription/tier types
- Dashboard schemas
- Analytics event types
- Payment integration types

---

[Unreleased]: https://github.com/snapback-dev/contracts/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/snapback-dev/contracts/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/snapback-dev/contracts/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/snapback-dev/contracts/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/snapback-dev/contracts/releases/tag/v0.1.0
