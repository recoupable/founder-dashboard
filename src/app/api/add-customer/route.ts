import { NextResponse } from 'next/server';
import { createCustomer, CustomerType, PipelineStage } from '@/lib/customerService';

export async function GET() {
  try {
    // Real customer data provided by the user
    const realCustomer = {
      name: "BlackFlag",
      type: "Free Trial" as CustomerType,
      stage: "Free Trial" as PipelineStage,
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
    
    console.log('🔄 Adding real customer to database...');
    console.log('Customer data:', realCustomer);
    
    // Use the existing createCustomer function from your codebase
    const newCustomer = await createCustomer(realCustomer);
    
    console.log('✅ Customer added successfully!');
    console.log('Database record:', newCustomer);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Customer added successfully!',
      customer: newCustomer
    });
  } catch (error) {
    console.error('❌ Error adding customer:', error);
    
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to add customer',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 