-- Data quality metrics — aggregate quality scores per source per day.
CREATE TABLE IF NOT EXISTS data_quality_metrics (
  id SERIAL PRIMARY KEY,
  metric_date DATE NOT NULL,
  source TEXT NOT NULL,
  total_records INTEGER NOT NULL,
  clean_count INTEGER NOT NULL,
  suspect_count INTEGER NOT NULL,
  dirty_count INTEGER NOT NULL,
  top_issues JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (metric_date, source)
);

CREATE INDEX idx_dq_metrics_date ON data_quality_metrics(metric_date DESC);
CREATE INDEX idx_dq_metrics_source ON data_quality_metrics(source);
