require('dotenv').config({ path: './.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('node:fs');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase URL or key not found. Check your .env.local file.');
  process.exit(1);
}

console.log('🔄 Connecting to Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateCustomerData() {
  try {
    console.log('📊 Backing up existing data...');
    
    // First, fetch all existing customers as backup
    const { data: existingCustomers, error: fetchError } = await supabase
      .from('sales_pipeline_customers')
      .select('*');
    
    if (fetchError) {
      console.error('❌ Error fetching existing customers:', fetchError);
      return;
    }
    
    console.log(`✅ Backed up ${existingCustomers.length} customers`);
    
    // Save backup to a local file
    const backupPath = `./customer_backup_${new Date().toISOString().replace(/:/g, '-')}.json`;
    fs.writeFileSync(backupPath, JSON.stringify(existingCustomers, null, 2));
    console.log(`💾 Backup saved to ${backupPath}`);
    
    console.log('⚠️ IMPORTANT: Please add the following columns to your Supabase "sales_pipeline_customers" table:');
    console.log('1. email (text)');
    console.log('2. organization (text)');
    console.log('3. artists_in_account (text array)');
    console.log('4. trial_start_date (date)');
    console.log('5. conversion_target_date (date)');
    console.log('6. messages_sent (integer, default: 0)');
    console.log('7. conversion_stage (text)');
    console.log('8. next_action (text)');
    console.log('9. internal_owner (text)');
    console.log('10. engagement_health (text)');
    console.log('11. use_case_type (text)');
    console.log('');
    console.log('After adding these columns, run this script again with the --update-data flag to populate default values.');
    
    // Check if we should update data
    const shouldUpdateData = process.argv.includes('--update-data');
    
    if (!shouldUpdateData) {
      console.log('');
      console.log('To populate default values, run:');
      console.log('node scripts/update-customer-schema.js --update-data');
      return;
    }
    
    // Update existing customers with placeholder data
    if (existingCustomers.length > 0) {
      console.log('🔄 Updating existing customers with default values...');
      
      // First, check if the columns exist
      try {
        const { error: testError } = await supabase
          .from('sales_pipeline_customers')
          .update({ email: 'test@example.com' })
          .eq('id', existingCustomers[0].id)
          .select();
          
        if (testError) {
          console.error('❌ Error testing column update:', testError);
          console.log('⚠️ Make sure the columns exist in the table before running this script with --update-data');
          return;
        }
      } catch (error) {
        console.error('❌ Error testing column update:', error);
        return;
      }
      
      for (const customer of existingCustomers) {
        try {
          // Get the first part of the name as potential email
          const nameParts = customer.name.split(' ');
          const firstName = nameParts[0].toLowerCase();
          const defaultEmail = `${firstName}@${customer.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
          
          console.log(`🔄 Updating ${customer.name}...`);
          
          // Update fields one at a time to avoid issues with non-existent columns
          // Email
          await supabase
            .from('sales_pipeline_customers')
            .update({ email: defaultEmail })
            .eq('id', customer.id);
          
          // Organization (use current name)
          await supabase
            .from('sales_pipeline_customers')
            .update({ organization: customer.name })
            .eq('id', customer.id);
          
          // Conversion stage
          const conversionStage = customer.stage === 'Free Trial' ? 'Day 1 of Trial' : '';
          await supabase
            .from('sales_pipeline_customers')
            .update({ conversion_stage: conversionStage })
            .eq('id', customer.id);
          
          // Engagement health (default to Warm)
          await supabase
            .from('sales_pipeline_customers')
            .update({ engagement_health: 'Warm' })
            .eq('id', customer.id);
          
          // Messages sent (default to 0)
          await supabase
            .from('sales_pipeline_customers')
            .update({ messages_sent: 0 })
            .eq('id', customer.id);
          
          console.log(`✅ Updated ${customer.name}`);
        } catch (error) {
          console.error(`❌ Error updating customer ${customer.id}:`, error);
        }
      }
      
      console.log('✅ Existing customers updated with default values');
    }
    
    console.log('🎉 Data migration completed successfully!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

updateCustomerData(); 