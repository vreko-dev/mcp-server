# @snapback/config

**Purpose**: Configuration defaults & environment management
**Role**: Centralized config for all apps/packages

## Exports
- `defaults.ts`: Default configuration values
- `env.ts`: Environment variable parsing
- `test.ts`: Test-specific overrides

## Usage
```ts
import { defaults } from '@snapback/config';

const dbPath = defaults.storage.path; // ~/.snapback/snapshots.db
```
