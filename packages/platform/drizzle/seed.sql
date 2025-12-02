-- Seed test data for Better Auth users
INSERT INTO "user" ("id", "email", "emailVerified", "name", "createdAt", "updatedAt")
VALUES
  ('user-001', 'user1@example.com', true, 'Test User 1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user-002', 'user2@example.com', true, 'Test User 2', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user-003', 'user3@example.com', true, 'Test User 3', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('user-456', 'user456@example.com', true, 'Test User 456', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Seed test API keys (use actual schema from database)
INSERT INTO "api_keys" ("id", "user_id", "name", "created_at")
VALUES
  ('key-001', 'user-001', 'Test Key 1', CURRENT_TIMESTAMP),
  ('key-002', 'user-002', 'Test Key 2', CURRENT_TIMESTAMP),
  ('key-003', 'user-003', 'Test Key 3', CURRENT_TIMESTAMP),
  ('key-789', 'user-456', 'Test Key 789', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
