# Syncpack Dependency Consistency

Syncpack ensures consistent dependency versions across SnapBack's monorepo by managing versions and resolving conflicts.

## How It Works

Syncpack analyzes all package.json files in the workspace and ensures that the same versions of dependencies are used across all packages. It can automatically fix inconsistencies or report them for manual review.

## Installation

Syncpack is installed as a dev dependency in the root package.json:

```bash
pnpm add syncpack --save-dev
```

## Configuration

The configuration is defined in `.syncpackrc.json` at the root of the repository. Key settings include:

-   Using `workspace:*` protocol for local dependencies
-   Consistent versioning strategies for different dependency types
-   Custom grouping rules for related packages

## Common Commands

```bash
# Lint for dependency inconsistencies
pnpm syncpack:lint

# Automatically fix dependency inconsistencies
pnpm syncpack:fix

# Format package.json files
pnpm syncpack:format

# List dependencies sorted by usage count
pnpm syncpack:list
```

## Benefits

1. **Version Consistency**: All packages use the same dependency versions
2. **Conflict Resolution**: Automatically resolves version conflicts
3. **PNPM Workspace Support**: Properly handles pnpm's workspace protocol
4. **Reduced Bugs**: Fewer issues from mismatched dependency versions

## Integration with CI/CD

Syncpack is integrated into our CI pipeline and pre-commit hooks to ensure dependency consistency before code is merged. Additionally, a custom script checks that all dependencies use catalog references instead of direct version numbers, and this check is run as part of the pre-push hooks.
