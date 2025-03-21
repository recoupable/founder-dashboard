// Script to add a test customer to the Supabase database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or key is missing in environment variables');
  process.exit(1);
}

console.log('Connecting to Supabase:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

// Test customer data with correct stage values
const testCustomer = {
  name: 'Test Company',
  type: 'Prospect', // Must be one of: 'Prospect', 'Lead', 'Customer', 'Partner'
  stage: 'Prospect', // Must be one of: 'Prospect', 'Meeting', 'Free Trial', 'Paying Customer'
  current_artists: 0,
  potential_artists: 10,
  current_mrr: 0,
  potential_mrr: 1000,
  last_contact_date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
  notes: 'This is a test customer added via script',
  contacts: JSON.stringify([
    {
      name: 'John Doe',
      email: 'john@testcompany.com',
      phone: '555-123-4567',
      isPrimary: true
    }
  ]),
  stage_history: JSON.stringify([
    {
      stage: 'Prospect',
      timestamp: new Date().toISOString()
    }
  ]),
  custom_fields: JSON.stringify({}),
  external_ids: JSON.stringify({})
};

async function addTestCustomer() {
  try {
    console.log('Adding test customer to database...');
    console.log('Customer data:', JSON.stringify(testCustomer, null, 2));
    
    const { data, error } = await supabase
      .from('sales_pipeline_customers')
      .insert([testCustomer])
      .select();
    
    if (error) {
      console.error('Error adding test customer:', error);
      return;
    }
    
    console.log('Test customer added successfully:', data);
  } catch (error) {
    console.error('Exception adding test customer:', error);
  }
}

// Run the function
addTestCustomer(); 