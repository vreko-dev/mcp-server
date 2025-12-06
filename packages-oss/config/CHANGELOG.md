# @snapback-oss/config

## 0.2.0 (2025-12-06)

### Features

**Explicit utils exports and tier-aware configuration**

- Exported explicit utility functions for direct use
- Pricing tier-aware configuration loading
- Better error messages showing which config values failed validation

### What You See

- Access config utils directly: `import { loadConfig } from '@snapback-oss/config'`
- Config loading shows which tier features are available
- Validation errors tell you what's wrong, not just "validation failed"

## 0.1.0 (2025-12-04)

### Features

**Initial public release of configuration utilities**

- **Config Loading**: Load and merge configuration
  - Environment variable support
  - File-based config
  - Type-safe config schemas

- **Validation**: Config validation helpers
  - Schema validation
  - Type coercion
  - Default values

### What's Included

- ✅ Configuration loading utilities
- ✅ Validation helpers
- ✅ Type-safe schemas

---

**Full Changelog**: https://github.com/snapback-dev/config/commits/main
