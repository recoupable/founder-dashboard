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

  // Calculate previous period dates for trend comparison
  const startDate = new Date(start);
  const endDate = new Date(end);
  const periodDuration = endDate.getTime() - startDate.getTime();
  const previousStart = new Date(startDate.getTime() - periodDuration).toISOString();
  const previousEnd = start;

  // Get current period data
  const { data: currentData, error: currentError } = await supabase
    .from('rooms')
    .select('account_id, updated_at, topic')
    .gte('updated_at', start)
    .lte('updated_at', end);

  if (currentError) {
    return NextResponse.json({ error: currentError.message }, { status: 500 });
  }

  // Get previous period data
  const { data: previousData, error: previousError } = await supabase
    .from('rooms')
    .select('account_id, updated_at, topic')
    .gte('updated_at', previousStart)
    .lte('updated_at', previousEnd);

  if (previousError) {
    return NextResponse.json({ error: previousError.message }, { status: 500 });
  }

  // Fetch emails and wallets for all account_ids from both periods
  const allAccountIds = Array.from(new Set([
    ...(currentData as { account_id: string }[]).map(row => row.account_id),
    ...(previousData as { account_id: string }[]).map(row => row.account_id)
  ]));
  
  // Get both emails and wallets
  const [emailsResponse, walletsResponse] = await Promise.all([
    supabase
      .from('account_emails')
      .select('account_id, email')
      .in('account_id', allAccountIds),
    supabase
      .from('account_wallets')
      .select('account_id, wallet')
      .in('account_id', allAccountIds)
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

  // Count segment reports by user for current period
  const currentCounts: Record<string, number> = {};
  for (const row of currentData as { account_id: string; topic: string }[]) {
    if (row?.topic?.toLowerCase?.().startsWith('segment:')) {
      const identifier = accountToIdentifier.get(row.account_id);
      if (identifier) {
        currentCounts[identifier] = (currentCounts[identifier] || 0) + 1;
      }
    }
  }

  // Count segment reports by user for previous period
  const previousCounts: Record<string, number> = {};
  for (const row of previousData as { account_id: string; topic: string }[]) {
    if (row?.topic?.toLowerCase?.().startsWith('segment:')) {
      const identifier = accountToIdentifier.get(row.account_id);
      if (identifier) {
        previousCounts[identifier] = (previousCounts[identifier] || 0) + 1;
      }
    }
  }

  // Calculate trend data for each user
  const allUsers = new Set([...Object.keys(currentCounts), ...Object.keys(previousCounts)]);
  const leaderboard = Array.from(allUsers).map(email => {
    const currentPeriodActions = currentCounts[email] || 0;
    const previousPeriodActions = previousCounts[email] || 0;
    
    // Calculate percentage change
    let percentChange: number | null = null;
    if (previousPeriodActions > 0) {
      percentChange = Math.round(((currentPeriodActions - previousPeriodActions) / previousPeriodActions) * 100);
    } else if (currentPeriodActions > 0) {
      percentChange = 100; // New user with activity
    }
    
    // Determine user status
    const isNew = previousPeriodActions === 0 && currentPeriodActions > 0;
    const isReactivated = false; // For now, just use isNew. Reactivated would need historical data
    
    return {
      email,
      currentPeriodActions,
      previousPeriodActions,
      percentChange,
      isNew,
      isReactivated
    };
  });

  // Also format segment reports for backward compatibility
  const segmentReports = Object.entries(currentCounts).map(([email, segment_report_count]) => ({ 
    email, 
    segment_report_count 
  }));

  return NextResponse.json({ 
    leaderboard,
    segmentReports 
  });
} 