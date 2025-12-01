# Quick Reference: Commit Grouping Strategy

## Main Categories

1. **VS Code Extension** - `feat(vscode)`, `fix(vscode)`, `chore(vscode)`, `test(vscode)`
2. **Web Application** - `feat(web)`, `refactor(web)`, `feat(snapback-demo)`
3. **Marketing Site** - `feat(marketing)`, `fix(marketing)`, `refactor(marketing)`, `test(marketing)`
4. **Testing** - `test(`, `fix(tests)`, test coverage commits
5. **Dependencies & Docs** - `feat(deps)`, `chore(deps)`, `docs(`, documentation commits
6. **Refactoring** - `refactor(`, `style(`, code quality commits

## Commands

```bash
# Backup current branch
git branch backup/grouping-$(date +%Y%m%d-%H%M) recovery/protection-levels-tdd

# Start interactive rebase (adjust number as needed)
git rebase -i HEAD~20

# In the editor, replace 'pick' with:
# - 'squash' to combine commits with message editing
# - 'fixup' to combine commits without message editing
```

## Workflow Tips

1. Work in small batches (10-15 commits)
2. Group similar functionality together
3. Write clear, concise commit messages when squashing
4. Test after each grouping session
5. Use `git rebase --abort` if something goes wrong

See [updated-commit-grouping.md](./updated-commit-grouping.md) for detailed grouping examples.
