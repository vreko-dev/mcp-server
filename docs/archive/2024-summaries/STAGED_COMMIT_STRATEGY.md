# Staged Commit Strategy

## Overview

This document outlines the strategy for organizing the 306 staged changes into logical, manageable commits.

## File Distribution Analysis

-   **230 files**: sbapback.dev/ - New development work and components
-   **63 files**: .archive/ - Archived/legacy content and AI features
-   **5 files**: apps/web/ - Web application test components
-   **8 files**: Other miscellaneous files

## Proposed Commit Groups

### 1. New Development Work (.sbapback.dev)

-   **Category**: Feature Implementation
-   **Files**: All files under sbapback.dev/ directory
-   **Rationale**: This is the main new development work with components, tests, configurations, and documentation
-   **Commit Message**: `feat: implement new development components and infrastructure`

### 2. Archived Content (.archive)

-   **Category**: Refactoring/Cleanup
-   **Files**: All files under .archive/ directory
-   **Rationale**: These are archived/legacy files that should be preserved but separated
-   **Commit Message**: `refactor: archive legacy content and ai features`

### 3. Web Application Components (apps/web)

-   **Category**: Feature Implementation
-   **Files**: Test components and pages in apps/web/app/
-   **Rationale**: New test components for the web application
-   **Commit Message**: `feat: add web application test components`

### 4. Miscellaneous Files

-   **Category**: Various (Documentation, Configuration, etc.)
-   **Files**: Remaining files that don't fit in other categories
-   **Rationale**: Various supporting files
-   **Commit Message**: `chore: add miscellaneous configuration and documentation files`

## Implementation Plan

1. Commit sbapback.dev files first as they represent the main new work
2. Commit archived files as they're legacy content
3. Commit web application components
4. Commit remaining miscellaneous files

## Commit Message Format

Using conventional commits:

-   feat: New feature implementations
-   fix: Bug fixes
-   chore: Maintenance tasks
-   docs: Documentation changes
-   refactor: Code refactoring/cleanup
