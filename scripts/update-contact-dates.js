// Script to update last_contact_dates to be in 2024 instead of 2025
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or key');
  process.exit(1);
}

console.log('🔄 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to generate dates in March 2024
function generateMarchDate() {
  const day = Math.floor(Math.random() * 28) + 1; // Random day between 1-28
  return `2024-03-${day.toString().padStart(2, '0')}`;
}

async function updateContactDates() {
  try {
    console.log('Updating customer contact dates...');
    
    // Get all customers
    const { data: customers, error: fetchError } = await supabase
      .from('sales_pipeline_customers')
      .select('id, name, last_contact_date');
    
    if (fetchError) {
      console.error('Error fetching customers:', fetchError);
      return;
    }
    
    console.log(`Found ${customers.length} customers to update`);
    
    // Update each customer with a new date in March 2024
    for (const customer of customers) {
      const newDate = generateMarchDate();
      
      const { error: updateError } = await supabase
        .from('sales_pipeline_customers')
        .update({ last_contact_date: newDate })
        .eq('id', customer.id);
      
      if (updateError) {
        console.error(`Error updating ${customer.name}:`, updateError);
      } else {
        console.log(`✅ Updated ${customer.name} last_contact_date from ${customer.last_contact_date} to ${newDate}`);
      }
    }
    
    console.log('✅ All customer contact dates updated successfully!');
  } catch (error) {
    console.error('Error updating contact dates:', error);
  }
}

// Run the update function
updateContactDates(); 