-- Client profiles — one per accounting client (org number is unique).
CREATE TABLE IF NOT EXISTS client_profiles (
  org_nr TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  nace_code TEXT,
  industry_template TEXT DEFAULT 'smb-standard',
  tripletex_customer_id INTEGER,
  contact_name TEXT,
  contact_email TEXT,
  pricing_model TEXT CHECK (pricing_model IN ('fixed', 'hourly', 'mixed')),
  monthly_fixed_price NUMERIC(12, 2),
  hourly_rate NUMERIC(8, 2),
  onboarding_status TEXT DEFAULT 'pending',
  assigned_accountant TEXT,
  brreg_data JSONB,
  data_quality_status TEXT DEFAULT 'pending' CHECK (data_quality_status IN ('clean', 'suspect', 'dirty', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_profiles_template ON client_profiles(industry_template);
CREATE INDEX idx_client_profiles_status ON client_profiles(onboarding_status);
