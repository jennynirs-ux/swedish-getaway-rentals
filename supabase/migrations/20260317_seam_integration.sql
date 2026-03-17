-- Add Seam access code tracking to lock_access_log
ALTER TABLE lock_access_log
  ADD COLUMN IF NOT EXISTS seam_access_code_id TEXT;

-- Index for webhook lookups
CREATE INDEX IF NOT EXISTS idx_lock_access_log_seam_id
  ON lock_access_log (seam_access_code_id)
  WHERE seam_access_code_id IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN lock_access_log.seam_access_code_id IS
  'Seam API access_code_id — used to track status via webhooks and to revoke codes';
