// Minimal typed guard for docs analytics
export type Tier = "all" | "free" | "solo" | "team" | "enterprise";

type PlanFilterChanged = {
	name: "docs_plan_filter_changed";
	props: { from_tier: Tier; to_tier: Tier; page_path: string };
};

type CtaClick = {
	name: "docs_cta_click";
	props: { feature_name: string; target_tier: Exclude<Tier, "all">; source_page: string; cta_text?: string };
};

type EnterpriseContact = {
	name: "docs_enterprise_contact_click";
	props: { source: "enterprise-hub" | "plans-limits" | "sso-page"; page_path: string };
};

type QuickstartComplete = {
	name: "quickstart_complete";
	props: { step_count: number; time_spent: number; tier_context: Tier };
};

type GuardianView = {
	name: "guardian_docs_view";
	props: { tier_filter: Tier; has_cta_visible: boolean };
};

export type DocsEvent = PlanFilterChanged | CtaClick | EnterpriseContact | QuickstartComplete | GuardianView;

function hasPosthog(): boolean {
	return typeof window !== "undefined" && !!(window as any).posthog?.capture;
}

export function captureDocsEvent(e: DocsEvent): void {
	if (!hasPosthog()) return;

	switch (e.name) {
		case "docs_plan_filter_changed": {
			const { from_tier, to_tier, page_path } = e.props ?? {};
			if (!from_tier || !to_tier || typeof page_path !== "string") {
				console.error("Bad docs_plan_filter_changed payload", e.props);
				return;
			}
			(window as any).posthog.capture(e.name, e.props);
			return;
		}
		case "docs_cta_click": {
			const { feature_name, target_tier, source_page } = e.props ?? {};
			if (!feature_name || !target_tier || !source_page) {
				console.error("Bad docs_cta_click payload", e.props);
				return;
			}
			(window as any).posthog.capture(e.name, e.props);
			return;
		}
		case "docs_enterprise_contact_click":
		case "quickstart_complete":
		case "guardian_docs_view": {
			(window as any).posthog.capture(e.name, e.props);
			return;
		}
	}
}
