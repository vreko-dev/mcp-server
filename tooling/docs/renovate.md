# Renovate Dependency Management

Renovate is an automated dependency update tool that helps keep SnapBack's dependencies up-to-date by creating pull requests for newer versions.

## How It Works

Renovate scans the repository for outdated dependencies across all package managers and creates pull requests to update them. It runs as a GitHub bot that integrates with our repository.

## Configuration

The configuration is defined in `renovate.json` at the root of the repository. Key settings include:

-   Automated updates for minor and patch versions with a 3-day stability period
-   Grouped updates for related packages (e.g., AWS SDK, React)
-   Manual approval required for major updates
-   Special handling for security vulnerabilities

## Benefits

1. **Automated Updates**: No more manual tracking of dependency updates
2. **Security**: Faster response to security vulnerabilities
3. **Consistency**: Ensures all packages use compatible versions
4. **Reduced Work**: Team members can focus on features instead of dependency management

## Common Commands

```bash
# These are handled automatically by the Renovate bot
# No manual commands needed for daily usage
```

## Configuration File

See `renovate.json` at the root of the repository for the full configuration.
