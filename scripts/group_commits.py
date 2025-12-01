#!/usr/bin/env python3

import re
import sys

def group_commits():
    # Read commits from file
    with open('/tmp/commit-list.txt', 'r') as f:
        commits = f.readlines()
    
    # Reverse to process chronologically
    commits.reverse()
    
    # Group commits by prefix
    groups = {
        'vscode': [],
        'web': [],
        'test': [],
        'docs': [],
        'deps': [],
        'refactor': [],
        'chore': [],
        'feat': [],
        'fix': [],
        'style': []
    }
    
    # Categorize commits
    for commit in commits:
        commit = commit.strip()
        found_group = False
        
        # Check for specific patterns first
        for group in groups:
            if f"{group}(" in commit or f"{group}:" in commit or commit.startswith(group):
                groups[group].append(commit)
                found_group = True
                break
        
        # If no specific group found, put in general categories
        if not found_group:
            if commit.startswith('feat'):
                groups['feat'].append(commit)
            elif commit.startswith('fix'):
                groups['fix'].append(commit)
            else:
                # Default to chore for uncategorized
                groups['chore'].append(commit)
    
    # Generate rebase instructions
    rebase_lines = []
    rebase_lines.append("# Commit grouping for recovery/protection-levels-tdd branch")
    rebase_lines.append("#")
    
    # Process each group
    group_order = ['feat', 'vscode', 'web', 'test', 'deps', 'docs', 'refactor', 'fix', 'style', 'chore']
    
    for group_name in group_order:
        group_commits = groups[group_name]
        if group_commits:
            rebase_lines.append(f"# {group_name.upper()} COMMITS ({len(group_commits)} commits)")
            
            # For large groups, we might want to sub-group them
            if len(group_commits) > 5:
                # Split large groups into subgroups of ~5 commits
                subgroup_count = 0
                for i in range(0, len(group_commits), 5):
                    subgroup = group_commits[i:i+5]
                    subgroup_count += 1
                    rebase_lines.append(f"# {group_name.upper()} SUBGROUP {subgroup_count}")
                    
                    for j, commit in enumerate(subgroup):
                        commit_hash = commit.split()[0]
                        if j == 0:
                            rebase_lines.append(f"pick {commit}")
                        else:
                            rebase_lines.append(f"squash {commit}")
            else:
                # For smaller groups, just pick the first and squash the rest
                for i, commit in enumerate(group_commits):
                    commit_hash = commit.split()[0]
                    if i == 0:
                        rebase_lines.append(f"pick {commit}")
                    else:
                        rebase_lines.append(f"squash {commit}")
            
            rebase_lines.append("")
    
    # Print the rebase script
    for line in rebase_lines:
        print(line.rstrip())

if __name__ == "__main__":
    group_commits()