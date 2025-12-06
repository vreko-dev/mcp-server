import {
	account,
	aiChat,
	invitation,
	member,
	organization,
	planTypeEnum,
	purchase,
	purchaseTypeEnum,
	session,
	subscriptionStatusEnum,
	user,
} from "./postgres";
import * as snapbackSchema from "./snapback/index";

// Supabase Row Level Security (RLS) policies
export const supabasePolicies = {
	// User can only access their own data
	userOwnedData: `
    CREATE POLICY "Users can view their own data" 
    ON "user" 
    FOR SELECT 
    USING (id = auth.uid());
    
    CREATE POLICY "Users can update their own data" 
    ON "user" 
    FOR UPDATE 
    USING (id = auth.uid());
  `,

	// API keys can only be accessed by their owner
	apiKeyOwnership: `
    CREATE POLICY "Users can view their own API keys" 
    ON api_keys 
    FOR SELECT 
    USING (user_id = auth.uid());
    
    CREATE POLICY "Users can insert their own API keys" 
    ON api_keys 
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());
    
    CREATE POLICY "Users can update their own API keys" 
    ON api_keys 
    FOR UPDATE 
    USING (user_id = auth.uid());
    
    CREATE POLICY "Users can delete their own API keys" 
    ON api_keys 
    FOR DELETE 
    USING (user_id = auth.uid());
  `,

	// Organizations policies
	organizationAccess: `
    CREATE POLICY "Members can view organizations" 
    ON organization 
    FOR SELECT 
    USING (
      id IN (
        SELECT organization_id 
        FROM member 
        WHERE user_id = auth.uid()
      )
    );
  `,

	// SnapBack specific policies
	snapbackPolicies: `
    CREATE POLICY "Users can view their own API key metadata" 
    ON api_key_metadata 
    FOR SELECT 
    USING (user_id = auth.uid());
    
    CREATE POLICY "Users can view their own subscriptions" 
    ON subscriptions 
    FOR SELECT 
    USING (user_id = auth.uid());
    
    CREATE POLICY "Users can view their own usage logs" 
    ON api_usage_logs 
    FOR SELECT 
    USING (user_id = auth.uid());
  `,
};

// Supabase-specific indexes for better performance
export const supabaseIndexes = {
	// User indexes
	userIndexes: [
		'CREATE INDEX IF NOT EXISTS idx_user_email ON "user" (email);',
		'CREATE INDEX IF NOT EXISTS idx_user_username ON "user" (username);',
		'CREATE INDEX IF NOT EXISTS idx_user_created_at ON "user" (created_at);',
	],

	// API key indexes
	apiKeyIndexes: [
		"CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys (user_id);",
		"CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys (key);",
		"CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys (organization_id);",
	],

	// SnapBack indexes
	snapbackIndexes: [
		"CREATE INDEX IF NOT EXISTS idx_api_key_metadata_api_key_id ON api_key_metadata (api_key_id);",
		"CREATE INDEX IF NOT EXISTS idx_api_key_metadata_user_id ON api_key_metadata (user_id);",
		"CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);",
		"CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions (organization_id);",
		"CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs (user_id);",
		"CREATE INDEX IF NOT EXISTS idx_api_usage_logs_api_key_id ON api_usage_logs (api_key_id);",
		"CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs (created_at);",
		"CREATE INDEX IF NOT EXISTS idx_usage_stats_daily_user_id ON usage_stats_daily (user_id);",
		"CREATE INDEX IF NOT EXISTS idx_usage_stats_daily_date ON usage_stats_daily (date);",
	],
};

// Supabase views for common queries
export const supabaseViews = {
	userDashboardView: `
    CREATE OR REPLACE VIEW user_dashboard AS
    SELECT 
      u.id,
      u.name,
      u.email,
      u.username,
      u.created_at,
      COUNT(ak.id) as api_key_count,
      COUNT(s.id) as subscription_count,
      COALESCE(SUM(ul.total_requests), 0) as total_requests
    FROM "user" u
    LEFT JOIN api_keys ak ON ak.user_id = u.id
    LEFT JOIN subscriptions s ON s.user_id = u.id
    LEFT JOIN usage_stats_daily ul ON ul.user_id = u.id
    WHERE u.id = auth.uid()
    GROUP BY u.id, u.name, u.email, u.username, u.created_at;
  `,

	apiKeyUsageView: `
    CREATE OR REPLACE VIEW api_key_usage_summary AS
    SELECT 
      ak.id,
      ak.name,
      ak.user_id,
      ak.created_at,
      COUNT(aul.id) as usage_count,
      COALESCE(SUM(aul.tokens_used), 0) as total_tokens,
      MAX(aul.created_at) as last_used
    FROM api_keys ak
    LEFT JOIN api_usage_logs aul ON aul.api_key_id = ak.id
    WHERE ak.user_id = auth.uid()
    GROUP BY ak.id, ak.name, ak.user_id, ak.created_at;
  `,
};

// Helper function to generate Supabase-compatible schema
export const generateSupabaseSchema = () => {
	return {
		tables: {
			// Core tables
			user: user,
			session: session,
			account: account,
			organization: organization,
			member: member,
			invitation: invitation,
			purchase: purchase,
			aiChat: aiChat,

			// Enums
			subscriptionStatus: subscriptionStatusEnum,
			planType: planTypeEnum,
			purchaseType: purchaseTypeEnum,

			// SnapBack tables
			...snapbackSchema,
		},
		policies: supabasePolicies,
		indexes: supabaseIndexes,
		views: supabaseViews,
	};
};

// Export all SnapBack schema for Supabase compatibility
export * from "./snapback/index";
