import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');

  const supabase = supabaseAdmin;

  // Default to start of month if not provided
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const start = start_date || defaultStart;
  const end = end_date || now.toISOString();

  // Query for segment report counts by user using the topic filter and date range
  const { data, error } = await supabase
    .from('rooms')
    .select('account_id, updated_at, topic')
    .gte('updated_at', start)
    .lte('updated_at', end);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch emails and wallets for all account_ids
  const accountIds = Array.from(new Set((data as { account_id: string }[]).map(row => row.account_id)));
  
  // Get both emails and wallets
  const [emailsResponse, walletsResponse] = await Promise.all([
    supabase
      .from('account_emails')
      .select('account_id, email')
      .in('account_id', accountIds),
    supabase
      .from('account_wallets')
      .select('account_id, wallet')
      .in('account_id', accountIds)
  ]);

  if (emailsResponse.error) {
    return NextResponse.json({ error: emailsResponse.error.message }, { status: 500 });
  }

  const emailsData = emailsResponse.data || [];
  const walletsData = walletsResponse.data || [];

  // Build account to identifier map (prefer email, fallback to wallet)
  const accountToIdentifier = new Map<string, string>();
  emailsData.forEach((row: { account_id: string, email: string }) => {
    if (row.email) {
      accountToIdentifier.set(row.account_id, row.email);
    }
  });
  walletsData.forEach((row: { account_id: string, wallet: string }) => {
    if (row.wallet && !accountToIdentifier.has(row.account_id)) {
      accountToIdentifier.set(row.account_id, row.wallet);
    }
  });

  // Count segment reports by user
  const counts: Record<string, number> = {};
  for (const row of data as { account_id: string; topic: string }[]) {
    if (row?.topic?.toLowerCase?.().startsWith('segment:')) {
      const identifier = accountToIdentifier.get(row.account_id);
      if (identifier) {
        counts[identifier] = (counts[identifier] || 0) + 1;
      }
    }
  }

  // Format the result
  const result = Object.entries(counts).map(([email, segment_report_count]) => ({ email, segment_report_count }));

  return NextResponse.json({ segmentReports: result });
} 