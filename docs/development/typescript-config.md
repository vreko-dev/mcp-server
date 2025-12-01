# TypeScript Configuration Best Practices

## Overview

This document outlines the best practices for TypeScript configuration in the SnapBack monorepo, including the consolidated configuration approach and project reference guidelines.

## Consolidated TypeScript Configuration

The SnapBack monorepo uses a consolidated TypeScript configuration approach to ensure consistency across all packages while providing specialized settings for different project types.

### Specialized Base Configurations

The `@snapback/tsconfig` package provides specialized base configurations for different project types:

- **`@snapback/tsconfig/base`** - Unified base configuration shared across all projects
- **`@snapback/tsconfig/package`** - Configuration for packages (libraries)
- **`@snapback/tsconfig/app`** - Configuration for web applications
- **`@snapback/tsconfig/cli`** - Configuration for CLI tools
- **`@snapback/tsconfig/extension`** - Configuration for VS Code extensions

### Using Specialized Configurations

Each project should extend from the appropriate specialized configuration based on its type:

```json
// For packages (libraries)
{
  "extends": "@snapback/tsconfig/package",
  "compilerOptions": {
    // Package-specific overrides only
  }
}

// For web applications
{
  "extends": "@snapback/tsconfig/app",
  "compilerOptions": {
    // App-specific overrides only
  }
}

// For CLI tools
{
  "extends": "@snapback/tsconfig/cli",
  "compilerOptions": {
    // CLI-specific overrides only
  }
}

// For VS Code extensions
{
  "extends": "@snapback/tsconfig/extension",
  "compilerOptions": {
    // Extension-specific overrides only
  }
}
```

### Project-Specific Configuration

Local tsconfig.json files should only include project-specific overrides. Common overrides include:

1. **rootDir**: Always set to `"./src"` for projects extending specialized bases
2. **Path mappings**: Project-specific path aliases
3. **Types**: Project-specific type declarations

Example:
```json
{
  "extends": "@snapback/tsconfig/package",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Project Reference Guidelines

### Avoid Project References in tsconfig.json

In the monorepo setup, workspace dependencies must be declared in package.json using `workspace:*` syntax but should **not** be included as project references in tsconfig.json files.

Incorrect or stale project references can interfere with proper module resolution through package exports and build artifacts, leading to "package not found" errors despite correct physical paths.

### Correct Dependency Declaration

Workspace dependencies should be declared in package.json:

```json
{
  "dependencies": {
    "@snapback/config": "workspace:*",
    "@snapback/sdk": "workspace:*"
  }
}
```

### Remove Project References

Remove any project references from tsconfig.json files:

```json
// ❌ Incorrect - Remove these references
{
  "references": [
    { "path": "../config" },
    { "path": "../sdk" }
  ]
}

// ✅ Correct - No project references needed
{
  // No references section
}
```

## Benefits of This Approach

1. **Consistency**: All packages and apps use a unified base configuration
2. **Maintainability**: Changes to base configurations automatically propagate to all projects
3. **Reduced Duplication**: Common settings are defined once and reused
4. **Type Safety**: Consistent compiler options across the monorepo
5. **Scalability**: Easy to add new project types with their own base configurations
6. **Clean Module Resolution**: Avoids conflicts between project references and package exports

## Troubleshooting

### Type Errors After Configuration Changes

If you encounter type errors after updating TypeScript configurations:

1. Run a clean build:
   ```bash
   pnpm clean && pnpm build
   ```

2. Run type checking:
   ```bash
   pnpm turbo type-check
   ```

3. Check specific package:
   ```bash
   pnpm --filter <package-name> run type-check
   ```

### Module Resolution Issues

If you encounter "module not found" errors:

1. Ensure dependencies are declared in package.json with `workspace:*`
2. Remove any project references from tsconfig.json
3. Run `pnpm install` to update dependencies
4. Rebuild affected packages

### Build Failures

If builds fail after configuration changes:

1. Check that the correct specialized base configuration is being extended
2. Verify that project-specific overrides are correctly specified
3. Ensure `rootDir` is set to `"./src"` for projects extending specialized bases
4. Run individual package builds to isolate issues:
   ```bash
   pnpm --filter <package-name> run build
   ```

## Summary

- Use specialized base configurations from `@snapback/tsconfig`
- Extend from the appropriate base based on project type
- Only include project-specific overrides in local tsconfig.json files
- Declare workspace dependencies in package.json using `workspace:*`
- Remove project references from tsconfig.json files
- Set `rootDir` to `"./src"` for projects extending specialized bases

Following these guidelines ensures a clean, maintainable, and scalable TypeScript configuration across the monorepo.
