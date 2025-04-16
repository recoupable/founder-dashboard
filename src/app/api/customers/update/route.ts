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
      
      // Prepare stage history if needed - now checking if the column exists
      if (customerData.stage) {
        try {
          // First check if the stage_history column exists
          const { data: columnInfo, error: columnError } = await supabaseAdmin
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', TABLE_NAME)
            .eq('column_name', 'stage_history');
          
          // If the column doesn't exist or there was an error checking, skip history tracking
          if (columnError || !columnInfo || columnInfo.length === 0) {
            console.log('📝 API: stage_history column not found, skipping history tracking');
            // Remove stage_history from data if it exists to avoid errors
            delete customerData.stage_history;
          } else {
            // Column exists, proceed with history tracking
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
                delete customerData.stage_history;
              } else if (currentData) {
                // Update stage history
                // Parse the stage_history properly to prevent nested stringification
                let currentHistory = [];
                try {
                  // If it's already a string, parse it
                  if (typeof currentData.stage_history === 'string') {
                    currentHistory = JSON.parse(currentData.stage_history);
                  } 
                  // If it's already an array, use it directly
                  else if (Array.isArray(currentData.stage_history)) {
                    currentHistory = currentData.stage_history;
                  }
                  // Otherwise, start with an empty array
                  else {
                    currentHistory = [];
                  }
                } catch (parseError) {
                  console.error('❌ API: Error parsing stage history, resetting:', parseError);
                  currentHistory = []; // Reset history if corrupted
                }
                
                const newHistoryEntry = {
                  stage: customerData.stage,
                  timestamp: new Date().toISOString()
                };
                
                customerData.stage_history = [...currentHistory, newHistoryEntry];
              }
            } catch (historyError) {
              console.error('❌ API: Error updating stage history:', historyError);
              // Continue with the update even if stage history fails
              delete customerData.stage_history;
            }
          }
        } catch (schemaError) {
          console.error('❌ API: Error checking for stage_history column:', schemaError);
          // Continue with the update without stage history
          delete customerData.stage_history;
        }
      }

      // Create a clean update object without the ID field
      const updateData = { ...customerData };
      // Use object destructuring to extract and ignore the ID field
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _unusedId, ...cleanUpdateData } = updateData;
      
      // Safe JSON stringification to prevent circular references
      const safeStringify = (obj: unknown): string => {
        try {
          // First check for circular references by attempting a basic stringify
          JSON.stringify(obj);
          // If that works, do the actual pretty stringify
          return JSON.stringify(obj);
        } catch (error) {
          console.error('❌ API: Error stringifying object, likely circular reference:', error);
          // For objects that can't be stringified, attempt to create a simplified version
          if (Array.isArray(obj)) {
            return JSON.stringify(obj.map(item => 
              typeof item === 'object' && item !== null 
                ? { id: (item as Record<string, unknown>).id || 'unknown', simplified: true } 
                : item
            ));
          }
          return JSON.stringify({ error: 'Unable to stringify', simplified: true });
        }
      };
      
      // Convert JSON fields to strings and fix date fields
      const row: Record<string, unknown> = { ...cleanUpdateData };
      
      // Fix date fields - convert empty strings to null
      const dateFields = [
        'trial_start_date', 
        'trial_end_date', 
        'conversion_target_date',
        'expected_close_date',
        'next_activity_date'
      ];
      
      // Process all date fields - using for...of instead of forEach
      for (const field of dateFields) {
        if (field in row && (row[field] === '' || row[field] === undefined)) {
          row[field] = null;
        }
      }
      
      // Handle JSON fields
      if (customerData.stage_history) {
        // Make sure we're not double-stringifying a string
        if (typeof customerData.stage_history === 'string') {
          row.stage_history = customerData.stage_history;
        } else {
          row.stage_history = safeStringify(customerData.stage_history);
        }
      }
      if (customerData.contacts) {
        row.contacts = typeof customerData.contacts === 'string' 
          ? customerData.contacts 
          : safeStringify(customerData.contacts);
      }
      if (customerData.custom_fields) {
        row.custom_fields = typeof customerData.custom_fields === 'string'
          ? customerData.custom_fields
          : safeStringify(customerData.custom_fields);
      }
      if (customerData.external_ids) {
        row.external_ids = typeof customerData.external_ids === 'string'
          ? customerData.external_ids
          : safeStringify(customerData.external_ids);
      }
      if (customerData.todos) {
        row.todos = typeof customerData.todos === 'string'
          ? customerData.todos
          : safeStringify(customerData.todos);
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