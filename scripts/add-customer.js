// CommonJS script to add a customer to the database
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Table name
const TABLE_NAME = 'sales_pipeline_customers';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Has Supabase Key:', !!supabaseKey);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Real customer data provided by the user
const realCustomer = {
  name: "BlackFlag",
  type: "Free Trial",
  stage: "Free Trial",
  current_artists: 5,
  potential_artists: 10,
  current_mrr: 0,
  potential_mrr: 997,
  last_contact_date: "2025-03-03", // Formatted as YYYY-MM-DD
  notes: "none",
  // Adding trial dates since this is a Free Trial customer
  trial_start_date: new Date().toISOString().split('T')[0], // Today's date as trial start
  trial_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days from now
};

async function addRealCustomer() {
  console.log('🔄 Adding real customer to database...');
  console.log('Customer data:', realCustomer);
  
  try {
    // Insert the real customer into the database
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([realCustomer])
      .select();
    
    if (error) {
      console.error('❌ Error adding customer:', error);
      return;
    }
    
    console.log('✅ Customer added successfully!');
    console.log('Database record:', data[0]);
  } catch (err) {
    console.error('❌ Exception adding customer:', err);
  }
}

// Run the function
addRealCustomer()
  .then(() => console.log('✅ Script completed'))
  .catch(err => console.error('❌ Script failed:', err)); 