-- Create page_visits table for tracking website visits
-- This supports the full funnel metrics feature

CREATE TABLE IF NOT EXISTS page_visits (
  id BIGSERIAL PRIMARY KEY,
  page_path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  ip_address TEXT,
  session_id TEXT,
  user_email TEXT,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_page_visits_visited_at ON page_visits(visited_at);
CREATE INDEX IF NOT EXISTS idx_page_visits_session_id ON page_visits(session_id);
CREATE INDEX IF NOT EXISTS idx_page_visits_user_email ON page_visits(user_email);
CREATE INDEX IF NOT EXISTS idx_page_visits_page_path ON page_visits(page_path);

-- Add comments for documentation
COMMENT ON TABLE page_visits IS 'Tracks website page visits for analytics and funnel metrics';
COMMENT ON COLUMN page_visits.page_path IS 'The path of the page visited (e.g., /dashboard, /analytics)';
COMMENT ON COLUMN page_visits.referrer IS 'The referring URL that brought the user to this page';
COMMENT ON COLUMN page_visits.user_agent IS 'Browser user agent string for device/browser analytics';
COMMENT ON COLUMN page_visits.ip_address IS 'Anonymized IP address for unique visitor counting';
COMMENT ON COLUMN page_visits.session_id IS 'Session identifier for grouping page views into sessions';
COMMENT ON COLUMN page_visits.user_email IS 'User email if authenticated (for test filtering)';
COMMENT ON COLUMN page_visits.visited_at IS 'Timestamp when the page was visited';

-- Grant permissions (adjust based on your RLS policies)
-- These may need to be adjusted based on your Supabase setup
-- ALTER TABLE page_visits ENABLE ROW LEVEL SECURITY; 