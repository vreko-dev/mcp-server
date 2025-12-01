# User Data Erasure (GDPR Compliance)

## Full User Deletion

```sql
BEGIN;

DELETE FROM agent_suggestions WHERE user_id = '<user_id>';
DELETE FROM policy_evaluations WHERE user_id = '<user_id>';
DELETE FROM loops WHERE user_id = '<user_id>';
DELETE FROM feedback WHERE user_id = '<user_id>';
DELETE FROM post_accept_outcomes WHERE user_id = '<user_id>';
DELETE FROM api_key_usage WHERE api_key_id IN (
  SELECT id FROM api_keys WHERE user_id = '<user_id>'
);
DELETE FROM snapshots WHERE user_id = '<user_id>';
DELETE FROM quarantine_events WHERE original_event->>'userId' = '<user_id>';

-- Verify deletion
SELECT
  (SELECT COUNT(*) FROM agent_suggestions WHERE user_id = '<user_id>') AS agent_count,
  (SELECT COUNT(*) FROM policy_evaluations WHERE user_id = '<user_id>') AS policy_count;

COMMIT;
```

## Side Effects

- ✅ Raw telemetry data deleted
- ✅ Materialized views: User data becomes anonymous in aggregates (acceptable)
- ✅ Audit logs: Preserved for compliance (user_id can be pseudonymized)

## Verification

After deletion, run:

```sql
SELECT table_name, COUNT(*)
FROM information_schema.tables
WHERE table_schema = 'public'
AND EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = tables.table_name
    AND column_name = 'user_id'
)
GROUP BY table_name;
```