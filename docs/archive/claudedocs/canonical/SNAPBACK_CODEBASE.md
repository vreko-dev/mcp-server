# SnapBack Codebase Reference

## Codebase Overview

The SnapBack codebase is organized as a monorepo using Turborepo, containing multiple packages and applications that work together to provide a comprehensive development platform.

## Repository Structure

```
SnapBack-Site/
├── apps/
│   ├── cli/              # Command-line interface tools
│   ├── mcp-server/       # MCP server implementation
│   ├── vscode/           # VS Code extension
│   └── web/              # Main web application
├── claudedocs/           # Internal documentation
├── clients/              # Client libraries
├── config/               # Shared configuration
├── docker/               # Docker configurations
├── extensions/           # IDE extensions
├── packages/             # Shared packages
│   ├── ai/               # AI-related functionality
│   ├── api/              # API services
│   ├── auth/             # Authentication system
│   ├── config/           # Configuration utilities
│   ├── contracts/        # Type definitions
│   ├── core/             # Core utilities
│   ├── database/         # Database access
│   ├── i18n/             # Internationalization
│   ├── logs/             # Logging utilities
│   ├── mail/             # Email services
│   ├── payments/         # Payment processing
│   ├── sdk/              # SDK packages
│   ├── storage/          # Storage utilities
│   ├── supabase/         # Supabase integration
│   ├── telemetry/        # Analytics and telemetry
│   └── utils/            # Utility functions
├── scripts/              # Automation scripts
├── tooling/              # Development tools
└── sbapback.dev/         # Legacy code (in process of migration)
```

## Key Packages

### Core Packages

#### `packages/core`

Contains fundamental utilities and shared functionality used across the entire codebase.

#### `packages/config`

Manages application configuration across different environments.

#### `packages/utils`

Provides general-purpose utility functions.

#### `packages/contracts`

Defines TypeScript interfaces and type definitions shared across packages.

### Domain-Specific Packages

#### `packages/api`

Implements the REST/GraphQL API services that power the platform.

#### `packages/auth`

Handles authentication and authorization logic.

#### `packages/database`

Provides database access layers and migrations.

#### `packages/storage`

Manages file storage and retrieval operations.

#### `packages/payments`

Implements payment processing and subscription management.

#### `packages/mail`

Handles email sending and related functionality.

#### `packages/telemetry`

Collects analytics and telemetry data.

#### `packages/i18n`

Provides internationalization support.

#### `packages/ai`

Implements AI-powered features and integrations.

#### `packages/supabase`

Integrates with Supabase backend services.

#### `packages/logs`

Provides structured logging capabilities.

### SDK Packages

#### `packages/sdk`

Contains the main SDK that developers use to integrate with SnapBack.

## Applications

### Web Application (`apps/web`)

The main web application built with Next.js 15 and React 19, providing the user interface for the platform.

#### Key Features

-   Dashboard for project management
-   Code editor and development environment
-   Deployment and monitoring tools
-   Documentation and help resources

#### Technology Stack

-   Next.js 15 with App Router
-   React 19
-   TypeScript
-   Tailwind CSS
-   Framer Motion for animations
-   Fumadocs for documentation

### CLI Tools (`apps/cli`)

Command-line interface tools for developers who prefer working in the terminal.

#### Key Features

-   Project initialization and scaffolding
-   Deployment commands
-   Local development server
-   Integration with other tools

### VS Code Extension (`apps/vscode`)

Integrated development environment extension for Visual Studio Code.

#### Key Features

-   Seamless integration with VS Code
-   In-editor development tools
-   Debugging capabilities
-   Direct deployment from editor

### MCP Server (`apps/mcp-server`)

Implementation of the Model Context Protocol server for AI integration.

#### Key Features

-   AI model integration
-   Context management
-   Tool execution
-   Security and access control

## Development Workflow

### Setting Up Development Environment

1. **Prerequisites**

    - Node.js 18+
    - pnpm package manager
    - Docker (for certain services)
    - Git

2. **Installation**

    ```bash
    git clone [repository-url]
    cd SnapBack-Site
    pnpm install
    ```

3. **Configuration**
    - Copy `.env.example` to `.env.local`
    - Update environment variables as needed
    - Set up required services (database, etc.)

### Building and Running

#### Development Mode

```bash
pnpm dev
```

#### Production Build

```bash
pnpm build
```

#### Running Tests

```bash
pnpm test
```

### Code Organization Principles

#### Package Boundaries

-   Clear separation of concerns between packages
-   Minimal cross-package dependencies
-   Well-defined interfaces between packages
-   Shared utilities in core packages

#### Naming Conventions

-   PascalCase for components and classes
-   camelCase for functions and variables
-   UPPER_SNAKE_CASE for constants
-   Descriptive, intention-revealing names

#### File Structure

-   Index files for package exports
-   Logical grouping of related files
-   Consistent directory structure across packages
-   Clear separation of types, components, and utilities

## Testing Strategy

### Unit Testing

-   Comprehensive coverage for individual functions and components
-   Mocking of external dependencies
-   Fast execution for development feedback

### Integration Testing

-   Testing interactions between packages
-   Database integration tests
-   API endpoint testing

### End-to-End Testing

-   User workflow validation
-   Browser automation with Playwright
-   Cross-browser compatibility testing

## Deployment Architecture

### Continuous Integration

-   Automated testing on every commit
-   Code quality checks
-   Security scanning
-   Build artifact generation

### Continuous Deployment

-   Automated deployment to staging
-   Manual approval for production
-   Rollback capabilities
-   Monitoring and alerting

### Environment Management

-   Local development environments
-   Shared staging environment
-   Production environment
-   Feature branch deployments

## Revenue-First Architecture

The codebase is organized with a revenue-first approach, prioritizing features and architecture decisions that support the monetization strategy:

1. **Device Trial Implementation** - Core licensing logic
2. **Feature Gating** - Premium feature access control
3. **Usage Tracking** - Analytics for user behavior
4. **Subscription Management** - Billing and account management

## Performance Considerations

### Frontend Optimization

-   Code splitting and lazy loading
-   Image optimization
-   Bundle size monitoring
-   Caching strategies

### Backend Optimization

-   Database query optimization
-   Caching layers
-   Efficient API design
-   Resource management

### Infrastructure Optimization

-   CDN usage for static assets
-   Database connection pooling
-   Load balancing
-   Auto-scaling capabilities

## Security Measures

### Authentication Security

-   Secure password handling
-   JWT token management
-   Session security
-   Multi-factor authentication support

### Data Security

-   Encryption at rest and in transit
-   Input validation and sanitization
-   SQL injection prevention
-   Cross-site scripting protection

### Infrastructure Security

-   Network isolation
-   Regular security updates
-   Vulnerability scanning
-   Access control policies

## Documentation

### Internal Documentation

Located in `/claudedocs/` and organized into:

-   Canonical documentation (authoritative sources)
-   Active work (current initiatives)
-   Archive (historical documents)
-   Planning (future features)

### Public Documentation

Located in `/apps/web/content/docs/` and follows the Diátaxis framework:

-   Tutorials for learning
-   How-to guides for tasks
-   Reference documentation
-   Explanations for understanding

---

_Last Updated: 2024-10-02_
_Based on: SNAPBACK_CODEBASE_AUDIT.md, SNAPBACK_REVENUE_FIRST_ARCHITECTURE.md_
