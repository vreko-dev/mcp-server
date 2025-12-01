# Analytics Operations Runbooks

## Slow Queries (P95 > 150ms)

**Symptoms**: Dashboard loading slowly, query timeouts

**Diagnosis**:
1. Check query plans:
   ```sql
   EXPLAIN (ANALYZE, BUFFERS)
   SELECT * FROM agent_suggestions
   WHERE user_id = 'xxx' AND timestamp > NOW() - INTERVAL '30 days';
   ```
2. Check missing indices:
   ```sql
   SELECT schemaname, tablename, indexname
   FROM pg_indexes
   WHERE schemaname = 'public' AND tablename LIKE '%suggestions%';
   ```

**Resolution**:
1. If no index used, verify indices exist
2. Run VACUUM ANALYZE if table bloated
3. Check connection pool exhaustion

## Duplicate Events Detected

**Symptoms**: Analytics counts look inflated

**Diagnosis**:
```sql
SELECT request_id, COUNT(*)
FROM agent_suggestions
GROUP BY request_id
HAVING COUNT(*) > 1;
```

**Resolution**:
1. Verify UNIQUE constraint exists:
   ```sql
   SELECT constraint_name, constraint_type
   FROM information_schema.table_constraints
   WHERE table_name = 'agent_suggestions'
     AND constraint_type = 'UNIQUE';
   ```
2. Clean duplicates:
   ```sql
   DELETE FROM agent_suggestions a USING agent_suggestions b
   WHERE a.id > b.id AND a.request_id = b.request_id;
   ```

## Failed Retention Job

**Symptoms**: Old data not being purged, disk usage growing

**Diagnosis**:
```sql
SELECT
  DATE_TRUNC('month', timestamp) AS month,
  COUNT(*) AS event_count,
  pg_size_pretty(pg_total_relation_size('agent_suggestions')) AS table_size
FROM agent_suggestions
GROUP BY month
ORDER BY month;
```

**Resolution**:
1. Check retention config:
   ```sql
   SELECT * FROM retention_config WHERE is_enabled = true;
   ```
2. Manual purge (with caution):
   ```sql
   DELETE FROM agent_suggestions
   WHERE timestamp < NOW() - INTERVAL '90 days';
   ```
3. Verify retention service is running

## Quarantined Events

**Symptoms**: Data quality issues, missing events in analytics

**Diagnosis**:
```sql
SELECT COUNT(*) as quarantine_count
FROM quarantine_events
WHERE attempted_at > NOW() - INTERVAL '1 hour';
```

**Resolution**:
1. Check quarantine_events table for failed events:
   ```sql
   SELECT original_event, error_reason, attempted_at
   FROM quarantine_events
   ORDER BY attempted_at DESC
   LIMIT 10;
   ```
2. Investigate root cause of failures
3. Fix and replay events if necessary

## Materialized View Refresh Failures

**Symptoms**: Dashboard showing stale data

**Diagnosis**:
1. Check if refresh job is running:
   ```sql
   SELECT last_run_at FROM retention_config WHERE table_name = 'daily_metrics';
   ```
2. Check for errors in logs

**Resolution**:
1. Manually refresh materialized view:
   ```sql
   REFRESH MATERIALIZED VIEW CONCURRENTLY daily_metrics;
   ```
2. Verify refresh function works:
   ```sql
   SELECT refresh_daily_metrics();
   ```
3. Check cron job scheduling

## Connection Pool Exhaustion

**Symptoms**: Database connection errors, timeouts

**Diagnosis**:
1. Check current connections:
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```
2. Check connection states:
   ```sql
   SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
   ```

**Resolution**:
1. Increase connection pool size in configuration
2. Check for connection leaks in application code
3. Optimize long-running queries
4. Add connection timeouts