// Script to add production customers to the Supabase database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or key is missing in environment variables');
  process.exit(1);
}

console.log('Connecting to Supabase:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseKey);

// Production customers from the screenshot with todos and notes
const customerUpdates = [
  // Prospect
  {
    name: '88 Rising',
    notes: '',
    todos: [
      { id: '1', text: 'Send Jordan Sales Deck', completed: false, created_at: new Date().toISOString() }
    ]
  },
  
  // Meeting
  {
    name: 'Warner Records',
    notes: 'Had meeting #1. To get sale, we have to make product give them info that they don\'t currently have which is necessary. Improve segments, and fix recent chats and segment chats.',
    todos: [
      { id: '1', text: 'Email from Nova to setup follow up meeting', completed: false, created_at: new Date().toISOString() }
    ]
  },
  {
    name: 'Audio Vision',
    notes: '',
    todos: [
      { id: '1', text: 'Send Jonny sales deck', completed: false, created_at: new Date().toISOString() }
    ]
  },
  
  // Free Trial
  {
    name: 'Black Flag',
    notes: '',
    todos: [
      { id: '1', text: 'Setup admin account roster', completed: false, created_at: new Date().toISOString() },
      { id: '2', text: 'Make sure artists segments are valuable', completed: false, created_at: new Date().toISOString() },
      { id: '3', text: 'Make sure segment chat and recent chats works', completed: false, created_at: new Date().toISOString() },
      { id: '4', text: 'Connect artists to users account', completed: false, created_at: new Date().toISOString() },
      { id: '5', text: 'Setup follow up meeting for onboarding call', completed: false, created_at: new Date().toISOString() }
    ]
  },
  {
    name: 'One RPM',
    notes: '',
    todos: [
      { id: '1', text: 'Setup admin account with roster', completed: false, created_at: new Date().toISOString() },
      { id: '2', text: 'Make sure artists segments are valuable', completed: false, created_at: new Date().toISOString() },
      { id: '3', text: 'Make sure segment chat and recent chats works', completed: false, created_at: new Date().toISOString() },
      { id: '4', text: 'Connect artists to users account', completed: false, created_at: new Date().toISOString() },
      { id: '5', text: 'Setup follow up meeting for onboarding call', completed: false, created_at: new Date().toISOString() }
    ]
  },
  {
    name: 'Icon Breaking',
    notes: '',
    todos: [
      { id: '1', text: 'Setup roster admin account', completed: false, created_at: new Date().toISOString() },
      { id: '2', text: 'Make sure artists segments are valuable', completed: false, created_at: new Date().toISOString() },
      { id: '3', text: 'Make sure segment chat and recent chats works', completed: false, created_at: new Date().toISOString() },
      { id: '4', text: 'Connect artists to users account', completed: false, created_at: new Date().toISOString() },
      { id: '5', text: 'DM Keyz that account is ready', completed: false, created_at: new Date().toISOString() }
    ]
  },
  
  // Paying Customer
  {
    name: 'Atlantic Records',
    notes: '',
    todos: [
      { id: '1', text: 'Setup admin account with artists', completed: false, created_at: new Date().toISOString() },
      { id: '2', text: 'Text Willie to setup call', completed: false, created_at: new Date().toISOString() }
    ]
  },
  {
    name: '300 Ent',
    notes: '',
    todos: [
      { id: '1', text: 'Setup admin roster account', completed: false, created_at: new Date().toISOString() },
      { id: '2', text: 'Email Shy & Cole', completed: false, created_at: new Date().toISOString() }
    ]
  },
  {
    name: 'Coinbase',
    notes: '',
    todos: []
  },
  {
    name: 'Indie Artists',
    notes: '',
    todos: []
  }
];

async function updateCustomerTodosAndNotes() {
  try {
    console.log('Updating customer todos and notes...');
    
    // First, check if there are existing customers
    const { data: existingCustomers, error: checkError } = await supabase
      .from('sales_pipeline_customers')
      .select('id, name');
    
    if (checkError) {
      console.error('Error checking existing customers:', checkError);
      return;
    }
    
    if (!existingCustomers || existingCustomers.length === 0) {
      console.log('No existing customers found. Please run the full customer import script first.');
      return;
    }
    
    console.log(`Found ${existingCustomers.length} existing customers.`);
    
    // Create a map of customer names to IDs for easy lookup
    const customerMap = {};
    existingCustomers.forEach(customer => {
      customerMap[customer.name] = customer.id;
    });
    
    // Update each customer's todos and notes
    for (const update of customerUpdates) {
      const customerId = customerMap[update.name];
      
      if (!customerId) {
        console.log(`⚠️ Customer "${update.name}" not found in database. Skipping update.`);
        continue;
      }
      
      console.log(`Updating todos and notes for customer: ${update.name}`);
      
      const { error } = await supabase
        .from('sales_pipeline_customers')
        .update({
          todos: update.todos,
          notes: update.notes
        })
        .eq('id', customerId);
      
      if (error) {
        console.error(`Error updating customer ${update.name}:`, error);
      } else {
        console.log(`✅ Updated todos and notes for: ${update.name}`);
      }
    }
    
    console.log('Finished updating customer todos and notes');
  } catch (error) {
    console.error('Exception updating customer todos and notes:', error);
  }
}

// Run the function
updateCustomerTodosAndNotes(); 