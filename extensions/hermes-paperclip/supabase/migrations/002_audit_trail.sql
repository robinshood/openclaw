-- Audit trail — every agent action is logged here.
-- CONSTRAINT: Every entry must have agent_id, action, confidence, rationale.
CREATE TABLE IF NOT EXISTS audit_trail (
  id BIGSERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agent_state(agent_id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  input_data JSONB,
  output_data JSONB,
  confidence TEXT NOT NULL CHECK (confidence IN ('H', 'M', 'L')),
  rationale TEXT NOT NULL,
  g4_status TEXT NOT NULL DEFAULT 'approved' CHECK (g4_status IN ('pending', 'approved', 'rejected')),
  environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'production')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_trail_agent ON audit_trail(agent_id);
CREATE INDEX idx_audit_trail_action ON audit_trail(action);
CREATE INDEX idx_audit_trail_g4 ON audit_trail(g4_status) WHERE g4_status = 'pending';
CREATE INDEX idx_audit_trail_created ON audit_trail(created_at DESC);
