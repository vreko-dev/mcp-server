# Detection System Implementation Todo List

## Phase 1: Core Infrastructure
- [ ] 1.1: Directory structure & types
- [ ] 1.2: Entropy calculator (20 lines, Shannon formula)
- [ ] 1.3: AST helpers (parser selection, import extraction)
- [ ] 1.4: Package.json finder (cache, traverse up)

## Phase 2: Secret Detection Plugin
- [ ] 2.1: RED - Write 20 failing tests
- [ ] 2.2: GREEN - Implement detection logic
- [ ] 2.3: REFACTOR - Optimize & document

## Phase 3: Mock Replacement Plugin
- [ ] 3.1: RED - Write 15 failing tests
- [ ] 3.2: GREEN - Implement detection logic
- [ ] 3.3: REFACTOR - Optimize & document

## Phase 4: Phantom Dependency Plugin
- [ ] 4.1: RED - Write 18 failing tests
- [ ] 4.2: GREEN - Implement detection logic
- [ ] 4.3: REFACTOR - Optimize & document

## Phase 5: Integration
- [ ] 5.1: MCP server hookup
- [ ] 5.2: VS Code SaveHandler integration
- [ ] 5.3: Diagnostics & quick fixes

## Phase 6: Performance & Polish
- [ ] 6.1: Performance profiling (<200ms target)
- [ ] 6.2: Memory profiling (<100MB target)
- [ ] 6.3: Documentation & examples