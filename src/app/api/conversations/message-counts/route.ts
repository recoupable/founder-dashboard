import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  // Get the first day of the current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Query Supabase for messages sent by users this month, grouped by account_email
  const { data, error } = await supabaseAdmin.rpc('get_message_counts_by_user', { start_date: startOfMonth });
  if (error) {
    console.error('Error fetching message counts by user:', error);
    return NextResponse.json({ error: 'Failed to fetch message counts by user' }, { status: 500 });
  }
  return NextResponse.json(data);
} 