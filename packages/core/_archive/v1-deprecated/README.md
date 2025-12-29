# V1 Deprecated Code Archive

**Archived**: 2024-12-28
**Reason**: Replaced by `@snapback/engine` in V2 architecture

## Contents

- `guardian.ts` - Original plugin orchestration system
- `risk-analyzer.ts` - Multi-factor risk scoring
- `threat-detection.ts` - AI-generated code detection
- `detection/` - Pattern-based detection plugins
- `test/` - Associated test files

## Migration

Use `@snapback/engine` adapters instead:
- Guardian -> Engine adapters
- Detection plugins -> Engine detection system
- Risk analysis -> Engine risk module

## Removal

Safe to delete after confirming no external consumers.
Check: `grep -r "guardian\|risk-analyzer\|threat-detection" --include="*.ts" apps/ packages/`
