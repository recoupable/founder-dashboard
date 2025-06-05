import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
  try {
    console.log('🏗️ API: Setting up admin_user_profiles table...');

    // Create the admin_user_profiles table with LLM-focused schema
    const createTableSQL = `
      -- Create admin_user_profiles table if it doesn't exist
      CREATE TABLE IF NOT EXISTS admin_user_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        
        -- Basic context
        company TEXT,
        job_title TEXT,
        
        -- Rich context for LLMs
        meeting_notes TEXT,           -- Call transcripts, meeting summaries
        observations TEXT,            -- Your subjective insights  
        pain_points TEXT,            -- What frustrates them
        opportunities TEXT,          -- Upsell/expansion potential
        context_notes TEXT,          -- Additional context for AI
        
        -- Structured data
        tags TEXT[],                 -- Array of tags
        sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative', 'frustrated')),
        
        -- Timestamps
        last_contact_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create index on email for fast lookups
      CREATE INDEX IF NOT EXISTS idx_admin_user_profiles_email ON admin_user_profiles(email);

      -- Create index on tags for filtering
      CREATE INDEX IF NOT EXISTS idx_admin_user_profiles_tags ON admin_user_profiles USING GIN(tags);

      -- Create updated_at trigger
      CREATE OR REPLACE FUNCTION update_admin_user_profiles_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Drop trigger if exists and recreate
      DROP TRIGGER IF EXISTS trigger_admin_user_profiles_updated_at ON admin_user_profiles;
      CREATE TRIGGER trigger_admin_user_profiles_updated_at
        BEFORE UPDATE ON admin_user_profiles
        FOR EACH ROW
        EXECUTE FUNCTION update_admin_user_profiles_updated_at();

      -- Enable Row Level Security
      ALTER TABLE admin_user_profiles ENABLE ROW LEVEL SECURITY;

      -- Create policy for authenticated users (allow all operations)
      DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON admin_user_profiles;
      CREATE POLICY "Allow all operations for authenticated users" 
        ON admin_user_profiles FOR ALL 
        USING (true) 
        WITH CHECK (true);
    `;

    // Execute the SQL
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql: createTableSQL });

    if (error) {
      console.error('❌ API: Error creating admin_user_profiles table:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ API: admin_user_profiles table created successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'admin_user_profiles table created successfully',
      tableSchema: {
        name: 'admin_user_profiles',
        purpose: 'LLM-focused admin intelligence about users',
        columns: [
          'id (UUID, Primary Key)',
          'email (TEXT, Unique, Not Null)',
          '-- Basic Context --',
          'company (TEXT)',
          'job_title (TEXT)',
          '-- Rich Context for LLMs --',
          'meeting_notes (TEXT) - Call transcripts, meeting summaries',
          'observations (TEXT) - Your subjective insights',
          'pain_points (TEXT) - What frustrates them',
          'opportunities (TEXT) - Upsell/expansion potential', 
          'context_notes (TEXT) - Additional context for AI',
          '-- Structured Data --',
          'tags (TEXT[]) - Array of tags',
          'sentiment (TEXT) - positive/neutral/negative/frustrated',
          '-- Timestamps --',
          'last_contact_date (DATE)',
          'created_at (TIMESTAMP)',
          'updated_at (TIMESTAMP)'
        ],
        features: [
          'Auto-updating updated_at trigger',
          'Email index for fast lookups',
          'GIN index on tags array for filtering',
          'Row Level Security enabled',
          'Permissive policy for authenticated users',
          'LLM-optimized schema for rich context storage'
        ]
      }
    });
  } catch (error) {
    console.error('❌ API: Exception in setup-user-profiles-table:', error);
    return NextResponse.json({ error: 'Failed to create admin_user_profiles table' }, { status: 500 });
  }
} 