# Commit Strategy for SnapBack-Site Changes

## Overview

This document outlines the strategy for organizing the extensive changes in the repository into logical, manageable commits.

## Major Change Categories

### 1. Documentation & Content Updates

-   MDX documentation files (.mdx)
-   Documentation metadata (meta.json)
-   New documentation directories and structure

### 2. Frontend/UI Components

-   Marketing site components (Hero, Features, FAQ, etc.)
-   Shared UI components (NavBar, Footer)
-   SaaS application components
-   Test files for components

### 3. Configuration & Environment

-   Environment files (.env.docker.example, .env.local.example)
-   Configuration files (next.config.mjs, tsconfig.json, etc.)
-   Middleware updates

### 4. API & Backend Services

-   API route handlers
-   Webhook implementations
-   Health check endpoints

### 5. Testing Infrastructure

-   Unit tests
-   Integration tests
-   E2E tests
-   Test configuration files

### 6. GitHub Actions & CI/CD

-   Workflow files (.github/workflows/)
-   Build and deployment configurations

### 7. New Feature Implementations

-   AI chatbot functionality
-   Dashboard components
-   API key management
-   Usage tracking

## Proposed Commit Sequence

1. **Configuration & Environment Setup**

    - Environment files and basic configurations

2. **Documentation Structure**

    - New documentation files and directories
    - Content organization

3. **Frontend Components - Marketing Site**

    - Home page components and layouts
    - Shared marketing components

4. **Frontend Components - SaaS Application**

    - Account and organization pages
    - Billing and settings components

5. **API & Backend Services**

    - Webhook handlers
    - API routes
    - Health checks

6. **Testing Infrastructure**

    - Test files and configurations
    - Vitest setup

7. **CI/CD Pipeline**

    - GitHub workflow files
    - Build configurations

8. **New Feature Implementations**
    - AI chatbot removal (deleted files)
    - New dashboard and usage components
    - API key management

## Commit Message Format

Using conventional commits:

-   feat: New feature implementations
-   fix: Bug fixes
-   chore: Maintenance tasks
-   docs: Documentation changes
-   test: Test-related changes
-   refactor: Code refactoring
-   ci: CI/CD related changes
