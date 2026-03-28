-- Data quality log — Renvasken validation results for every record.
CREATE TABLE IF NOT EXISTS data_quality_log (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  record_type TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  cleaned_data JSONB,
  validation_results JSONB NOT NULL,
  confidence_score NUMERIC(5, 4) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('clean', 'suspect', 'dirty', 'pending')),
  issues_found JSONB,
  auto_fix_applied BOOLEAN DEFAULT FALSE,
  auto_fix_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dq_log_source ON data_quality_log(source);
CREATE INDEX idx_dq_log_status ON data_quality_log(status);
CREATE INDEX idx_dq_log_record ON data_quality_log(source_record_id);
CREATE INDEX idx_dq_log_created ON data_quality_log(created_at DESC);
