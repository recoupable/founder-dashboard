import { supabase } from './supabase'

// Table name constant
const TABLE_NAME = 'sales_pipeline_customers'

// Customer types
export type PipelineStage = 'Prospect' | 'Meeting' | 'Free Trial' | 'Paying Customer'
export type CustomerType = 'Prospect' | 'Meeting' | 'Free Trial' | 'Paying Customer'
export type PriorityLevel = 'Low' | 'Medium' | 'High' | 'Urgent'

// Contact interface for the contacts array
export interface Contact {
  name: string
  email?: string
  phone?: string
  title?: string
  isPrimary?: boolean
}

// Custom fields type with unknown values
export type CustomFields = Record<string, unknown>;

// External IDs type
export type ExternalIds = Record<string, string>;

// Add this new interface before the Customer interface
export interface Todo {
  id: string
  text: string
  completed: boolean
  created_at: string
}

// Enhanced Customer interface
export interface Customer {
  id: string
  name: string
  type: CustomerType
  stage: PipelineStage
  assigned_to?: string
  priority?: PriorityLevel
  probability?: number
  order_index?: number
  
  // Financial metrics
  current_artists: number
  potential_artists: number
  current_mrr: number
  potential_mrr: number
  weighted_mrr?: number // Calculated field
  
  // Time tracking
  expected_close_date?: string
  stage_entered_at?: string
  days_in_stage?: number // Calculated field
  
  // Trial information
  trial_start_date?: string
  trial_end_date?: string
  
  // Activity tracking
  last_contact_date: string
  last_activity_type?: string
  last_activity_date?: string
  activity_count?: number
  next_activity_date?: string
  next_activity_type?: string
  
  // Contact information
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  contacts?: Contact[]
  
  // Company information
  company_size?: string
  source?: string
  industry?: string
  website?: string
  logo_url?: string
  
  // Deal information
  lost_reason?: string
  win_reason?: string
  competitors?: string[]
  tags?: string[]
  
  // History and notes
  stage_history?: StageHistoryEntry[]
  notes?: string
  todos?: Todo[] // Add todos field
  
  // Custom fields and external IDs
  custom_fields?: CustomFields
  external_ids?: ExternalIds
  
  // Timestamps
  created_at?: string
  updated_at?: string
}

// Define a type for stage history entries
export interface StageHistoryEntry {
  stage: PipelineStage
  timestamp: string
  previous_stage?: PipelineStage
  days_in_previous_stage?: number
  notes?: string
}

interface CustomerRow {
  id: string
  name: string
  type: CustomerType
  stage: PipelineStage
  assigned_to?: string
  priority?: PriorityLevel
  probability?: number
  order_index?: number
  
  // Financial metrics
  current_artists: number
  potential_artists: number
  current_mrr: number
  potential_mrr: number
  weighted_mrr?: number
  
  // Time tracking
  expected_close_date?: string
  stage_entered_at?: string
  days_in_stage?: number
  
  // Trial information
  trial_start_date?: string
  trial_end_date?: string
  
  // Activity tracking
  last_contact_date: string
  last_activity_type?: string
  last_activity_date?: string
  activity_count?: number
  next_activity_date?: string
  next_activity_type?: string
  
  // Contact information
  contact_name?: string
  contact_email?: string
  contact_phone?: string
  contacts?: unknown
  
  // Company information
  company_size?: string
  source?: string
  industry?: string
  website?: string
  logo_url?: string
  
  // Deal information
  lost_reason?: string
  win_reason?: string
  competitors?: string[]
  tags?: string[]
  
  // History and notes
  stage_history?: unknown
  notes?: string
  
  // Custom fields and external IDs
  custom_fields?: unknown
  external_ids?: unknown
  
  // Timestamps
  created_at: string
  updated_at: string
}

// Convert database row to Customer model
export function rowToCustomer(row: CustomerRow): Customer {
  return {
    ...row,
    stage_history: row.stage_history ? JSON.parse(JSON.stringify(row.stage_history)) : [],
    contacts: row.contacts ? JSON.parse(JSON.stringify(row.contacts)) : [],
    custom_fields: row.custom_fields ? JSON.parse(JSON.stringify(row.custom_fields)) : {},
    external_ids: row.external_ids ? JSON.parse(JSON.stringify(row.external_ids)) : {}
  }
}

// Convert Customer model to database row
export function customerToRow(customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>): Omit<CustomerRow, 'id' | 'created_at' | 'updated_at'> {
  const row: Record<string, unknown> = { ...customer }
  
  // Convert JSON fields to strings
  if (customer.stage_history) {
    row.stage_history = JSON.stringify(customer.stage_history)
  }
  
  if (customer.contacts) {
    row.contacts = JSON.stringify(customer.contacts)
  }
  
  if (customer.custom_fields) {
    row.custom_fields = JSON.stringify(customer.custom_fields)
  }
  
  if (customer.external_ids) {
    row.external_ids = JSON.stringify(customer.external_ids)
  }
  
  return row as Omit<CustomerRow, 'id' | 'created_at' | 'updated_at'>
}

