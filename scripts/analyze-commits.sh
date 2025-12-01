#!/bin/bash

# Script to analyze commits by category
echo "Analyzing commits on recovery/protection-levels-tdd branch..."
echo "========================================================"

# Count total commits
total=$(git log --oneline 5f0817ba..recovery/protection-levels-tdd | wc -l)
echo "Total commits: $total"
echo

# Count VS Code commits
vscode=$(git log --oneline 5f0817ba..recovery/protection-levels-tdd | grep "vscode" | wc -l)
echo "VS Code related commits: $vscode"

# Count web commits
web=$(git log --oneline 5f0817ba..recovery/protection-levels-tdd | grep "web" | wc -l)
echo "Web related commits: $web"

# Count test commits
test=$(git log --oneline 5f0817ba..recovery/protection-levels-tdd | grep "test" | wc -l)
echo "Test related commits: $test"

# Count docs commits
docs=$(git log --oneline 5f0817ba..recovery/protection-levels-tdd | grep "docs\|doc:" | wc -l)
echo "Documentation commits: $docs"

# Count feat commits
feat=$(git log --oneline 5f0817ba..recovery/protection-levels-tdd | grep "feat" | wc -l)
echo "Feature commits: $feat"

# Count refactor commits
refactor=$(git log --oneline 5f0817ba..recovery/protection-levels-tdd | grep "refactor" | wc -l)
echo "Refactor commits: $refactor"

# Count chore commits
chore=$(git log --oneline 5f0817ba..recovery/protection-levels-tdd | grep "chore" | wc -l)
echo "Chore commits: $chore"

# Count fix commits
fix=$(git log --oneline 5f0817ba..recovery/protection-levels-tdd | grep "fix" | wc -l)
echo "Fix commits: $fix"

echo
echo "========================================================"
echo "Detailed commit analysis complete."
echo "See commit-grouping-guide.md for instructions on how to group these commits."