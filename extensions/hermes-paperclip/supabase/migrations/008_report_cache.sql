-- Report cache — stores generated Portalklar reports.
CREATE TABLE IF NOT EXISTS report_cache (
  id SERIAL PRIMARY KEY,
  client_org_nr TEXT NOT NULL REFERENCES client_profiles(org_nr),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  report_type TEXT NOT NULL DEFAULT 'smb-standard',
  report_data JSONB NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('H', 'M', 'L')),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_org_nr, period_year, period_month, report_type)
);

CREATE INDEX idx_report_cache_client ON report_cache(client_org_nr);
CREATE INDEX idx_report_cache_period ON report_cache(period_year DESC, period_month DESC);
