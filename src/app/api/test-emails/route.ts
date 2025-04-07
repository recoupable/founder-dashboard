import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Table name for test emails
const TEST_EMAILS_TABLE = 'test_emails';

// Get all test emails
export async function GET() {
  try {
    console.log('API: Fetching test emails');
    
    // Get test emails from the database
    const { data, error } = await supabaseAdmin
      .from(TEST_EMAILS_TABLE)
      .select('email')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('API: Error fetching test emails:', error);
      return NextResponse.json(
        { error: 'Failed to fetch test emails', details: error.message },
        { status: 500 }
      );
    }
    
    // Extract just the email strings
    const emails = data.map(item => item.email);
    
    return NextResponse.json({ emails });
  } catch (error) {
    console.error('API: Unexpected error fetching test emails:', error);
    return NextResponse.json(
      { error: 'Unexpected error fetching test emails' },
      { status: 500 }
    );
  }
}

// Add a new test email
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    console.log('API: Adding test email:', email);
    
    // Check if the email already exists
    const { data: existingData, error: checkError } = await supabaseAdmin
      .from(TEST_EMAILS_TABLE)
      .select('email')
      .eq('email', email)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('API: Error checking if email exists:', checkError);
      return NextResponse.json(
        { error: 'Failed to check if email exists', details: checkError.message },
        { status: 500 }
      );
    }
    
    if (existingData) {
      // Email already exists, return success but indicate it was not added
      return NextResponse.json({
        success: true,
        added: false,
        message: 'Email already exists in test list'
      });
    }
    
    // Add the new test email
    const { error: insertError } = await supabaseAdmin
      .from(TEST_EMAILS_TABLE)
      .insert({ email });
    
    if (insertError) {
      console.error('API: Error adding test email:', insertError);
      return NextResponse.json(
        { error: 'Failed to add test email', details: insertError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      added: true,
      message: 'Email added to test list'
    });
  } catch (error) {
    console.error('API: Unexpected error adding test email:', error);
    return NextResponse.json(
      { error: 'Unexpected error adding test email' },
      { status: 500 }
    );
  }
}

// Delete a test email
export async function DELETE(request: NextRequest) {
  try {
    // Get the email from the URL parameters
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }
    
    console.log('API: Removing test email:', email);
    
    // Remove the test email
    const { error } = await supabaseAdmin
      .from(TEST_EMAILS_TABLE)
      .delete()
      .eq('email', email);
    
    if (error) {
      console.error('API: Error removing test email:', error);
      return NextResponse.json(
        { error: 'Failed to remove test email', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Email removed from test list'
    });
  } catch (error) {
    console.error('API: Unexpected error removing test email:', error);
    return NextResponse.json(
      { error: 'Unexpected error removing test email' },
      { status: 500 }
    );
  }
} 