-- Create error_logs table for tracking Telegram errors
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Raw data
  raw_message TEXT NOT NULL,
  telegram_message_id BIGINT,
  
  -- Parsed fields (directly from Telegram format)
  user_email TEXT,
  room_id TEXT,
  error_timestamp TIMESTAMPTZ,
  error_message TEXT,
  error_type TEXT,
  tool_name TEXT,
  last_message TEXT,
  stack_trace TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_error_logs_user_email ON error_logs(user_email);
CREATE INDEX idx_error_logs_room_id ON error_logs(room_id);
CREATE INDEX idx_error_logs_tool_name ON error_logs(tool_name);
CREATE INDEX idx_error_logs_error_timestamp ON error_logs(error_timestamp);
CREATE INDEX idx_error_logs_created_at ON error_logs(created_at); 