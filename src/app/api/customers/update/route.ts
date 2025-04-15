import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Constants
const TABLE_NAME = 'sales_pipeline_customers';

// API route handler for updating customers
export async function POST(req: NextRequest) {
  try {
    // Parse the request body
    const body = await req.json();
    
    // Extract customer ID and data properly
    const customerId = typeof body.id === 'string' ? body.id : body.id?.id;
    const customerData = body.data || {};
    
    console.log('🔄 API: Request parameters:');
    console.log('🔄 API: Request body:', body);
    console.log('🔄 API: Customer ID:', customerId);
    console.log('🔄 API: Customer Data:', customerData);
    
    // Validate inputs
    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json({ error: 'Valid customer ID string is required' }, { status: 400 });
    }
    
    if (!customerData || typeof customerData !== 'object') {
      return NextResponse.json({ error: 'Invalid customer data' }, { status: 400 });
    }
    
    console.log('🔄 API: Updating customer with ID:', customerId);
    
    try {
      // Set up a timeout for the Supabase operation
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Supabase operation timed out after 20 seconds'));
        }, 20000); // 20 second timeout
      });
      
      // Prepare stage history if needed
      if (customerData.stage) {
        try {
          // First get the current customer to access their stage history
          const fetchHistoryPromise = supabaseAdmin
            .from(TABLE_NAME)
            .select('stage_history')
            .eq('id', customerId)
            .single();
            
          // Apply timeout to the history fetch
          const { data: currentData, error: fetchError } = await Promise.race([
            fetchHistoryPromise,
            timeoutPromise
          ]);
    
          if (fetchError) {
            console.error('❌ API: Error fetching customer for history update:', fetchError);
            // Don't throw, continue with the update without stage history
          } else if (currentData) {
            // Update stage history
            const currentHistory = currentData?.stage_history || [];
            const newHistoryEntry = {
              stage: customerData.stage,
              timestamp: new Date().toISOString()
            };
            
            customerData.stage_history = [...currentHistory, newHistoryEntry];
          }
        } catch (historyError) {
          console.error('❌ API: Error updating stage history:', historyError);
          // Continue with the update even if stage history fails
        }
      }

      // Create a clean update object without the ID field
      const updateData = { ...customerData };
      delete updateData.id;  // Remove the ID field to avoid sending it in the update
      
      // Convert JSON fields to strings
      const row: Record<string, unknown> = { ...updateData };
      if (customerData.stage_history) {
        row.stage_history = JSON.stringify(customerData.stage_history);
      }
      if (customerData.contacts) {
        row.contacts = JSON.stringify(customerData.contacts);
      }
      if (customerData.custom_fields) {
        row.custom_fields = JSON.stringify(customerData.custom_fields);
      }
      if (customerData.external_ids) {
        row.external_ids = JSON.stringify(customerData.external_ids);
      }
      if (customerData.todos) {
        row.todos = JSON.stringify(customerData.todos);
      }
      
      console.log('🔄 API: Sending update to Supabase:', row);
      console.log('🔄 API: Using customer ID:', customerId);

      // Update the customer using supabaseAdmin with timeout
      const updatePromise = supabaseAdmin
        .from(TABLE_NAME)
        .update(row)
        .eq('id', customerId)
        .select();
        
      // Race the update with the timeout
      const { data: updatedData, error } = await Promise.race([
        updatePromise,
        timeoutPromise
      ]);

      if (error) {
        console.error('❌ API: Error updating customer:', error);
        return NextResponse.json(
          { error: error.message, success: false }, 
          { status: 500 }
        );
      }

      if (!updatedData || updatedData.length === 0) {
        console.error('❌ API: No data returned after updating customer');
        return NextResponse.json(
          { 
            error: 'Customer not found',
            success: false,
            // Return the original data to allow local storage fallback
            fallbackData: { ...customerData, id: customerId }
          }, 
          { status: 404 }
        );
      }

      console.log('✅ API: Customer updated successfully:', updatedData[0]);
      
      // Return the updated customer data
      return NextResponse.json({
        success: true,
        data: updatedData[0]
      });
    } catch (supabaseError) {
      // Handle Supabase connectivity issues
      console.error('❌ API: Supabase connectivity error:', supabaseError);
      
      // Return a special response that indicates we should use local storage
      return NextResponse.json(
        { 
          error: 'Database connectivity issue', 
          success: false,
          useLocalStorage: true,
          // Return the original data to allow local storage fallback
          fallbackData: { ...customerData, id: customerId }
        }, 
        { status: 503 }
      );
    }
  } catch (error: unknown) {
    console.error('❌ API: Error in update customer route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: errorMessage, 
        success: false 
      }, 
      { status: 500 }
    );
  }
} 