-- Push notification subscription storage
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS push_subscription TEXT,
  ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN profiles.push_subscription IS 'Web Push PushSubscription JSON (endpoint + keys)';
COMMENT ON COLUMN profiles.push_enabled IS 'Whether the user has opted in to push notifications';
