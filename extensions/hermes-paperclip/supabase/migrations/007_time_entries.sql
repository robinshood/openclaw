-- Time entries — synced from Tripletex by Tidsvokter.
CREATE TABLE IF NOT EXISTS time_entries (
  id BIGSERIAL PRIMARY KEY,
  tripletex_entry_id INTEGER UNIQUE,
  employee_id INTEGER NOT NULL,
  employee_name TEXT,
  client_org_nr TEXT REFERENCES client_profiles(org_nr),
  project_id INTEGER,
  date DATE NOT NULL,
  hours NUMERIC(6, 2) NOT NULL,
  hourly_rate NUMERIC(8, 2),
  billable BOOLEAN DEFAULT FALSE,
  description TEXT,
  data_quality_status TEXT DEFAULT 'pending' CHECK (data_quality_status IN ('clean', 'suspect', 'dirty', 'pending')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_entries_employee ON time_entries(employee_id);
CREATE INDEX idx_time_entries_client ON time_entries(client_org_nr);
CREATE INDEX idx_time_entries_date ON time_entries(date DESC);
CREATE INDEX idx_time_entries_billable ON time_entries(billable) WHERE billable = TRUE;
