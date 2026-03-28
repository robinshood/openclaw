-- Agent state table — tracks each agent's current status and last run.
CREATE TABLE IF NOT EXISTS agent_state (
  agent_id TEXT PRIMARY KEY,
  agent_name TEXT NOT NULL,
  parent TEXT NOT NULL CHECK (parent IN ('hermes', 'paperclip')),
  status TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('active', 'idle', 'error', 'standby')),
  priority_score NUMERIC(3, 1),
  last_run_at TIMESTAMPTZ,
  last_error TEXT,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial agent states
INSERT INTO agent_state (agent_id, agent_name, parent, priority_score) VALUES
  ('paperclip-wash-01', 'Renvasken', 'paperclip', 4.8),
  ('hermes-bilag-01', 'Bilagsansen', 'hermes', 4.1),
  ('hermes-rapport-01', 'Portalklar', 'hermes', 3.7),
  ('paperclip-onboard-01', 'Velkomst', 'paperclip', 3.6),
  ('paperclip-tid-01', 'Tidsvokter', 'paperclip', 3.5)
ON CONFLICT (agent_id) DO NOTHING;
