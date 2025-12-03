/**
 * Infrastructure Events - Complete Event Taxonomy
 *
 * Type-safe event definitions for SnapBack analytics.
 * Aligned with PostHog best practices and TDD strategy.
 */
export declare const AnalyticsEvents: {
    readonly AUTH_SIGNUP_COMPLETED: "auth_signup_completed";
    readonly AUTH_LOGIN_COMPLETED: "auth_login_completed";
    readonly AUTH_LOGOUT_COMPLETED: "auth_logout_completed";
    readonly AUTH_EMAIL_VERIFIED: "auth_email_verified";
    readonly AUTH_PASSWORD_RESET_REQUESTED: "auth_password_reset_requested";
    readonly AUTH_PASSWORD_RESET_COMPLETED: "auth_password_reset_completed";
    readonly SNAPSHOT_CREATED: "snapshot_created";
    readonly SNAPSHOT_RESTORED: "snapshot_restored";
    readonly SNAPSHOT_DELETED: "snapshot_deleted";
    readonly SNAPSHOT_SEARCHED: "snapshot_searched";
    readonly SNAPSHOT_LIMIT_HIT: "snapshot_limit_hit";
    readonly SNAPSHOT_AUTO_CREATED: "snapshot_auto_created";
    readonly SNAPSHOT_SHARED: "snapshot_shared";
    readonly SNAPSHOT_EXPORTED: "snapshot_exported";
    readonly SNAPSHOT_VIEWED: "snapshot_viewed";
    readonly SNAPSHOT_DIFF_VIEWED: "snapshot_diff_viewed";
    readonly BILLING_UPGRADE_PROMPT_SHOWN: "billing_upgrade_prompt_shown";
    readonly BILLING_UPGRADE_PROMPT_CLICKED: "billing_upgrade_prompt_clicked";
    readonly BILLING_PRICING_VIEWED: "billing_pricing_viewed";
    readonly BILLING_CHECKOUT_STARTED: "billing_checkout_started";
    readonly BILLING_CHECKOUT_COMPLETED: "billing_checkout_completed";
    readonly BILLING_CHECKOUT_ABANDONED: "billing_checkout_abandoned";
    readonly BILLING_SUBSCRIPTION_UPGRADED: "billing_subscription_upgraded";
    readonly BILLING_SUBSCRIPTION_DOWNGRADED: "billing_subscription_downgraded";
    readonly BILLING_SUBSCRIPTION_CANCELLED: "billing_subscription_cancelled";
    readonly BILLING_PAYMENT_FAILED: "billing_payment_failed";
    readonly BILLING_COUPON_APPLIED: "billing_coupon_applied";
    readonly BILLING_INVOICE_VIEWED: "billing_invoice_viewed";
    readonly EXTENSION_INSTALLED: "extension_installed";
    readonly EXTENSION_ACTIVATED: "extension_activated";
    readonly EXTENSION_COMMAND_USED: "extension_command_used";
    readonly EXTENSION_SETTINGS_CHANGED: "extension_settings_changed";
    readonly EXTENSION_ERROR_OCCURRED: "extension_error_occurred";
    readonly EXTENSION_UPDATED: "extension_updated";
    readonly EXTENSION_UNINSTALLED: "extension_uninstalled";
    readonly EXTENSION_FEEDBACK_SUBMITTED: "extension_feedback_submitted";
    readonly DASHBOARD_VIEWED: "dashboard_viewed";
    readonly DASHBOARD_API_KEY_CREATED: "dashboard_api_key_created";
    readonly DASHBOARD_API_KEY_REVOKED: "dashboard_api_key_revoked";
    readonly DASHBOARD_USAGE_CHART_VIEWED: "dashboard_usage_chart_viewed";
    readonly DASHBOARD_SETTINGS_UPDATED: "dashboard_settings_updated";
    readonly DASHBOARD_SEARCH_PERFORMED: "dashboard_search_performed";
    readonly DASHBOARD_EXPORT_TRIGGERED: "dashboard_export_triggered";
    readonly DASHBOARD_HELP_ACCESSED: "dashboard_help_accessed";
    readonly TEAM_CREATED: "team_created";
    readonly TEAM_MEMBER_INVITED: "team_member_invited";
    readonly TEAM_MEMBER_JOINED: "team_member_joined";
    readonly TEAM_SNAPSHOT_SHARED: "team_snapshot_shared";
    readonly TEAM_SETTINGS_CHANGED: "team_settings_changed";
    readonly TEAM_MEMBER_REMOVED: "team_member_removed";
    readonly AI_SUGGESTION_SHOWN: "ai_suggestion_shown";
    readonly AI_SUGGESTION_ACCEPTED: "ai_suggestion_accepted";
    readonly AI_SUGGESTION_REJECTED: "ai_suggestion_rejected";
    readonly AI_RISK_DETECTED: "ai_risk_detected";
    readonly AI_RISK_PREVENTED: "ai_risk_prevented";
    readonly API_CALL_MADE: "api_call_made";
    readonly API_RATE_LIMIT_HIT: "api_rate_limit_hit";
    readonly API_ERROR_OCCURRED: "api_error_occurred";
    readonly API_KEY_ROTATED: "api_key_rotated";
    readonly API_WEBHOOK_CONFIGURED: "api_webhook_configured";
};
export type AnalyticsEvent = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];
export interface BaseEventProperties {
    plan?: "free" | "pro" | "team" | "enterprise";
    environment?: "extension" | "web" | "api" | "cli";
    version?: string;
    timestamp?: string;
}
export interface AuthSignupCompletedProps extends BaseEventProperties {
    signup_method: "email" | "google" | "github";
    referrer: string | null;
    utm_source?: string;
    utm_campaign?: string;
    utm_medium?: string;
}
export interface AuthLoginCompletedProps extends BaseEventProperties {
    login_method: "email" | "google" | "github";
    is_new_session: boolean;
}
export interface AuthLogoutCompletedProps extends BaseEventProperties {
    session_duration_seconds: number;
}
export interface AuthEmailVerifiedProps extends BaseEventProperties {
    time_to_verify_minutes: number;
}
export interface AuthPasswordResetRequestedProps extends BaseEventProperties {
    email: string;
}
export interface AuthPasswordResetCompletedProps extends BaseEventProperties {
    time_from_request_minutes: number;
}
export interface SnapshotCreatedProps extends BaseEventProperties {
    file_extension: string;
    file_size_bytes: number;
    has_message: boolean;
    trigger: "manual" | "auto" | "ai_suggestion";
    environment: "extension" | "cli";
}
export interface SnapshotRestoredProps extends BaseEventProperties {
    snapshot_age_minutes: number;
    file_extension: string;
    restore_method: "click" | "keyboard" | "command_palette";
    was_successful: boolean;
}
export interface SnapshotDeletedProps extends BaseEventProperties {
    snapshot_age_days: number;
    delete_method: "single" | "bulk";
}
export interface SnapshotSearchedProps extends BaseEventProperties {
    query_length: number;
    results_count: number;
    filter_used: boolean;
}
export interface SnapshotLimitHitProps extends BaseEventProperties {
    current_count: number;
    plan_limit: number;
    upgrade_prompt_shown: boolean;
}
export interface SnapshotAutoCreatedProps extends BaseEventProperties {
    ai_confidence: number;
    risk_score: number;
    reason: "dangerous_operation" | "merge_conflict" | "api_response";
}
export interface SnapshotSharedProps extends BaseEventProperties {
    share_method: "link" | "email" | "slack";
    recipient_count: number;
}
export interface SnapshotExportedProps extends BaseEventProperties {
    export_format: "json" | "zip" | "git_patch";
    snapshot_count: number;
}
export interface SnapshotViewedProps extends BaseEventProperties {
    view_location: "dashboard" | "extension" | "api";
    snapshot_age_days: number;
}
export interface SnapshotDiffViewedProps extends BaseEventProperties {
    lines_added: number;
    lines_removed: number;
    has_conflicts: boolean;
}
export interface BillingUpgradePromptShownProps extends BaseEventProperties {
    trigger: "storage_limit" | "team_detection" | "feature_lock" | "manual";
    prompt_location: "extension" | "dashboard" | "api_response";
    current_usage_percent: number;
}
export interface BillingUpgradePromptClickedProps extends BaseEventProperties {
    trigger: string;
    prompt_location: string;
    time_to_click_seconds: number;
}
export interface BillingPricingViewedProps extends BaseEventProperties {
    referrer: string | null;
    current_plan: string;
}
export interface BillingCheckoutStartedProps extends BaseEventProperties {
    plan_selected: "pro" | "team" | "enterprise";
    billing_cycle: "monthly" | "yearly";
    price_usd: number;
}
export interface BillingCheckoutCompletedProps extends BaseEventProperties {
    plan: "pro" | "team" | "enterprise";
    billing_cycle: "monthly" | "yearly";
    price_usd: number;
    time_to_convert_minutes: number;
    coupon_used: string | null;
}
export interface BillingCheckoutAbandonedProps extends BaseEventProperties {
    plan_attempted: string;
    checkout_step: "payment_info" | "review" | "processing";
    time_spent_seconds: number;
}
export interface BillingSubscriptionUpgradedProps extends BaseEventProperties {
    from_plan: string;
    to_plan: string;
    price_increase_usd: number;
}
export interface BillingSubscriptionDowngradedProps extends BaseEventProperties {
    from_plan: string;
    to_plan: string;
    reason: string | null;
}
export interface BillingSubscriptionCancelledProps extends Omit<BaseEventProperties, "plan"> {
    plan: string;
    cancellation_reason: string;
    was_prompted_to_stay: boolean;
    stayed: boolean;
}
export interface BillingPaymentFailedProps extends Omit<BaseEventProperties, "plan"> {
    plan: string;
    error_code: string;
    retry_count: number;
}
export interface BillingCouponAppliedProps extends Omit<BaseEventProperties, "plan"> {
    coupon_code: string;
    discount_percent: number;
    plan: string;
}
export interface BillingInvoiceViewedProps extends BaseEventProperties {
    invoice_date: string;
    amount_usd: number;
}
export interface ExtensionInstalledProps extends BaseEventProperties {
    version: string;
    vscode_version: string;
    os: "windows" | "mac" | "linux";
    install_source: "marketplace" | "direct" | "referral";
}
export interface ExtensionActivatedProps extends BaseEventProperties {
    time_since_install_minutes: number;
    workspace_type: "single" | "multi";
}
export interface ExtensionCommandUsedProps extends BaseEventProperties {
    command: string;
    trigger_method: "keyboard" | "command_palette" | "context_menu";
}
export interface ExtensionSettingsChangedProps extends BaseEventProperties {
    setting_key: string;
    old_value: string | number | boolean;
    new_value: string | number | boolean;
}
export interface ExtensionErrorOccurredProps extends BaseEventProperties {
    error_type: string;
    error_message: string;
    stack_trace: string;
    file_context: string | null;
}
export interface ExtensionUpdatedProps extends BaseEventProperties {
    from_version: string;
    to_version: string;
    update_type: "major" | "minor" | "patch";
}
export interface ExtensionUninstalledProps extends BaseEventProperties {
    days_since_install: number;
    total_snapshots_created: number;
    reason: string | null;
}
export interface ExtensionFeedbackSubmittedProps extends BaseEventProperties {
    rating: 1 | 2 | 3 | 4 | 5;
    feedback_text_length: number;
    feedback_category: string;
}
export interface DashboardViewedProps extends BaseEventProperties {
    page: "overview" | "snapshots" | "usage" | "settings" | "billing";
    referrer: string | null;
}
export interface DashboardApiKeyCreatedProps extends BaseEventProperties {
    key_name: string;
    key_type: "production" | "test";
}
export interface DashboardApiKeyRevokedProps extends BaseEventProperties {
    key_age_days: number;
    was_ever_used: boolean;
}
export interface DashboardUsageChartViewedProps extends BaseEventProperties {
    time_range: "7d" | "30d" | "90d" | "custom";
    chart_type: "line" | "bar";
}
export interface DashboardSettingsUpdatedProps extends BaseEventProperties {
    settings_changed: string[];
}
export interface DashboardSearchPerformedProps extends BaseEventProperties {
    query: string;
    results_count: number;
    search_location: "snapshots" | "files" | "global";
}
export interface DashboardExportTriggeredProps extends BaseEventProperties {
    export_type: "snapshots" | "usage_data" | "invoice";
    format: "csv" | "json" | "pdf";
}
export interface DashboardHelpAccessedProps extends BaseEventProperties {
    doc_page: string;
    access_method: "search" | "link" | "navigation";
}
export interface TeamCreatedProps extends BaseEventProperties {
    team_size: number;
    plan: "team" | "enterprise";
}
export interface TeamMemberInvitedProps extends BaseEventProperties {
    role: "admin" | "member" | "viewer";
    invitation_method: "email" | "link";
}
export interface TeamMemberJoinedProps extends BaseEventProperties {
    time_to_join_hours: number;
    role: string;
}
export interface TeamSnapshotSharedProps extends BaseEventProperties {
    recipient_count: number;
    share_method: "internal" | "external_link";
}
export interface TeamSettingsChangedProps extends BaseEventProperties {
    setting_key: string;
    changed_by_role: "owner" | "admin";
}
export interface TeamMemberRemovedProps extends BaseEventProperties {
    member_tenure_days: number;
    removal_reason: "voluntary" | "involuntary";
}
export interface AiSuggestionShownProps extends BaseEventProperties {
    suggestion_type: "snapshot" | "restore" | "cleanup";
    confidence_score: number;
    context: string;
}
export interface AiSuggestionAcceptedProps extends BaseEventProperties {
    suggestion_type: string;
    confidence_score: number;
    time_to_accept_seconds: number;
}
export interface AiSuggestionRejectedProps extends BaseEventProperties {
    suggestion_type: string;
    rejection_reason: string | null;
}
export interface AiRiskDetectedProps extends BaseEventProperties {
    risk_type: "security" | "performance" | "breaking_change";
    risk_score: number;
    was_prevented: boolean;
}
export interface AiRiskPreventedProps extends BaseEventProperties {
    risk_type: string;
    risk_score: number;
    snapshot_created: boolean;
}
export interface ApiCallMadeProps extends BaseEventProperties {
    endpoint: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    response_time_ms: number;
    status_code: number;
}
export interface ApiRateLimitHitProps extends BaseEventProperties {
    endpoint: string;
    limit_type: "per_minute" | "per_hour" | "per_day";
    current_plan: string;
}
export interface ApiErrorOccurredProps extends BaseEventProperties {
    endpoint: string;
    error_code: string;
    error_message: string;
}
export interface ApiKeyRotatedProps extends BaseEventProperties {
    old_key_age_days: number;
    rotation_reason: "scheduled" | "security" | "manual";
}
export interface ApiWebhookConfiguredProps extends BaseEventProperties {
    webhook_url: string;
    event_types: string[];
}
export interface EventPropertiesMap {
    [AnalyticsEvents.AUTH_SIGNUP_COMPLETED]: AuthSignupCompletedProps;
    [AnalyticsEvents.AUTH_LOGIN_COMPLETED]: AuthLoginCompletedProps;
    [AnalyticsEvents.AUTH_LOGOUT_COMPLETED]: AuthLogoutCompletedProps;
    [AnalyticsEvents.AUTH_EMAIL_VERIFIED]: AuthEmailVerifiedProps;
    [AnalyticsEvents.AUTH_PASSWORD_RESET_REQUESTED]: AuthPasswordResetRequestedProps;
    [AnalyticsEvents.AUTH_PASSWORD_RESET_COMPLETED]: AuthPasswordResetCompletedProps;
    [AnalyticsEvents.SNAPSHOT_CREATED]: SnapshotCreatedProps;
    [AnalyticsEvents.SNAPSHOT_RESTORED]: SnapshotRestoredProps;
    [AnalyticsEvents.SNAPSHOT_DELETED]: SnapshotDeletedProps;
    [AnalyticsEvents.SNAPSHOT_SEARCHED]: SnapshotSearchedProps;
    [AnalyticsEvents.SNAPSHOT_LIMIT_HIT]: SnapshotLimitHitProps;
    [AnalyticsEvents.SNAPSHOT_AUTO_CREATED]: SnapshotAutoCreatedProps;
    [AnalyticsEvents.SNAPSHOT_SHARED]: SnapshotSharedProps;
    [AnalyticsEvents.SNAPSHOT_EXPORTED]: SnapshotExportedProps;
    [AnalyticsEvents.SNAPSHOT_VIEWED]: SnapshotViewedProps;
    [AnalyticsEvents.SNAPSHOT_DIFF_VIEWED]: SnapshotDiffViewedProps;
    [AnalyticsEvents.BILLING_UPGRADE_PROMPT_SHOWN]: BillingUpgradePromptShownProps;
    [AnalyticsEvents.BILLING_UPGRADE_PROMPT_CLICKED]: BillingUpgradePromptClickedProps;
    [AnalyticsEvents.BILLING_PRICING_VIEWED]: BillingPricingViewedProps;
    [AnalyticsEvents.BILLING_CHECKOUT_STARTED]: BillingCheckoutStartedProps;
    [AnalyticsEvents.BILLING_CHECKOUT_COMPLETED]: BillingCheckoutCompletedProps;
    [AnalyticsEvents.BILLING_CHECKOUT_ABANDONED]: BillingCheckoutAbandonedProps;
    [AnalyticsEvents.BILLING_SUBSCRIPTION_UPGRADED]: BillingSubscriptionUpgradedProps;
    [AnalyticsEvents.BILLING_SUBSCRIPTION_DOWNGRADED]: BillingSubscriptionDowngradedProps;
    [AnalyticsEvents.BILLING_SUBSCRIPTION_CANCELLED]: BillingSubscriptionCancelledProps;
    [AnalyticsEvents.BILLING_PAYMENT_FAILED]: BillingPaymentFailedProps;
    [AnalyticsEvents.BILLING_COUPON_APPLIED]: BillingCouponAppliedProps;
    [AnalyticsEvents.BILLING_INVOICE_VIEWED]: BillingInvoiceViewedProps;
    [AnalyticsEvents.EXTENSION_INSTALLED]: ExtensionInstalledProps;
    [AnalyticsEvents.EXTENSION_ACTIVATED]: ExtensionActivatedProps;
    [AnalyticsEvents.EXTENSION_COMMAND_USED]: ExtensionCommandUsedProps;
    [AnalyticsEvents.EXTENSION_SETTINGS_CHANGED]: ExtensionSettingsChangedProps;
    [AnalyticsEvents.EXTENSION_ERROR_OCCURRED]: ExtensionErrorOccurredProps;
    [AnalyticsEvents.EXTENSION_UPDATED]: ExtensionUpdatedProps;
    [AnalyticsEvents.EXTENSION_UNINSTALLED]: ExtensionUninstalledProps;
    [AnalyticsEvents.EXTENSION_FEEDBACK_SUBMITTED]: ExtensionFeedbackSubmittedProps;
    [AnalyticsEvents.DASHBOARD_VIEWED]: DashboardViewedProps;
    [AnalyticsEvents.DASHBOARD_API_KEY_CREATED]: DashboardApiKeyCreatedProps;
    [AnalyticsEvents.DASHBOARD_API_KEY_REVOKED]: DashboardApiKeyRevokedProps;
    [AnalyticsEvents.DASHBOARD_USAGE_CHART_VIEWED]: DashboardUsageChartViewedProps;
    [AnalyticsEvents.DASHBOARD_SETTINGS_UPDATED]: DashboardSettingsUpdatedProps;
    [AnalyticsEvents.DASHBOARD_SEARCH_PERFORMED]: DashboardSearchPerformedProps;
    [AnalyticsEvents.DASHBOARD_EXPORT_TRIGGERED]: DashboardExportTriggeredProps;
    [AnalyticsEvents.DASHBOARD_HELP_ACCESSED]: DashboardHelpAccessedProps;
    [AnalyticsEvents.TEAM_CREATED]: TeamCreatedProps;
    [AnalyticsEvents.TEAM_MEMBER_INVITED]: TeamMemberInvitedProps;
    [AnalyticsEvents.TEAM_MEMBER_JOINED]: TeamMemberJoinedProps;
    [AnalyticsEvents.TEAM_SNAPSHOT_SHARED]: TeamSnapshotSharedProps;
    [AnalyticsEvents.TEAM_SETTINGS_CHANGED]: TeamSettingsChangedProps;
    [AnalyticsEvents.TEAM_MEMBER_REMOVED]: TeamMemberRemovedProps;
    [AnalyticsEvents.AI_SUGGESTION_SHOWN]: AiSuggestionShownProps;
    [AnalyticsEvents.AI_SUGGESTION_ACCEPTED]: AiSuggestionAcceptedProps;
    [AnalyticsEvents.AI_SUGGESTION_REJECTED]: AiSuggestionRejectedProps;
    [AnalyticsEvents.AI_RISK_DETECTED]: AiRiskDetectedProps;
    [AnalyticsEvents.AI_RISK_PREVENTED]: AiRiskPreventedProps;
    [AnalyticsEvents.API_CALL_MADE]: ApiCallMadeProps;
    [AnalyticsEvents.API_RATE_LIMIT_HIT]: ApiRateLimitHitProps;
    [AnalyticsEvents.API_ERROR_OCCURRED]: ApiErrorOccurredProps;
    [AnalyticsEvents.API_KEY_ROTATED]: ApiKeyRotatedProps;
    [AnalyticsEvents.API_WEBHOOK_CONFIGURED]: ApiWebhookConfiguredProps;
}
