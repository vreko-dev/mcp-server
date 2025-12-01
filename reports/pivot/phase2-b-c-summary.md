# SnapBack Prevention Pivot - Phase 2-B & 2-C Overview

## Phase 2-B: MCP guard (latency-budgeted, advisory until re-baselined)

### Objective
Implement risk analysis for Model Context Protocol (MCP) interactions to provide advisory recommendations before applying AI-generated changes.

### Key Requirements
- Integrate with existing MCP analysis functionality
- Implement diff → Guardian → {decision:'Apply'|'Review', reasons} workflow
- Ensure latency-budgeted operations (advisory until re-baselined)
- Create integration tests for MCP interception
- Run incremental tests for MCP guard functionality

### Implementation Plan
1. Review existing MCP analysis implementation in `packages/core/src/mcp/analyze_before_apply.ts`
2. Update to integrate with Guardian system for comprehensive risk analysis
3. Implement decision-making logic based on risk scores
4. Create integration tests with test cases:
   - Low-risk changes that can be automatically applied
   - Moderate-risk changes that require review
   - High-risk changes that should be blocked
5. Run incremental tests to verify functionality

### Files to Modify
- `packages/core/src/mcp/analyze_before_apply.ts` - Main MCP analysis implementation
- `test/integration/mcp-guard.spec.ts` - Integration tests for MCP interception

## Phase 2-C: Generic FS interception (Cursor/Windsurf/Aider)

### Objective
Implement file system watching for generic AI coding assistants to provide pre-apply Guardian analysis and blocking with override capture.

### Key Requirements
- Implement chokidar file watching for pending directories
- Pre-apply Guardian analysis on detected changes
- Block high-risk changes with override capture UI
- Export start/stop functions for proper lifecycle management
- Create integration tests for FS guard
- Run incremental tests for FS interception functionality

### Implementation Plan
1. Review existing FS agent watcher implementation in `apps/vscode/src/ai/fs/agentWatcher.ts`
2. Update to export start/stop functions for proper lifecycle management
3. Enhance with chokidar watching and Guardian pre-apply analysis
4. Implement blocking logic with override capture UI
5. Create integration tests with test cases:
   - File change detection
   - Low-risk changes allowed
   - High-risk changes blocked
   - Override functionality
6. Run incremental tests to verify functionality

### Files to Modify
- `apps/vscode/src/ai/fs/agentWatcher.ts` - Main FS agent watcher implementation
- `test/integration/agent-fs.spec.ts` - Integration tests for FS guard

## Dependencies
Both Phase 2-B and 2-C depend on the completion of Phase 2-A (Copilot interception) which is now complete.

## Timeline
- Phase 2-B: MCP guard - Estimated 2-3 weeks
- Phase 2-C: Generic FS interception - Estimated 2-3 weeks

## Validation
Both phases will include:
- Comprehensive integration tests
- Latency performance testing
- Code quality review
- Documentation updates