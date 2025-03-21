// Script to check Supabase connection and list customers
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if credentials are available
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Found' : 'Missing');
  process.exit(1);
}

// Initialize Supabase client
console.log('🔄 Initializing Supabase client with:');
console.log('🔄 URL:', supabaseUrl);
console.log('🔄 Has Anon Key:', !!supabaseKey);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCustomers() {
  try {
    console.log('🔄 Checking connection to Supabase...');
    
    // Test connection with a simple query
    const { error: connectionError } = await supabase
      .from('sales_pipeline_customers')
      .select('count', { count: 'exact', head: true });
    
    if (connectionError) {
      console.error('❌ Connection error:', connectionError);
      return;
    }
    
    console.log('✅ Successfully connected to Supabase');
    
    // Fetch all customers
    const { data: customers, error } = await supabase
      .from('sales_pipeline_customers')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching customers:', error);
      return;
    }
    
    console.log(`✅ Found ${customers.length} customers in the database`);
    
    if (customers.length > 0) {
      console.log('\nCustomer List:');
      customers.forEach((customer, index) => {
        console.log(`\n--- Customer ${index + 1} ---`);
        console.log(`ID: ${customer.id}`);
        console.log(`Name: ${customer.name}`);
        console.log(`Stage: ${customer.stage}`);
        console.log(`Current MRR: $${customer.current_mrr}`);
        console.log(`Potential MRR: $${customer.potential_mrr}`);
      });
    } else {
      console.log('No customers found in the database.');
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the check
checkCustomers(); 