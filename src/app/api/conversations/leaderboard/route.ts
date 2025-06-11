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
  // Add a small buffer (1 day) to avoid edge cases where activity falls just outside the window
  const previousStart = new Date(startDate.getTime() - periodDuration - (24 * 60 * 60 * 1000)).toISOString();
  const previousEnd = start;

  // Get both segment reports AND message counts for comprehensive activity data
  
  // 1. Get segment reports for both periods
  const [currentReportsData, previousReportsData] = await Promise.all([
    supabase
      .from('rooms')
      .select('account_id, updated_at, topic')
      .gte('updated_at', start)
      .lte('updated_at', end),
    supabase
      .from('rooms')
      .select('account_id, updated_at, topic')
      .gte('updated_at', previousStart)
      .lte('updated_at', previousEnd)
  ]);

  if (currentReportsData.error) {
    return NextResponse.json({ error: currentReportsData.error.message }, { status: 500 });
  }
  if (previousReportsData.error) {
    return NextResponse.json({ error: previousReportsData.error.message }, { status: 500 });
  }

  // 2. Get message counts for current, previous, and historical periods
  // Historical period = everything before the previous period (to distinguish New vs Reactivated)
  const historicalEnd = previousStart;
  const historicalStart = '2020-01-01T00:00:00.000Z'; // Far back enough to capture all historical activity
  
  const [currentMessagesData, previousMessagesData, historicalMessagesData] = await Promise.all([
    supabase.rpc('get_message_counts_by_user', {
      start_date: start,
      end_date: end
    }),
    supabase.rpc('get_message_counts_by_user', {
      start_date: previousStart,
      end_date: previousEnd
    }),
    supabase.rpc('get_message_counts_by_user', {
      start_date: historicalStart,
      end_date: historicalEnd
    })
  ]);



  if (currentMessagesData.error) {
    return NextResponse.json({ error: currentMessagesData.error.message }, { status: 500 });
  }
  if (previousMessagesData.error) {
    return NextResponse.json({ error: previousMessagesData.error.message }, { status: 500 });
  }
  if (historicalMessagesData.error) {
    return NextResponse.json({ error: historicalMessagesData.error.message }, { status: 500 });
  }

  // 3. Get account identifiers (emails/wallets) for all users
  const allAccountIds = Array.from(new Set([
    ...(currentReportsData.data as { account_id: string }[]).map(row => row.account_id),
    ...(previousReportsData.data as { account_id: string }[]).map(row => row.account_id),
    ...(currentMessagesData.data || []).filter((row: { account_id?: string }) => row && row.account_id).map((row: { account_id: string }) => row.account_id),
    ...(previousMessagesData.data || []).filter((row: { account_id?: string }) => row && row.account_id).map((row: { account_id: string }) => row.account_id)
  ].filter(Boolean))); // Remove any undefined/null values
  
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

  // 4. Count segment reports by user for both periods
  const currentReportsCounts: Record<string, number> = {};
  for (const row of currentReportsData.data as { account_id: string; topic: string }[]) {
    if (row?.topic?.toLowerCase?.().startsWith('segment:')) {
      const identifier = accountToIdentifier.get(row.account_id);
      if (identifier) {
        currentReportsCounts[identifier] = (currentReportsCounts[identifier] || 0) + 1;
      }
    }
  }

  const previousReportsCounts: Record<string, number> = {};
  for (const row of previousReportsData.data as { account_id: string; topic: string }[]) {
    if (row?.topic?.toLowerCase?.().startsWith('segment:')) {
      const identifier = accountToIdentifier.get(row.account_id);
      if (identifier) {
        previousReportsCounts[identifier] = (previousReportsCounts[identifier] || 0) + 1;
      }
    }
  }

  // 5. Count messages by user for both periods
  // Note: RPC function returns account_email directly, not account_id
  const currentMessagesCounts: Record<string, number> = {};
  if (currentMessagesData.data && Array.isArray(currentMessagesData.data)) {
    for (const row of currentMessagesData.data) {
      if (row && row.account_email) {
        currentMessagesCounts[row.account_email] = row.message_count || 0;
      }
    }
  }

  const previousMessagesCounts: Record<string, number> = {};
  if (previousMessagesData.data && Array.isArray(previousMessagesData.data)) {
    for (const row of previousMessagesData.data) {
      if (row && row.account_email) {
        previousMessagesCounts[row.account_email] = row.message_count || 0;
      }
    }
  }

  const historicalMessagesCounts: Record<string, number> = {};
  if (historicalMessagesData.data && Array.isArray(historicalMessagesData.data)) {
    for (const row of historicalMessagesData.data) {
      if (row && row.account_email) {
        historicalMessagesCounts[row.account_email] = row.message_count || 0;
      }
    }
  }

  // 6. Calculate TOTAL activity (messages + reports) and trends for each user
  const allUsers = new Set([
    ...Object.keys(currentReportsCounts), 
    ...Object.keys(previousReportsCounts),
    ...Object.keys(currentMessagesCounts),
    ...Object.keys(previousMessagesCounts),
    ...Object.keys(historicalMessagesCounts)
  ]);

  const leaderboard = Array.from(allUsers).map(email => {
    const currentReports = currentReportsCounts[email] || 0;
    const previousReports = previousReportsCounts[email] || 0;
    const currentMessages = currentMessagesCounts[email] || 0;
    const previousMessages = previousMessagesCounts[email] || 0;
    const historicalMessages = historicalMessagesCounts[email] || 0;
    
    // Total activity = messages + reports
    const currentPeriodActions = currentMessages + currentReports;
    const previousPeriodActions = previousMessages + previousReports;
    
    // Calculate percentage change
    let percentChange: number | null = null;
    if (previousPeriodActions > 0) {
      percentChange = Math.round(((currentPeriodActions - previousPeriodActions) / previousPeriodActions) * 100);
    } else if (currentPeriodActions > 0) {
      percentChange = 100; // User with current activity but no previous activity
    }
    
    // Determine user status: New vs Reactivated vs Regular
    let isNew = false;
    let isReactivated = false;
    
    if (previousPeriodActions === 0 && currentPeriodActions > 0) {
      // User has current activity but no previous period activity
      if (historicalMessages > 0) {
        // Had activity before the previous period → Reactivated
        isReactivated = true;
      } else {
        // No historical activity → New user
        isNew = true;
      }
    }
    
    return {
      email,
      currentPeriodActions,
      previousPeriodActions,
      percentChange,
      isNew,
      isReactivated
    };
  }).filter(user => user.currentPeriodActions > 0); // Only include users with current activity

  // Also format segment reports for backward compatibility
  const segmentReports = Object.entries(currentReportsCounts).map(([email, segment_report_count]) => ({ 
    email, 
    segment_report_count 
  }));

  return NextResponse.json({ 
    leaderboard,
    segmentReports 
  });
} 