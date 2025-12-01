# SnapBack Reference Directory Setup

Create this directory structure in your codebase root:

```bash
# Run these commands in your repo root:

mkdir -p docs/reference
mkdir -p docs/reference/architecture
mkdir -p docs/reference/implementation
mkdir -p docs/reference/standards

# Copy reference documents
cat > docs/reference/README.md << 'EOF'
# SnapBack Build Reference

This directory contains the authoritative build blueprint for SnapBack.
Use these documents during implementation and code review.

## Directory Structure

- `architecture/` - System architecture and design decisions
- `implementation/` - Step-by-step implementation guides
- `standards/` - Code quality, testing, and DX standards

## Usage

**During Implementation:**
- Reference these docs when building new features
- Follow the patterns and examples provided
- Copy code snippets as starting points

**During Code Review:**
- Use standards/ docs as checklist
- Verify architectural decisions match architecture/ docs
- Ensure tests meet expectations in standards/testing.md

**Keep Updated:**
- Update docs when you make architectural decisions
- Add learnings from implementation challenges
- Document patterns that work well
EOF
```

## Files to Place in Reference Directory

### Architecture Documents

Place in `docs/reference/architecture/`:

1. `system-overview.md` - Complete architecture (from comprehensive spec)
2. `data-moat-strategy.md` - Competitive moat via data logging
3. `session-management.md` - Session tracking architecture
4. `risk-detection-pipeline.md` - Two-tier risk analysis

### Implementation Guides

Place in `docs/reference/implementation/`:

1. `session-manager-guide.md` - Building SessionManager
2. `iteration-tracker-guide.md` - Building IterationTracker
3. `degradation-ui-guide.md` - Building killer demo UI
4. `data-logger-guide.md` - Data moat logging
5. `integration-points.md` - How everything connects

### Standards Documents

Place in `docs/reference/standards/`:

1. `testing-standards.md` - Test expectations & patterns
2. `dx-standards.md` - Web dashboard DX requirements
3. `analytics-patterns.md` - PostHog event tracking
4. `logging-strategy.md` - User signal capture
5. `code-review-checklist.md` - Pre-merge requirements

## Quick Setup Script

```bash
#!/bin/bash
# setup-reference-docs.sh

# Create directory structure
mkdir -p docs/reference/{architecture,implementation,standards}

# Create README
cat > docs/reference/README.md << 'EOF'
# SnapBack Build Reference
[content from above]
EOF

echo "✅ Reference directory structure created!"
echo "📋 Next: Copy your spec documents into appropriate folders"
```

## Git Integration

Add to `.gitignore` (if you want to keep some docs private):

```gitignore
# Keep architecture docs private during development
docs/reference/architecture/competitive-moat.md
docs/reference/implementation/secret-sauce.md
```

Or commit everything:

```bash
git add docs/reference/
git commit -m "docs: Add build reference directory"
```

## Claude Desktop Integration

If using Claude Desktop with MCP, you can reference these docs:

```json
// In your Claude config
{
	"context": {
		"files": ["docs/reference/**/*.md"]
	}
}
```

## VS Code Workspace

Add to `.vscode/settings.json`:

```json
{
	"files.associations": {
		"docs/reference/**/*.md": "markdown"
	},
	"markdown.preview.breaks": true,
	"markdown.preview.scrollEditorWithPreview": true
}
```

This makes it easy to preview reference docs while coding.
