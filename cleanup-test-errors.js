// Cleanup script to remove test errors and keep only real data
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupTestErrors() {
  try {
    console.log('🧹 Starting cleanup of test errors...');
    
    // Delete the test errors by their IDs
    const testErrorIds = [
      'fd6ee5e0-1c6b-420f-8744-c57f766d87da', // Truncated test error
      '14c4acf5-97cc-4fcb-944d-e216f8632301'  // Patrick test error
    ];
    
    for (const errorId of testErrorIds) {
      const { error } = await supabase
        .from('error_logs')
        .delete()
        .eq('id', errorId);
      
      if (error) {
        console.error(`❌ Error deleting ${errorId}:`, error);
      } else {
        console.log(`✅ Deleted test error: ${errorId}`);
      }
    }
    
    // Verify what's left
    const { data: remainingErrors, error: fetchError } = await supabase
      .from('error_logs')
      .select('id, user_email, tool_name, error_type')
      .order('created_at', { ascending: false });
    
    if (fetchError) {
      console.error('❌ Error fetching remaining errors:', fetchError);
    } else {
      console.log('\n📊 Remaining errors in database:');
      remainingErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.user_email} - ${error.tool_name} - ${error.error_type}`);
      });
      console.log(`\n✅ Total remaining errors: ${remainingErrors.length}`);
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

cleanupTestErrors(); 