import { supabase } from './supabase';

/**
 * Creates a stored procedure in Supabase to create the sales pipeline table
 */
export async function createSalesPipelineTableFunction() {
  const { error } = await supabase.rpc('exec_sql', {
    sql_query: `
    -- Create the function to create the sales pipeline table
    CREATE OR REPLACE FUNCTION create_sales_pipeline_table()
    RETURNS void AS $$
    BEGIN
      -- Create the table if it doesn't exist
      CREATE TABLE IF NOT EXISTS public.sales_pipeline_customers (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('Prospect', 'Lead', 'Customer', 'Partner')),
        stage TEXT NOT NULL CHECK (stage IN ('Prospect', 'Meeting', 'Free Trial', 'Paying Customer')),
        assigned_to UUID REFERENCES auth.users(id),
        priority TEXT CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent')),
        probability INTEGER CHECK (probability BETWEEN 0 AND 100),
        current_artists INTEGER NOT NULL DEFAULT 0,
        potential_artists INTEGER NOT NULL DEFAULT 0,
        current_mrr NUMERIC NOT NULL DEFAULT 0,
        potential_mrr NUMERIC NOT NULL DEFAULT 0,
        
        -- Smart forecasting
        weighted_mrr NUMERIC GENERATED ALWAYS AS 
          (potential_mrr * (probability::numeric / 100)) STORED,
        
        -- Time tracking
        expected_close_date DATE,
        stage_entered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        days_in_stage INTEGER,
        
        -- Trial information
        trial_start_date DATE,
        trial_end_date DATE,
        
        -- Activity tracking
        last_contact_date DATE NOT NULL DEFAULT CURRENT_DATE,
        last_activity_type TEXT,
        last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
        activity_count INTEGER DEFAULT 0,
        next_activity_date DATE,
        next_activity_type TEXT,
        
        -- Contact information
        contact_name TEXT,
        contact_email TEXT,
        contact_phone TEXT,
        contacts JSONB DEFAULT '[]'::jsonb,
        
        -- Company information
        company_size TEXT,
        source TEXT,
        industry TEXT,
        website TEXT,
        logo_url TEXT,
        
        -- Deal information
        lost_reason TEXT,
        win_reason TEXT,
        competitors TEXT[],
        tags TEXT[],
        
        -- History and notes
        stage_history JSONB DEFAULT '[]'::jsonb,
        notes TEXT,
        todos JSONB DEFAULT '[]'::jsonb,
        
        -- Custom fields for extensibility
        custom_fields JSONB DEFAULT '{}'::jsonb,
        
        -- External system IDs
        external_ids JSONB DEFAULT '{}'::jsonb,
        
        -- Timestamps
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
      
      -- Add function to update days_in_stage
      CREATE OR REPLACE FUNCTION update_days_in_stage()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.days_in_stage := EXTRACT(DAY FROM now() - NEW.stage_entered_at)::INTEGER;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Add trigger to update updated_at on each change
      CREATE OR REPLACE FUNCTION update_modified_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at := CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Create the trigger for updating the modified column
      DROP TRIGGER IF EXISTS update_sales_pipeline_customers_modtime ON public.sales_pipeline_customers;
      CREATE TRIGGER update_sales_pipeline_customers_modtime
      BEFORE UPDATE ON public.sales_pipeline_customers
      FOR EACH ROW EXECUTE FUNCTION update_modified_column();
      
      -- Add trigger to update activity tracking
      CREATE OR REPLACE FUNCTION update_activity_tracking()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Update last activity date
        NEW.last_activity_date := CURRENT_TIMESTAMP;
        
        -- Increment activity count
        NEW.activity_count := COALESCE(OLD.activity_count, 0) + 1;
        
        -- If stage changed, update stage_entered_at
        IF NEW.stage <> OLD.stage THEN
          NEW.stage_entered_at := CURRENT_TIMESTAMP;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      -- Create the trigger for activity tracking
      DROP TRIGGER IF EXISTS update_sales_pipeline_activity ON public.sales_pipeline_customers;
      CREATE TRIGGER update_sales_pipeline_activity
      BEFORE UPDATE ON public.sales_pipeline_customers
      FOR EACH ROW EXECUTE FUNCTION update_activity_tracking();
      
      -- Add trigger to update days_in_stage
      DROP TRIGGER IF EXISTS update_days_in_stage_trigger ON public.sales_pipeline_customers;
      CREATE TRIGGER update_days_in_stage_trigger
      BEFORE INSERT OR UPDATE OF stage_entered_at ON public.sales_pipeline_customers
      FOR EACH ROW EXECUTE FUNCTION update_days_in_stage();
      
      -- Enable Row Level Security
      ALTER TABLE public.sales_pipeline_customers ENABLE ROW LEVEL SECURITY;
      
      -- Create a policy that allows all operations
      DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.sales_pipeline_customers;
      CREATE POLICY "Allow all operations for authenticated users" ON public.sales_pipeline_customers
          USING (true)
          WITH CHECK (true);
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    `
  });

  if (error) {
    console.error('Error creating function:', error);
    throw error;
  }

  return { success: true };
}

/**
 * Executes the function to create the sales pipeline table
 */
export async function executeSalesPipelineTableCreation() {
  try {
    const { error } = await supabase.rpc('create_sales_pipeline_table');
    
    if (error) {
      console.error('Error executing function:', error);
      throw error;
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating sales pipeline table:', error);
    throw error;
  }
}

/**
 * Checks if the sales_pipeline_customers table exists
 */
export async function checkSalesPipelineTableExists(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'sales_pipeline_customers'
      );
      `
    });
    
    if (error) {
      console.error('Error checking if table exists:', error);
      throw error;
    }
    
    return data && data.length > 0 && data[0].exists;
  } catch (error) {
    console.error('Error checking if table exists:', error);
    throw error;
  }
} 