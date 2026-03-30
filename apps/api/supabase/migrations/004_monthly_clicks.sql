CREATE OR REPLACE FUNCTION count_user_monthly_clicks(
  p_user_id UUID,
  p_month_start TIMESTAMPTZ
)
RETURNS BIGINT AS $$
  SELECT COUNT(*)
  FROM url_scans us
  JOIN urls u ON u.short_code = us.short_code
  WHERE u.user_id = p_user_id
    AND us.scanned_at >= p_month_start;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
