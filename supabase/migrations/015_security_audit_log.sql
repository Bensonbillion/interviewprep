-- Security audit log for tracking security-relevant events

CREATE TABLE security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id UUID,
  ip_address TEXT,
  user_agent TEXT,
  resource_type TEXT,
  resource_id TEXT,
  details JSONB,
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_user_time
  ON security_audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_event_type
  ON security_audit_log(event_type, created_at DESC);
CREATE INDEX idx_audit_severity
  ON security_audit_log(severity) WHERE severity IN ('warning', 'error', 'critical');

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;
-- No policies = no client access, only service_role can read/write
