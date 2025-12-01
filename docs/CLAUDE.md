# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Main Commands

-   **Development**: `pnpm dev` (runs all packages with turbo, concurrency 15)
-   **Build**: `pnpm build` (builds all packages)
-   **Start**: `pnpm start` (starts production build)
-   **Lint**: `biome lint .` (lints all code with Biome)
-   **Format**: `biome format . --write` (formats all code)
-   **Check**: `biome check` (runs both linting and formatting checks)
-   **Clean**: `turbo clean` (cleans all build outputs)

### Database Commands

-   **Generate Prisma Client**: `pnpm --filter database run generate`
-   **Database Push**: `pnpm --filter database run push`
-   **Database Migration**: `pnpm --filter database run migrate`
-   **Database Studio**: `pnpm --filter database run studio`

### Testing Commands

-   **E2E Tests**: `pnpm --filter web run e2e` (Playwright UI mode)
-   **E2E CI**: `pnpm --filter web run e2e:ci` (headless for CI)
-   **Type Check**: `pnpm --filter web run type-check`

### Web App Specific

-   **Dev Server**: `pnpm --filter web run dev`
-   **Build Web**: `pnpm --filter web run build`
-   **Start Web**: `pnpm --filter web run start`

## Architecture Overview

### Monorepo Structure (Turborepo + PNPM)

This is a **turborepo monorepo** with PNPM workspaces containing:

-   **`apps/web`**: Next.js 15 application (main frontend)
-   **`packages/`**: Shared libraries and services
-   **`config/`**: Shared configuration
-   **`tooling/`**: Development tools and configurations

### Core Technology Stack

-   **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
-   **UI Components**: Radix UI primitives with shadcn/ui patterns
-   **Database**: PostgreSQL with Prisma ORM + Zod schema generation
-   **Authentication**: Better Auth (replaces NextAuth)
-   **API**: HONO with oRPC for type-safe API routes
-   **Payments**: Multi-provider support (Stripe, LemonSqueezy, Creem, Polar, DodoPayments)
-   **Mail**: Multi-provider support (Resend, Plunk, Postmark, Mailgun, Nodemailer)
-   **Storage**: S3-compatible storage
-   **AI**: OpenAI integration with AI SDK
-   **Testing**: Playwright for E2E
-   **Linting/Formatting**: Biome (replaces ESLint + Prettier)

### Package Architecture

**Core Services** (`packages/`):

-   **`@snapback/database`**: Prisma schema, client, and Zod validators
-   **`@snapback/auth`**: Better Auth configuration and utilities
-   **`@snapback/api`**: HONO API routes with oRPC type safety
-   **`@snapback/payments`**: Multi-provider payment abstractions
-   **`@snapback/mail`**: Multi-provider email abstractions
-   **`@snapback/storage`**: S3-compatible storage utilities
-   **`@snapback/ai`**: OpenAI integration and AI utilities
-   **`@snapback/utils`**: Shared utility functions
-   **`@snapback/logs`**: Logging utilities

**Configuration** (`config/`):

-   **`@snapback/config`**: Application configuration with type safety

**Development Tools** (`tooling/`):

-   **`@snapback/tsconfig`**: Shared TypeScript configurations
-   **`@snapback/tailwind-config`**: Shared Tailwind CSS configuration

### Web App Structure (`apps/web`)

**App Router Structure**:

-   **`(marketing)/`**: Public marketing pages
-   **`(saas)/app/`**: Protected application routes
-   **`api/`**: API route handlers
-   **`auth/`**: Authentication pages

**Module Organization** (`apps/web/modules/`):

-   **`marketing/`**: Marketing site components and logic
-   **`saas/`**: SaaS application features (organizations, payments, settings)
-   **`shared/`**: Components and utilities shared across features
-   **`ui/`**: Base UI components and design system
-   **`i18n/`**: Internationalization setup

### Key Configuration Files

**Application Configuration**:

-   **`config/index.ts`**: Main app configuration (features, plans, auth settings)
-   **`apps/web/next.config.ts`**: Next.js configuration with content collections
-   **`turbo.json`**: Turborepo pipeline configuration
-   **`biome.json`**: Code formatting and linting rules

**Authentication Flow**:

-   Uses Better Auth instead of NextAuth
-   Supports multiple providers: email/password, magic links, OAuth (Google, GitHub), passkeys
-   Two-factor authentication support
-   Session management with customizable expiration

**Database Schema**:

-   **Primary Models**: User, Organization, Session, Account, Purchase, Member
-   **Features**: Role-based access, multi-tenancy, billing integration
-   **Generators**: Prisma Client + Zod schema validation

### Environment Setup

Copy `.env.local.example` to `.env.local` and configure:

-   **Database**: PostgreSQL connection string
-   **Auth Providers**: GitHub, Google OAuth credentials
-   **Email Provider**: Choose from Resend, Plunk, Postmark, etc.
-   **Payment Provider**: Choose from Stripe, LemonSqueezy, etc.
-   **Storage**: S3-compatible storage credentials
-   **AI**: OpenAI API key

### Development Workflow

1. **Install Dependencies**: `pnpm install`
2. **Setup Environment**: Copy and configure `.env.local`
3. **Database Setup**: `pnpm --filter database run push`
4. **Generate Types**: `pnpm --filter database run generate`
5. **Start Development**: `pnpm dev`

### Key Architectural Patterns

**Type Safety**:

-   End-to-end type safety with oRPC API contracts
-   Zod schema validation generated from Prisma models
-   Strict TypeScript configuration across all packages

**Multi-tenancy**:

-   Organization-based multi-tenancy
-   User and organization-level billing
-   Role-based access control

**Modular Features**:

-   Feature-based module organization
-   Shared component library
-   Plugin-based authentication and payment providers

**Testing Strategy**:

-   Playwright for E2E testing
-   Type checking across all packages
-   Biome for code quality enforcement

### Important Notes

-   **Package Manager**: Uses PNPM with workspace protocol for internal dependencies
-   **Monorepo Coordination**: Turborepo handles build pipelines and caching
-   **Code Quality**: Biome enforces consistent formatting and linting
-   **Database**: Prisma with PostgreSQL, includes automated Zod generation
-   **Internationalization**: Configured but optional (can be disabled in config)
-   **Billing**: Multi-provider support with seat-based pricing options