// Fetch all customers
export async function fetchCustomers(): Promise<Customer[]> {
  try {
    console.log('Fetching customers from table:', TABLE_NAME);
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
      
      // Log detailed error information
      console.log('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No customers found in table:', TABLE_NAME);
      return [];
    }

    console.log(`Found ${data.length} customers in table:`, TABLE_NAME);
    return data.map(row => rowToCustomer(row as CustomerRow));
  } catch (error) {
    console.error('Exception in fetchCustomers:', error);
    
    // Return empty array instead of throwing to prevent UI errors
    return [];
  }
}

// Create a new customer
export async function createCustomer(customer: Omit<Customer, 'id'>): Promise<Customer> {
  try {
    const row = customerToRow(customer)
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([row])
      .select()

    if (error) {
      console.error('Error creating customer:', error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned after creating customer')
    }

    return rowToCustomer(data[0] as CustomerRow)
  } catch (error) {
    console.error('Error in createCustomer:', error)
    throw error
  }
}

// Update an existing customer
export async function updateCustomer(id: string, customer: Partial<Omit<Customer, 'id'>>): Promise<Customer> {
  try {
    // If stage is being updated, add to stage history
    if (customer.stage) {
      // First get the current customer to access their stage history
      const { data: currentData, error: fetchError } = await supabase
        .from(TABLE_NAME)
        .select('stage_history')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('Error fetching customer for history update:', fetchError)
        throw fetchError
      }

      // Update stage history
      const currentHistory = currentData?.stage_history || []
      const newHistoryEntry = {
        stage: customer.stage,
        timestamp: new Date().toISOString()
      }
      
      customer.stage_history = [...currentHistory, newHistoryEntry]
    }

    // Convert to row format
    const row: Record<string, unknown> = { ...customer }
    if (customer.stage_history) {
      row.stage_history = JSON.stringify(customer.stage_history)
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(row)
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error updating customer:', error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned after updating customer')
    }

    return rowToCustomer(data[0] as CustomerRow)
  } catch (error) {
    console.error('Error in updateCustomer:', error)
    throw error
  }
}

// Delete a customer
export async function deleteCustomer(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting customer:', error)
      throw error
    }
  } catch (error) {
    console.error('Error in deleteCustomer:', error)
    throw error
  }
}

// Update a customer's stage
export async function updateCustomerStage(id: string, stage: PipelineStage): Promise<Customer> {
  return updateCustomer(id, { stage })
}

// Update customer order (for drag and drop persistence)
export async function updateCustomerOrder(id: string, order_index: number): Promise<Customer> {
  try {
    console.log(`Updating customer ${id} order to ${order_index}`);
    
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ order_index })
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error updating customer order:', error)
      throw error
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned after updating customer order')
    }

    return rowToCustomer(data[0] as CustomerRow)
  } catch (error) {
    console.error('Error in updateCustomerOrder:', error)
    throw error
  }
}

// Check if the customers table exists and create it if needed
export async function ensureTableExists(): Promise<boolean> {
  try {
    console.log('🔄 Checking if table exists:', TABLE_NAME);
    
    // Try to query the table
    const { error } = await supabase
      .from(TABLE_NAME)
      .select('count', { count: 'exact', head: true });
    
    // If there's an error with code 42P01, the table doesn't exist
    if (error) {
      console.error('❌ Error checking table existence:', error);
      
      if (error.code === '42P01') { // PostgreSQL code for "table does not exist"
        console.log('🔄 Table does not exist, attempting to create it');
        
        // Create the table using the SQL from databaseFunctions.ts
        const { error: createError } = await supabase.rpc('create_sales_pipeline_tables');
        
        if (createError) {
          console.error('❌ Failed to create table:', createError);
          
          // Try an alternative approach - direct SQL
          console.log('🔄 Attempting alternative table creation method...');
          
          // This is a simplified version - adjust based on your actual schema
          const { error: sqlError } = await supabase.rpc('execute_sql', { 
            sql: `
              CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name TEXT NOT NULL,
                type TEXT NOT NULL,
                stage TEXT NOT NULL,
                current_artists INTEGER NOT NULL DEFAULT 0,
                potential_artists INTEGER NOT NULL DEFAULT 0,
                current_mrr NUMERIC NOT NULL DEFAULT 0,
                potential_mrr NUMERIC NOT NULL DEFAULT 0,
                last_contact_date TEXT NOT NULL,
                notes TEXT,
                order_index INTEGER DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
              );
            `
          });
          
          if (sqlError) {
            console.error('❌ Alternative table creation failed:', sqlError);
            return false;
          }
        }
      } else {
        console.error('❌ Unknown error checking table:', error);
        return false;
      }
    } else {
      // Table exists, check if order_index column exists
      // We'll attempt to add the column anyway - if it exists, the IF NOT EXISTS will prevent errors
      const { error: alterError } = await supabase.rpc('execute_sql', { 
        sql: `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;`
      });
      
      if (alterError) {
        console.error('❌ Failed to add order_index column:', alterError);
      } else {
        console.log('✅ Ensured order_index column exists');
      }
    }
    
    console.log('✅ Table verified/created successfully');
    return true;
  } catch (error) {
    console.error('❌ Unexpected error in ensureTableExists:', error);
    return false;
  }
} 