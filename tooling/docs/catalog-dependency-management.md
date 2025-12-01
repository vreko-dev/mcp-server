# Catalog Dependency Management

This document explains how SnapBack uses pnpm's catalog system with Renovate and Syncpack to manage dependencies consistently across the monorepo.

## Overview

SnapBack uses pnpm's catalog system to centralize dependency version management. This ensures all packages use consistent versions and simplifies dependency updates.

## How It Works

### 1. Catalog Definition

Dependencies are defined in `pnpm-workspace.yaml` under the `catalogs.default` section:

```yaml
catalogs:
    default:
        "@biomejs/biome": 2.2.4
        "@types/node": 24.5.1
        # ... other dependencies
```

### 2. Package Usage

Packages reference catalog dependencies using the `catalog:` protocol:

```json
{
	"dependencies": {
		"@biomejs/biome": "catalog:",
		"@types/node": "catalog:"
	}
}
```

### 3. Local Package References

Local packages use the `workspace:*` protocol:

```json
{
	"dependencies": {
		"@snapback/core": "workspace:*",
		"@snapback/contracts": "workspace:*"
	}
}
```

## Tools Integration

### Renovate

-   Automatically updates catalog definitions in `pnpm-workspace.yaml`
-   Creates PRs for outdated dependencies with a 3-day stability period for minor/patch updates
-   Groups related packages (e.g., AWS SDK, React) for easier review
-   Requires manual approval for major updates
-   Prioritizes security updates with special labels and assignees

### Syncpack

-   Ensures consistent usage of catalog references across all package.json files
-   Formats package.json files for consistency
-   Identifies and reports mismatches that need manual resolution
-   Integrated into CI/CD pipeline and pre-commit hooks

### Custom Package Version Checker

-   Prevents direct version numbers in package.json dependencies
-   Ensures all catalog dependencies use the `catalog:` protocol
-   Runs as part of pre-push hooks to catch issues before code is pushed
-   Allows workspace protocol and local file references

## Benefits

1. **Centralized Management**: All dependency versions are defined in one place
2. **Consistency**: All packages use the same versions of shared dependencies
3. **Automated Updates**: Renovate keeps dependencies up-to-date automatically
4. **Reduced Conflicts**: Syncpack prevents version mismatches
5. **Improved DX**: Developers don't need to manage individual package versions
6. **Security**: Faster response to security vulnerabilities through automated updates

## Best Practices

1. **Use Catalog References**: Always use `catalog:` for dependencies defined in the catalog
2. **Use Workspace Protocol**: Always use `workspace:*` for local package dependencies
3. **Avoid Direct Versions**: Never use direct version numbers for catalog dependencies
4. **Regular Updates**: Review and merge Renovate PRs regularly
5. **Check Syncpack Reports**: Address Syncpack mismatches promptly
6. **Pre-push Validation**: Let the custom checker catch issues before pushing

## Common Commands

```bash
# Check for direct version numbers (runs on pre-push)
pnpm check:package-versions

# Lint for dependency inconsistencies
pnpm syncpack:lint

# Automatically fix dependency inconsistencies
pnpm syncpack:fix

# Format package.json files
pnpm syncpack:format

# List dependencies sorted by usage count
pnpm syncpack:list
```

## Troubleshooting

### Dependency Not in Catalog

If you need a dependency that's not in the catalog:

1. Add it to `pnpm-workspace.yaml` in the `catalogs.default` section
2. Use `catalog:` in your package.json
3. Let Renovate manage future updates

### Version Mismatches

If Syncpack reports mismatches:

1. Run `pnpm syncpack:fix` to automatically resolve what can be fixed
2. For manual fixes, ensure all packages use the same catalog reference
3. For local packages, ensure all use `workspace:*`

### Pre-push Hook Failures

If the package version checker fails:

1. Check which dependencies are using direct versions instead of `catalog:`
2. Update them to use `catalog:` references
3. For local packages, use `workspace:*`
4. For special cases, use `file:` or `link:` protocols
