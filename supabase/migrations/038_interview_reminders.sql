-- 038: Interview reminder columns on prep_sessions

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prep_sessions' AND column_name = 'reminder_sent'
  ) THEN
    ALTER TABLE prep_sessions ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prep_sessions' AND column_name = 'reminder_sent_at'
  ) THEN
    ALTER TABLE prep_sessions ADD COLUMN reminder_sent_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END
$$;
