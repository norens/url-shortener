-- ============================================================
-- Qurl — QR Code Support
-- ============================================================
-- Adds per-link QR customization storage and QR-vs-direct scan source tracking.

-- ============================================================
-- 1. QR configurations (one-to-one with urls)
-- ============================================================
CREATE TABLE qr_configs (
  short_code          VARCHAR(10) PRIMARY KEY REFERENCES urls(short_code) ON DELETE CASCADE,
  fg_color            TEXT,
  bg_color            TEXT,
  logo_url            TEXT,
  dots_style          TEXT,
  corners_style       TEXT,
  corners_dot_style   TEXT,
  gradient            JSONB,
  frame_config        JSONB,
  ecc                 VARCHAR(1),
  preset_id           TEXT,
  size_px             INT NOT NULL DEFAULT 512,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT qr_configs_ecc_valid CHECK (ecc IS NULL OR ecc IN ('L','M','Q','H')),
  CONSTRAINT qr_configs_size_sane CHECK (size_px BETWEEN 128 AND 4096)
);

CREATE INDEX idx_qr_configs_preset ON qr_configs(preset_id) WHERE preset_id IS NOT NULL;

ALTER TABLE qr_configs ENABLE ROW LEVEL SECURITY;

-- Users can read/insert/update/delete rows whose short_code belongs to them.
CREATE POLICY "Users can read own qr_configs"
  ON qr_configs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM urls u
    WHERE u.short_code = qr_configs.short_code AND u.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own qr_configs"
  ON qr_configs FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM urls u
    WHERE u.short_code = qr_configs.short_code AND u.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own qr_configs"
  ON qr_configs FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM urls u
    WHERE u.short_code = qr_configs.short_code AND u.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own qr_configs"
  ON qr_configs FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM urls u
    WHERE u.short_code = qr_configs.short_code AND u.user_id = auth.uid()
  ));

-- Service role bypass (needed for public /api/qr/:code.svg endpoint that renders
-- unauthenticated QR images but must still read the config).
CREATE POLICY "Service role full access qr_configs"
  ON qr_configs FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================
-- 2. updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION qr_configs_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER qr_configs_touch
  BEFORE UPDATE ON qr_configs
  FOR EACH ROW EXECUTE FUNCTION qr_configs_touch_updated_at();

-- ============================================================
-- 3. Scan source column (QR vs direct click differentiation)
-- ============================================================
ALTER TABLE url_scans ADD COLUMN source VARCHAR(16);
COMMENT ON COLUMN url_scans.source IS
  'Source channel: NULL = direct click, ''qr'' = scanned QR. Future values possible (''extension'', ''api'').';

CREATE INDEX idx_scans_source ON url_scans(source) WHERE source IS NOT NULL;
CREATE INDEX idx_scans_short_code_source_time
  ON url_scans(short_code, source, scanned_at DESC);

-- ============================================================
-- 4. RPC: scan source breakdown for analytics
-- ============================================================
CREATE OR REPLACE FUNCTION get_scan_source_breakdown(
  p_short_code TEXT,
  p_since      TIMESTAMPTZ
)
RETURNS TABLE(source TEXT, count BIGINT) AS $$
  SELECT COALESCE(source, 'direct')::TEXT AS source,
         COUNT(*)::BIGINT
  FROM url_scans
  WHERE short_code = p_short_code
    AND (p_since IS NULL OR scanned_at >= p_since)
  GROUP BY 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_scan_source_breakdown(TEXT, TIMESTAMPTZ) TO authenticated, anon, service_role;
