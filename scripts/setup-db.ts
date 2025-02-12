import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: join(process.cwd(), '.env.local') });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupDatabase() {
  console.log('Setting up database...');

  try {
    // Check if tables exist
    const { error: checkError } = await supabase.from('active_users').select('count').single();
    
    if (checkError?.code === '42P01') {
      console.log('Tables do not exist. Creating them...');
      
      // Create tables using raw SQL through RPC
      const { error: createError } = await supabase.rpc('create_tables', {
        sql: `
          -- Create active_users table
          CREATE TABLE IF NOT EXISTS active_users (
            id bigint primary key generated always as identity,
            user_id text not null,
            last_active timestamp with time zone default now(),
            created_at timestamp with time zone default now()
          );

          -- Create sales_pipeline table
          CREATE TABLE IF NOT EXISTS sales_pipeline (
            id bigint primary key generated always as identity,
            company_name text not null,
            potential_revenue numeric not null,
            status text not null check (status in ('lead', 'meeting', 'proposal', 'negotiation', 'closed')),
            created_at timestamp with time zone default now()
          );
        `
      });

      if (createError) {
        console.error('Error creating tables:', createError);
        process.exit(1);
      }
    }

    // Insert sample data for active_users
    const { error: sampleUsersError } = await supabase
      .from('active_users')
      .upsert([
        { user_id: 'user1', last_active: new Date() },
        { user_id: 'user2', last_active: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        { user_id: 'user3', last_active: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }
      ]);

    if (sampleUsersError) {
      throw sampleUsersError;
    }

    // Insert sample data for sales_pipeline
    const { error: sampleSalesError } = await supabase
      .from('sales_pipeline')
      .upsert([
        { company_name: 'Acme Corp', potential_revenue: 50000, status: 'lead' },
        { company_name: 'TechStart Inc', potential_revenue: 75000, status: 'meeting' },
        { company_name: 'Global Solutions', potential_revenue: 100000, status: 'proposal' }
      ]);

    if (sampleSalesError) {
      throw sampleSalesError;
    }

    console.log('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase(); 