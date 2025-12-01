# OnWillSave Gating Implementation Summary

## Overview
This document summarizes the implementation of the OnWillSave gating functionality for SnapBack VS Code extension. The feature provides protection levels (Watch, Warn, Block) that control how file saves are handled based on risk analysis.

## Key Components

### 1. OnWillSaveHandler Class
Located at: `apps/vscode/src/save/onWillSave.ts`

The main handler that processes `onWillSaveTextDocument` events:

- **Protection Level Handling**:
  - Watch level: Allows save but creates snapshot
  - Warn level: Shows notification but doesn't block
  - Block level: Blocks save unless user explicitly allows

- **Risk Analysis**:
  - Calculates risk score based on content patterns
  - Returns decisions (Allow, Warn, Block) based on risk thresholds
  - Uses pattern matching for secrets, passwords, database operations

- **Budget Probes**:
  - Records `analysis_kickoff_ms` for backend analysis time
  - Records `ui_action_ms` for total UI interaction time

### 2. Blocking Dialogs
Located at: `apps/vscode/src/ui/dialogs.ts`

Standardized dialog interface for user interactions:

- **Block Dialog**:
  - Standardized button labels: Continue / Create Snapshot & Continue / Cancel Save
  - Detailed risk information display
  - ARIA-compliant modal dialogs

- **Override Dialog**:
  - Collects justification for snapshot creation
  - Input validation (minimum 5 characters)
  - Records justification for audit purposes

### 3. Tests
Located at: `apps/vscode/test/unit/save/onWillSave.block.spec.ts`

Comprehensive test coverage including:

- Non-protected files allowed to save
- Watch level files allowed to save
- Protected level files with Block decision properly blocked
- User choices (Continue, Create Snapshot, Cancel) handled correctly
- Justification recording for snapshot creation
- Budget probe recording for performance monitoring

## Implementation Details

### Risk Scoring Algorithm
The risk scoring algorithm analyzes document content for common security patterns:

- API_KEY and SECRET patterns (+3 points each occurrence)
- Password-related content (+2 points)
- Database operations (DELETE, DROP) (+2 points)
- Maximum score capped at 10

### Decision Thresholds
- Risk Score ≥ 8: Block decision
- Risk Score ≥ 5: Warn decision
- Risk Score < 5: Allow decision

### Performance Monitoring
Budget probes track critical performance metrics:

- `analysis_kickoff_ms`: Time taken for backend analysis to start
- `ui_action_ms`: Total time for UI interaction handling

### Justification Recording
When users choose "Create Snapshot & Continue", they must provide justification:

- Minimum 5 characters required
- Stored in extension context for audit purposes
- Future implementation would integrate with snapshot system

## Test Results
All tests pass successfully:

- ✅ UX1-E-001: Non-protected files allowed to save
- ✅ UX1-E-002: Watch level files allowed to save
- ✅ UX1-E-003: Protected level files with Block decision properly blocked
- ✅ UX1-E-004: Create Snapshot option allows save with override dialog
- ✅ UX1-E-005: Continue option allows save without snapshot
- ✅ UX1-E-006: High-risk content returns Block decision
- ✅ UX1-E-007: Low-risk content returns Allow decision
- ✅ UX1-E-008: Justification recorded when user chooses Create Snapshot & Continue
- ✅ UX1-E-009: Budget probes recorded for analysis and UI actions

## Future Enhancements
1. Integration with real backend MCP analyzer for more sophisticated risk analysis
2. Actual snapshot creation integration with justification storage
3. More sophisticated pattern matching and machine learning-based risk assessment
4. Enhanced performance monitoring with real-time alerts
5. Integration with team policy enforcement systems