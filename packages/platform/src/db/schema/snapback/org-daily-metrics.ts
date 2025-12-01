import { createId as cuid } from "@paralleldrive/cuid2";
import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { organization } from "../postgres.js";

// Organization daily metrics table
// Stores aggregated metrics for each organization on a daily basis
export const orgDailyMetrics = pgTable(
	"org_daily_metrics",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => cuid()),
		organizationId: text("organization_id")
			.notNull()
			.references(() => organization.id, { onDelete: "cascade" }),
		date: timestamp("date").notNull(),

		// Incident metrics
		incidentsDetected: integer("incidents_detected").notNull().default(0),
		incidentsPrevented: integer("incidents_prevented").notNull().default(0),
		timeToRestoreMs: integer("time_to_restore_ms"), // Average time to restore

		// Snapshot metrics
		snapshotsCreated: integer("snapshots_created").notNull().default(0),
		snapshotsRestored: integer("snapshots_restored").notNull().default(0),
		bytesSaved: integer("bytes_saved").notNull().default(0),

		// Risk metrics
		highSeverityRisks: integer("high_severity_risks").notNull().default(0),
		mediumSeverityRisks: integer("medium_severity_risks").notNull().default(0),
		lowSeverityRisks: integer("low_severity_risks").notNull().default(0),

		// API usage metrics
		apiCalls: integer("api_calls").notNull().default(0),
		apiErrors: integer("api_errors").notNull().default(0),

		// Feature adoption metrics
		featuresUsed: jsonb("features_used").default(JSON.stringify({})), // { "feature_name": count }

		// Performance metrics
		avgResponseTimeMs: integer("avg_response_time_ms"),
		p95ResponseTimeMs: integer("p95_response_time_ms"),

		// Client metrics
		activeUsers: integer("active_users").notNull().default(0),
		clientVersions: jsonb("client_versions").default(JSON.stringify({})), // { "version": count }

		createdAt: timestamp("created_at").notNull().defaultNow(),
		updatedAt: timestamp("updated_at").notNull().defaultNow(),
	},
	(table) => ({
		orgDateUnique: uniqueIndex("org_daily_metrics_org_date_unique").on(table.organizationId, table.date),
		dateIndex: uniqueIndex("org_daily_metrics_date_idx").on(table.date),
	}),
);

export type OrgDailyMetric = typeof orgDailyMetrics.$inferSelect;
export type NewOrgDailyMetric = typeof orgDailyMetrics.$inferInsert;
