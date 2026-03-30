-- ============================================================
-- Qurl URL Shortener — Analytics Retention Cleanup
-- ============================================================
-- Scheduled function to delete expired analytics based on plan.
-- Business plan (unlimited) is never cleaned.

CREATE OR REPLACE FUNCTION cleanup_expired_analytics()
RETURNS void AS $$
BEGIN
  -- Clean free plan analytics (30 days)
  DELETE FROM url_scans
  WHERE short_code IN (
    SELECT u.short_code FROM urls u
    JOIN profiles p ON u.user_id = p.id
    WHERE p.plan = 'free'
  )
  AND scanned_at < now() - interval '30 days';

  -- Clean pro plan analytics (365 days)
  DELETE FROM url_scans
  WHERE short_code IN (
    SELECT u.short_code FROM urls u
    JOIN profiles p ON u.user_id = p.id
    WHERE p.plan = 'pro'
  )
  AND scanned_at < now() - interval '365 days';

  -- Clean anonymous link scans (7 days, matching link expiry)
  DELETE FROM url_scans
  WHERE short_code IN (
    SELECT u.short_code FROM urls u
    WHERE u.user_id IS NULL
  )
  AND scanned_at < now() - interval '7 days';
END;
$$ LANGUAGE plpgsql;
