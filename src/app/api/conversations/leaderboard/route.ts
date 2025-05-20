import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const supabase = supabaseAdmin;

  // Get the first day of the current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Query for segment report counts by user using the topic filter
  const { data, error } = await supabase
    .from('rooms')
    .select('account_id, updated_at, topic')
    .gte('updated_at', startOfMonth);

  // Debug log the fetched rooms data
  console.log('Rooms data:', data);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch emails for all account_ids
  const accountIds = Array.from(new Set((data as { account_id: string }[]).map(row => row.account_id)));
  const { data: emailsData, error: emailsError } = await supabase
    .from('account_emails')
    .select('account_id, email')
    .in('account_id', accountIds);

  if (emailsError) {
    return NextResponse.json({ error: emailsError.message }, { status: 500 });
  }

  // Count segment reports by user
  const counts: Record<string, number> = {};
  for (const row of data as { account_id: string; topic: string }[]) {
    if (row?.topic?.toLowerCase?.().startsWith('segment:')) {
      const email = emailsData?.find?.((e: { account_id: string; email: string }) => e.account_id === row.account_id)?.email;
      if (email) {
        counts[email] = (counts[email] || 0) + 1;
      }
    }
  }

  // Format the result
  const result = Object.entries(counts).map(([email, segment_report_count]) => ({ email, segment_report_count }));

  return NextResponse.json({ segmentReports: result });
} 