-- ============================================================
-- Qurl URL Shortener — Initial Schema
-- ============================================================

-- 1. Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  links_limit INT NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 2. URLs (short links)
CREATE TABLE urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  short_code VARCHAR(10) UNIQUE NOT NULL,
  long_url TEXT NOT NULL,
  title VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_urls_user_id ON urls(user_id);
CREATE INDEX idx_urls_short_code ON urls(short_code);

ALTER TABLE urls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own urls"
  ON urls FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own urls"
  ON urls FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own urls"
  ON urls FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own urls"
  ON urls FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for API redirect lookups
CREATE POLICY "Service role can read all urls"
  ON urls FOR SELECT
  USING (auth.role() = 'service_role');

-- 3. Click totals (aggregate counter)
CREATE TABLE click_totals (
  short_code VARCHAR(10) PRIMARY KEY REFERENCES urls(short_code) ON DELETE CASCADE,
  total_clicks BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create click_totals row when a URL is created
CREATE OR REPLACE FUNCTION handle_new_url()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.click_totals (short_code)
  VALUES (NEW.short_code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_url_created
  AFTER INSERT ON urls
  FOR EACH ROW EXECUTE FUNCTION handle_new_url();

-- 4. URL scans (detailed analytics)
CREATE TABLE url_scans (
  id BIGSERIAL PRIMARY KEY,
  short_code VARCHAR(10) NOT NULL REFERENCES urls(short_code) ON DELETE CASCADE,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  country VARCHAR(2),
  city VARCHAR(100),
  user_agent TEXT,
  referer TEXT,
  device_type VARCHAR(10)
);

CREATE INDEX idx_scans_short_code ON url_scans(short_code);
CREATE INDEX idx_scans_scanned_at ON url_scans(scanned_at DESC);
CREATE INDEX idx_scans_short_code_scanned_at ON url_scans(short_code, scanned_at DESC);

-- 5. RPC: Atomic click increment
CREATE OR REPLACE FUNCTION increment_clicks(code TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE click_totals
  SET total_clicks = total_clicks + 1, updated_at = now()
  WHERE short_code = code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
