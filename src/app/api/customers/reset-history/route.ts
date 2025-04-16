import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Constants
const TABLE_NAME = 'sales_pipeline_customers';

// API route handler for resetting customer stage history
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    
    // Extract customer ID
    const customerId = typeof body.id === 'string' ? body.id : body.id?.id;
    
    console.log('🔄 API: Reset stage history request for customer ID:', customerId);
    
    // Validate inputs
    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json({ error: 'Valid customer ID string is required' }, { status: 400 });
    }
    
    try {
      // First check if the stage_history column exists
      const { data: columnInfo, error: columnError } = await supabaseAdmin
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', TABLE_NAME)
        .eq('column_name', 'stage_history');
      
      // If the column doesn't exist, inform the user
      if (columnError || !columnInfo || columnInfo.length === 0) {
        console.log('📝 API: stage_history column not found in database');
        return NextResponse.json({
          success: false,
          message: 'Stage history column has been removed from the database. No need to reset it.'
        });
      }

      // Create a fresh, clean stage history with just the current stage
      const { data: currentCustomer, error: fetchError } = await supabaseAdmin
        .from(TABLE_NAME)
        .select('stage')
        .eq('id', customerId)
        .single();

      if (fetchError) {
        console.error('❌ API: Error fetching customer for reset:', fetchError);
        return NextResponse.json({ error: fetchError.message, success: false }, { status: 500 });
      }

      if (!currentCustomer) {
        return NextResponse.json({ error: 'Customer not found', success: false }, { status: 404 });
      }

      // Create a clean stage history with just one entry for the current stage
      const newStageHistory = [{
        stage: currentCustomer.stage,
        timestamp: new Date().toISOString()
      }];

      // Update the customer with the reset stage history
      const { data: updatedData, error } = await supabaseAdmin
        .from(TABLE_NAME)
        .update({
          stage_history: JSON.stringify(newStageHistory)
        })
        .eq('id', customerId)
        .select();

      if (error) {
        console.error('❌ API: Error resetting customer stage history:', error);
        return NextResponse.json(
          { error: error.message, success: false }, 
          { status: 500 }
        );
      }

      console.log('✅ API: Customer stage history reset successfully for ID:', customerId);
      
      // Return the updated customer data
      return NextResponse.json({
        success: true,
        data: updatedData[0]
      });
    } catch (supabaseError) {
      // Handle Supabase connectivity issues
      console.error('❌ API: Supabase error during history reset:', supabaseError);
      return NextResponse.json(
        { error: 'Database connectivity issue', success: false }, 
        { status: 503 }
      );
    }
  } catch (error: unknown) {
    console.error('❌ API: Error in reset history route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: errorMessage, success: false }, 
      { status: 500 }
    );
  }
} 