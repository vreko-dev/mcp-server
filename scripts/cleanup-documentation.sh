#!/bin/bash
# Documentation Cleanup Script for SnapBack
# Removes outdated, duplicate, and temporary documentation files
#
# Usage: ./scripts/cleanup-documentation.sh [--dry-run]
#
# SAFE: Creates backup before deletion
# SAFE: Shows what will be deleted with --dry-run

set -e

WORKSPACE_ROOT="/Users/user1/WebstormProjects/SnapBack-Site"
BACKUP_DIR="/tmp/snapback-docs-backup-$(date +%Y%m%d-%H%M%S)"
DRY_RUN=false

if [[ "$1" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY RUN MODE - No files will be deleted"
  echo ""
fi

cd "$WORKSPACE_ROOT"

echo "📦 SnapBack Documentation Cleanup"
echo "=================================="
echo ""

# Function to delete file/directory safely
safe_delete() {
  local path="$1"
  if [ -e "$path" ]; then
    if [ "$DRY_RUN" = true ]; then
      echo "  [DRY RUN] Would delete: $path"
    else
      # Create backup directory structure
      local backup_path="$BACKUP_DIR/$(dirname "$path")"
      mkdir -p "$backup_path"
      # Move to backup
      mv "$path" "$backup_path/"
      echo "  ✓ Deleted: $path"
    fi
  fi
}

# Create backup directory
if [ "$DRY_RUN" = false ]; then
  mkdir -p "$BACKUP_DIR"
  echo "📁 Backup directory: $BACKUP_DIR"
  echo ""
fi

echo "🗑️  Category 1: Archive Directories (8.5MB)"
echo "-------------------------------------------"
safe_delete "ARCHIVE"
safe_delete "apps/vscode/ARCHIVE"
safe_delete "docs/archive"
echo ""

echo "🗑️  Category 2: Guardian Lite Review Files"
echo "-------------------------------------------"
safe_delete "GUARDIAN_LITE_CODE_REVIEW.md"
safe_delete "GUARDIAN_LITE_FIX_GUIDE.md"
safe_delete "GUARDIAN_LITE_REVIEW_INDEX.md"
safe_delete "GUARDIAN_LITE_REVIEW_SUMMARY.md"
safe_delete "GUARDIAN_LITE_REVIEW_COMPLETE.txt"
echo ""

echo "🗑️  Category 3: Temporary Analysis/Audit Files"
echo "-----------------------------------------------"
# Audit files
safe_delete "AUTH_AUDIT_INDEX.md"
safe_delete "AUTH_CONSOLIDATION_AUDIT.md"
safe_delete "COMMUNICATION_SIGNAGE_AUDIT.md"
safe_delete "COMPREHENSIVE_DUPLICATION_AUDIT.md"
safe_delete "COMPREHENSIVE_TODO_AUDIT_2025-11-08.md"
safe_delete "DOCKER_ENV_AUDIT.md"
safe_delete "DUPLICATION_AUDIT_SUMMARY.md"
safe_delete "ERROR_HANDLING_AUDIT.md"
safe_delete "NOTIFICATION_EVALUATION_INDEX.md"
safe_delete "RULE_VIOLATIONS_AUDIT.md"
safe_delete "SDK_MIGRATION_AUDIT.md"
safe_delete "TEST_AUDIT.md"
safe_delete "TEST_AUDIT_README.md"

# Review files
safe_delete "ARCHITECTURE_REVIEW_FINDINGS.md"
safe_delete "COMMIT_029213d6_REVIEW.md"
safe_delete "COMPREHENSIVE_WEB_API_FIRST_REVIEW.md"
safe_delete "EXECUTE_STORAGE_REVIEW.md"
safe_delete "STORAGE_REVIEW_FINAL_STATUS.md"
safe_delete "STORAGE_REVIEW_REPORT.md"
safe_delete "ULTRA_COMPREHENSIVE_WEB_API_FIRST_REVIEW_V2.md"
safe_delete "ULTRA_COMPREHENSIVE_WEB_API_FIRST_REVIEW_V3.md"
safe_delete "ULTRA_COMPREHENSIVE_WEB_API_FIRST_REVIEW_V4.md"
safe_delete "VSCODE_EXTENSION_DUE_DILIGENCE_AUDIT.md"
safe_delete "WEB_APP_ANALYSIS.md"
safe_delete "WEB_APP_CRAWLER_FRIENDLY_ANALYSIS.md"
safe_delete "WEB_APP_ISSUES_AND_IMPROVEMENTS.md"

# Analysis files
safe_delete "COMPREHENSIVE_ARCHITECTURE_ANALYSIS.md"
safe_delete "FLOW_ANALYSIS_DETAILED.md"
safe_delete "IMPLEMENTATION_GAPS_ANALYSIS.md"
safe_delete "PACKAGE-ARCHITECTURE-ANALYSIS.md"
safe_delete "PACKAGE_ANALYSIS.md"
safe_delete "PACKAGES_CONFIG_ANALYSIS.md"
safe_delete "PROTECTION_ARCHITECTURE_INVESTIGATION.md"
safe_delete "REINVENTED_WHEELS_ANALYSIS.md"
safe_delete "TODO_ANALYSIS_REPORT.md"
safe_delete "WHEEL_ANALYSIS_INDEX.md"
safe_delete "BETTER_AUTH_OPTIMIZATION_ANALYSIS.md"

# Status files
safe_delete "DOC_CONSOLIDATION_STATUS.md"
safe_delete "FINAL_PERFORMANCE_OPTIMIZATION_STATUS.md"
safe_delete "SESSION-IMPLEMENTATION-STATUS.md"
safe_delete "STORAGE_MIGRATION_NOTES.md"

# Summary files
safe_delete "CLEANUP_SUMMARY.md"
safe_delete "CONSOLIDATION_SUMMARY.md"
safe_delete "DASHBOARD_INTEGRATION_SUMMARY.md"
safe_delete "FIXES_SUMMARY.md"
safe_delete "IMPLEMENTATION_SUMMARY.md"
safe_delete "PHASE1_IMPLEMENTATION_SUMMARY.md"
safe_delete "ARCHITECTURE_IMPROVEMENT_SUMMARY.md"

# Index files
safe_delete "ERROR_HANDLING_INDEX.md"
safe_delete "PHASE_1_DOCUMENTS_INDEX.md"
safe_delete "TODO_INDEX.md"
safe_delete "WHEEL_ANALYSIS_INDEX.md"
echo ""

echo "🗑️  Category 4: Fragmented Reports"
echo "----------------------------------"
safe_delete "COMPREHENSIVE_ARCHITECTURE_REPORT_PT1.md"
safe_delete "COMPREHENSIVE_ARCHITECTURE_REPORT_PT2.md"
safe_delete "COMPREHENSIVE_ARCHITECTURE_REPORT_PT3.md"
safe_delete "COMPREHENSIVE_ARCHITECTURE_REPORT_PT4.md"
safe_delete "COMPREHENSIVE_ARCHITECTURE_REPORT_PT5.md"
safe_delete "SDK_ARCHITECTURE_AUDIT_PHASE12_COMPLETE.md"
safe_delete "SDK_ARCHITECTURE_AUDIT_PHASE13_COMPLETE.md"
safe_delete "SDK_ARCHITECTURE_AUDIT_PHASE14_COMPLETE.md"
safe_delete "BRANCH_CONSOLIDATION_REPORT.md"
safe_delete "COMPLETE_BRANCH_INTEGRATION_REPORT.md"
safe_delete "COMPLETE_PERFORMANCE_OPTIMIZATION_REPORT.md"
safe_delete "DOCUMENTATION_CLEANUP_REPORT.md"
safe_delete "NOTIFICATION_EVALUATION_COMPLETION_REPORT.txt"
safe_delete "PHASE_1_COMPLETION_REPORT.md"
safe_delete "RECOVERY_REPORT.md"
safe_delete "SESSION-LAYER-COMPLETION-REPORT.md"
safe_delete "TESTING_REPORT.md"
safe_delete "TODO_REPORT.md"
echo ""

echo "🗑️  Category 5: Completed Phase Documents"
echo "------------------------------------------"
safe_delete "PHASE_1_COMPREHENSIVE_ANALYSIS.md"
safe_delete "PHASE_1_EXECUTION_SUMMARY.md"
safe_delete "PHASE_1_IMPLEMENTATION_PLAN.md"
safe_delete "PHASE_1_QUICK_CARD.md"
safe_delete "PHASE_1_START_HERE.md"
safe_delete "PHASE_16_RISK_SCORING_UNIFICATION.md"
safe_delete "PHASE1_SURGICAL_VERIFICATION.md"
safe_delete "IMPLEMENTATION_COMPLETE.md"
safe_delete "IMPLEMENTATION_GAPS_QUICK_REF.md"
safe_delete "SDK_THRESHOLD_MIGRATION_COMPLETE.md"
safe_delete "THRESHOLD_MIGRATION_PLAN.md"
echo ""

echo "🗑️  Category 6: Duplicate/Outdated Guides"
echo "------------------------------------------"
safe_delete "BETTER_AUTH_IMPLEMENTATION_GUIDE.md"
safe_delete "BETTER_AUTH_TDD_IMPLEMENTATION_GUIDE.md"
safe_delete "BETTER_AUTH_QUICK_FIXES.md"
safe_delete "AUTH_VALIDATION_CHECKLIST.md"
safe_delete "EXTENSION_FIX_GUIDE.md"
safe_delete "NOTIFICATION_MIGRATION_TECHNICAL_GUIDE.md"
safe_delete "NOTIFICATION_MATURITY_QUICK_REFERENCE.md"
safe_delete "NOTIFICATION_SYSTEM_MATURITY_EVALUATION.md"
safe_delete "IP_PROTECTION_MIGRATION_PLAN.md"
safe_delete "DOCKER_MEMORY_CPU_IMPLEMENTATION.md"
safe_delete "DOCKER_MEMORY_OPTIMIZATION.md"
safe_delete "DOCKER_OPTIMIZATION_QUICKSTART.md"
safe_delete "PATCHWORK_FIXES_ROADMAP.md"
safe_delete "REFACTORING_QUICK_REFERENCE.md"
safe_delete "TIER_2_RUNLIST.md"
echo ""

echo "🗑️  Category 7: TODO/Planning Files"
echo "------------------------------------"
safe_delete "TODO_DETAILED_TABLE.md"
safe_delete "TODO_REVISIT_POINTS.md"
safe_delete "TODO-STORAGE-CLEANUP.md"
safe_delete "S3_SETUP_TODO.md"
safe_delete "MERGE_STRATEGY.md"
safe_delete "MERGE_TO_DEV_STRATEGY.md"
safe_delete "SDK-MIGRATION-BRUTAL-ASSESSMENT.md"
safe_delete "SDK-MIGRATION-FINAL-SCORECARD.md"
echo ""

echo "🗑️  Category 8: Deployment/Commit Helpers"
echo "-------------------------------------------"
safe_delete "COMMIT_AND_DEPLOY.md"
safe_delete "CREATE_PR_INSTRUCTIONS.md"
safe_delete "GITHUB_DEPLOYMENT_README.md"
safe_delete "PR_BODY.md"
safe_delete "PR_DESCRIPTION.md"
safe_delete "ACCESS_DASHBOARD.md"
safe_delete "CRITICAL_SECURITY_FIXES.md"
safe_delete "SECURITY_FIXES_APPLIED.md"
safe_delete "URGENT_CREDENTIAL_ROTATION_GUIDE.md"
echo ""

echo "🗑️  Category 9: Miscellaneous Outdated"
echo "---------------------------------------"
safe_delete "baseline-test-report.md"
safe_delete "detection-implementation.md"
safe_delete "detection-implementation-summary.md"
safe_delete "implementation.md"
safe_delete "protect_repo_implementation.md"
safe_delete "repo-reorg.md"
safe_delete "surgical_implementation_protection.md"
safe_delete "surgical_implementation_protection_2.md"
safe_delete "DEAD_CODE.md"
safe_delete "ERROR_HANDLING_OVERVIEW.md"
safe_delete "ERROR_HANDLING_PROPOSAL.md"
safe_delete "ERROR_HANDLING_SUMMARY.txt"
safe_delete "EXECUTIVE_SUMMARY_2025-11-08.md"
safe_delete "GLOB_PATTERN_FIXES.md"
safe_delete "STORAGE_TEST_DELIVERABLES.md"
safe_delete "TESTING_MOBILE_UI.md"
safe_delete "VISUAL_ASSETS_CHECKLIST.md"

# Content synthesized into docs/
safe_delete "COMPREHENSIVE_ARCHITECTURE_ANALYSIS.md"
safe_delete "FLOW_ANALYSIS_DETAILED.md"
safe_delete "IP_PROTECTION_MIGRATION_PLAN.md"
safe_delete "NOTIFICATION_SYSTEM_MATURITY_EVALUATION.md"
safe_delete "TESTING_REPORT.md"
echo ""

echo "🗑️  Category 10: Duplicate/Unnecessary Files"
echo "---------------------------------------------"
safe_delete "README-DOCKER.md"  # Keep main DOCKER.md
safe_delete "QODER_CONTEXT7_INTEGRATION.md"  # Qoder-specific
safe_delete "DOCKER-QUICK-START.md"  # Redundant with main docs
safe_delete "DOCKER-SETUP-CHECKLIST.md"  # Redundant
safe_delete "DOCKER-TROUBLESHOOTING.md"  # Should be in docs/
safe_delete "DOCKER_DEPLOYMENT_GUIDE.md"  # Redundant
safe_delete "DOCUMENTATION_VERIFICATION_REPORT.md"
safe_delete "RUNBOOKS.md"  # Should be in docs/ if needed
echo ""

if [ "$DRY_RUN" = false ]; then
  echo "✅ Cleanup Complete!"
  echo ""
  echo "📊 Summary:"
  echo "  - Backup saved to: $BACKUP_DIR"
  echo "  - You can restore any file from the backup if needed"
  echo "  - To restore: mv $BACKUP_DIR/<path> $WORKSPACE_ROOT/<path>"
  echo ""
  echo "💡 Next steps:"
  echo "  1. Verify everything still works: pnpm build"
  echo "  2. If satisfied, delete backup: rm -rf $BACKUP_DIR"
  echo "  3. Commit changes: git add -A && git commit -m 'docs: cleanup outdated documentation'"
else
  echo "✅ Dry run complete!"
  echo ""
  echo "💡 To actually delete files, run:"
  echo "  ./scripts/cleanup-documentation.sh"
fi

