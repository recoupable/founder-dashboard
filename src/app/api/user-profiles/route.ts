import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Type for admin user profile data
export interface AdminUserProfile {
  id?: string;
  email: string;
  
  // Basic context
  company?: string;
  job_title?: string;
  
  // Rich context for LLMs
  meeting_notes?: string;           // Call transcripts, meeting summaries
  observations?: string;            // Your subjective insights
  pain_points?: string;            // What frustrates them
  opportunities?: string;          // Upsell/expansion potential
  context_notes?: string;          // Additional context for AI
  
  // Structured data
  tags?: string[];                 // Array of tags
  sentiment?: 'positive' | 'neutral' | 'negative' | 'frustrated';
  
  // Timestamps
  last_contact_date?: string;
  created_at?: string;
  updated_at?: string;
}

// Get user profile by email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }
    
    console.log('🔍 API: Fetching admin user profile for:', email);
    
    const { data, error } = await supabaseAdmin
      .from('admin_user_profiles')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('❌ API: Error fetching admin user profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Return profile or null if doesn't exist
    return NextResponse.json({ profile: data || null });
  } catch (error) {
    console.error('❌ API: Exception in admin user profiles GET:', error);
    return NextResponse.json({ error: 'Failed to fetch admin user profile' }, { status: 500 });
  }
}

// Create or update admin user profile
export async function POST(request: NextRequest) {
  try {
    const profileData: AdminUserProfile = await request.json();
    
    if (!profileData.email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    console.log('💾 API: Saving admin user profile for:', profileData.email);
    
    // Use upsert to create or update
    const { data, error } = await supabaseAdmin
      .from('admin_user_profiles')
      .upsert(
        {
          email: profileData.email,
          company: profileData.company,
          job_title: profileData.job_title,
          meeting_notes: profileData.meeting_notes,
          observations: profileData.observations,
          pain_points: profileData.pain_points,
          opportunities: profileData.opportunities,
          context_notes: profileData.context_notes,
          tags: profileData.tags,
          sentiment: profileData.sentiment,
          last_contact_date: profileData.last_contact_date,
          updated_at: new Date().toISOString()
        },
        { 
          onConflict: 'email',
          ignoreDuplicates: false 
        }
      )
      .select()
      .single();
    
    if (error) {
      console.error('❌ API: Error saving admin user profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('✅ API: Admin user profile saved successfully');
    return NextResponse.json({ success: true, profile: data });
  } catch (error) {
    console.error('❌ API: Exception in admin user profiles POST:', error);
    return NextResponse.json({ error: 'Failed to save admin user profile' }, { status: 500 });
  }
}

// Delete admin user profile
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }
    
    console.log('🗑️ API: Deleting admin user profile for:', email);
    
    const { error } = await supabaseAdmin
      .from('admin_user_profiles')
      .delete()
      .eq('email', email);
    
    if (error) {
      console.error('❌ API: Error deleting admin user profile:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    console.log('✅ API: Admin user profile deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ API: Exception in admin user profiles DELETE:', error);
    return NextResponse.json({ error: 'Failed to delete admin user profile' }, { status: 500 });
  }
} 