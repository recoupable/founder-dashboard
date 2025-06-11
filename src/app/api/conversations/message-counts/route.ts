import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');

  // If start_date is not provided, use a very early date for "All Time"
  const now = new Date();
  const allTimeStartDate = '1970-01-01T00:00:00.000Z'; 
  const defaultCurrentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // If a start_date is explicitly passed, use it.
  // Otherwise, if it was intentionally omitted by the client (for All Time), use allTimeStartDate.
  // This specific API isn't directly selecting "Month", but keeping a monthly default if old clients call without params.
  const start = start_date ? start_date : (request.url.includes('start_date=') ? defaultCurrentMonthStart : allTimeStartDate);
  const end = end_date || now.toISOString();

  // Query Supabase for messages sent by users in the period
  const { data, error } = await supabaseAdmin.rpc('get_message_counts_by_user', { start_date: start, end_date: end });
  if (error) {
    console.error('Error fetching message counts by user:', error);
    return NextResponse.json({ error: 'Failed to fetch message counts by user' }, { status: 500 });
  }
  return NextResponse.json(data);
} 