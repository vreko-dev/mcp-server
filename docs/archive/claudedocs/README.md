# SnapBack Internal Documentation

**Purpose**: Internal documentation for SnapBack development team
**Audience**: Developers, architects, technical writers

---

## Quick Access

-   **Quick Reference**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)
-   **Current Work**: [active/](./active/)
-   **Canonical Docs**: [canonical/](./canonical/)
-   **Planning**: [planning/](./planning/)
-   **Archive**: [archive/](./archive/)

---

## Documentation Structure

### Canonical Documentation

Authoritative references for architecture, testing, and operations.

-   [Architecture](./canonical/ARCHITECTURE.md) - System architecture and design
-   [Migration Guide](./canonical/MIGRATION.md) - Migration procedures and history
-   [Testing Guide](./canonical/TESTING.md) - Testing strategy and practices
-   [DevOps Guide](./canonical/DEVOPS.md) - Infrastructure and operations
-   [SaaS Platform](./canonical/SAAS_PLATFORM.md) - Platform architecture
-   [Codebase Reference](./canonical/SNAPBACK_CODEBASE.md) - Codebase overview

### Active Work

Current initiatives and work in progress.

-   [Components](./active/components/) - Component library development
-   [Content Strategy](./active/content/) - Content templates and guidelines
-   [Documentation Redesign](./active/docs-redesign/) - Docs modernization
-   [Implementations](./active/implementations/) - Active implementation initiatives
-   [Journeys](./active/journeys/) - User journey architecture
-   [Landing Pages](./active/landing-pages/) - Landing page specifications
-   [Monetization](./active/monetization/) - Revenue and pricing strategies
-   [Patterns](./active/patterns/) - Architectural patterns
-   [UI Animations](./active/ui-animations/) - Animation implementation
-   [UX Improvements](./active/ux-improvements/) - UX/DX enhancements

### Planning

Future features and strategic initiatives.

-   [AI Crawler Strategy](./planning/AI_CRAWLER_STRATEGY.md) - AI-powered documentation crawler

### Archive

Historical documents preserved for reference.

-   [2024-09-30](./archive/2024-09-30/) - Initial analysis and migration planning

---

## Contributing

### Adding New Documentation

1. **Canonical**: Add to `canonical/` for authoritative references
2. **Active Work**: Create subdirectory in `active/` for new initiatives
3. **Planning**: Add to `planning/` for future features
4. **Archive**: Move completed work to `archive/{date}/`

### Updating Documentation

1. Update the canonical document in `canonical/`
2. Add changelog entry in the document
3. Update related documents with cross-references

### Consolidating Documentation

1. Identify duplicate or related content
2. Merge into canonical document
3. Archive obsolete documents
4. Update cross-references

---

## Migration History

### 2024-10-02: Fumadocs-MDX Migration

-   Migrated from content-collections to fumadocs-mdx v12
-   See: [FUMADOCS_MDX_MIGRATION_ARCHITECTURE.md](./FUMADOCS_MDX_MIGRATION_ARCHITECTURE.md)
-   Status: Complete ✅

### 2024-09-30: Initial Codebase Analysis

-   Comprehensive codebase audit
-   Architecture analysis
-   Migration planning
-   Status: Complete ✅

---

## Maintenance

### Regular Tasks

-   [ ] Review and update canonical documents quarterly
-   [ ] Archive completed active work
-   [ ] Update cross-references
-   [ ] Consolidate duplicate content

### As Needed

-   [ ] Create new canonical documents for major features
-   [ ] Update migration guide with new migrations
-   [ ] Archive historical documents when superseded

---

## Related Documentation

-   **User Documentation**: [apps/web/content/docs/](../apps/web/content/docs/)
-   **CLAUDE.md**: [CLAUDE.md](../CLAUDE.md) - Claude Code guidance
-   **Project Status**: [PROJECT_STATUS.md](../PROJECT_STATUS.md)

---

Last Updated: 2024-10-02
