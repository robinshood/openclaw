-- Agent memory — pgvector embeddings for agent context/learning.
-- Requires pgvector extension: CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS agent_memory (
  id BIGSERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agent_state(agent_id),
  memory_type TEXT NOT NULL, -- 'decision', 'pattern', 'feedback', 'correction'
  content TEXT NOT NULL,
  embedding VECTOR(1536), -- OpenAI ada-002 compatible
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agent_memory_agent ON agent_memory(agent_id);
CREATE INDEX idx_agent_memory_type ON agent_memory(memory_type);

-- Enable RLS on all tables
ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

-- Service role has full access (used by agents)
CREATE POLICY service_all ON agent_state FOR ALL USING (true);
CREATE POLICY service_all ON audit_trail FOR ALL USING (true);
CREATE POLICY service_all ON client_profiles FOR ALL USING (true);
CREATE POLICY service_all ON data_quality_log FOR ALL USING (true);
CREATE POLICY service_all ON data_quality_rules FOR ALL USING (true);
CREATE POLICY service_all ON data_quality_metrics FOR ALL USING (true);
CREATE POLICY service_all ON time_entries FOR ALL USING (true);
CREATE POLICY service_all ON report_cache FOR ALL USING (true);
CREATE POLICY service_all ON agent_memory FOR ALL USING (true);
