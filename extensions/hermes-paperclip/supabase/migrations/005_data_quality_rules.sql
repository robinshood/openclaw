-- Data quality rules — configurable validation rules for Renvasken.
CREATE TABLE IF NOT EXISTS data_quality_rules (
  id SERIAL PRIMARY KEY,
  rule_name TEXT NOT NULL UNIQUE,
  layer INTEGER NOT NULL CHECK (layer BETWEEN 1 AND 4),
  record_type TEXT NOT NULL,
  check_type TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  severity TEXT NOT NULL CHECK (severity IN ('BLOCK', 'WARN', 'INFO')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default rules
INSERT INTO data_quality_rules (rule_name, layer, record_type, check_type, parameters, severity) VALUES
  ('voucher_schema', 1, 'voucher', 'zod_schema', '{}', 'BLOCK'),
  ('customer_schema', 1, 'customer', 'zod_schema', '{}', 'BLOCK'),
  ('transaction_schema', 1, 'transaction', 'zod_schema', '{}', 'BLOCK'),
  ('employee_schema', 1, 'employee', 'zod_schema', '{}', 'BLOCK'),
  ('brreg_schema', 1, 'brreg', 'zod_schema', '{}', 'BLOCK'),
  ('outlier_zscore', 2, '*', 'statistical_outlier', '{"threshold": 3}', 'WARN'),
  ('temporal_consistency', 2, '*', 'temporal_check', '{"maxAgeDays": 365}', 'WARN'),
  ('duplicate_check', 2, '*', 'duplicate_detection', '{}', 'WARN'),
  ('staleness_check', 2, '*', 'staleness', '{"maxDays": 30}', 'WARN'),
  ('bokforingsloven_5', 4, 'voucher', 'compliance_required_fields', '{}', 'BLOCK'),
  ('bokforingsloven_7', 4, 'voucher', 'compliance_sequential_numbering', '{}', 'BLOCK'),
  ('mva_rate_check', 4, 'voucher', 'compliance_mva_rates', '{}', 'BLOCK')
ON CONFLICT (rule_name) DO NOTHING;
