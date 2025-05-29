import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');

  // Default to start of month if not provided
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const start = start_date || defaultStart;
  const end = end_date || now.toISOString();

  // Query Supabase for messages sent by users in the period
  const { data, error } = await supabaseAdmin.rpc('get_message_counts_by_user', { start_date: start, end_date: end });
  if (error) {
    console.error('Error fetching message counts by user:', error);
    return NextResponse.json({ error: 'Failed to fetch message counts by user' }, { status: 500 });
  }
  return NextResponse.json(data);
} 