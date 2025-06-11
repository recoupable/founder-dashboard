import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') || 'Last 7 Days';
    
    const now = new Date();
    
    // Calculate date ranges based on time filter (FORCE UTC for consistency)
    const getDateRange = (filter: string) => {
      // Force UTC by using getTime() and creating new dates from timestamps
      const nowUTC = new Date(now.getTime());
      
      switch (filter) {
        case 'Last 7 Days':
          const last7Days = new Date(nowUTC.getTime() - 7 * 24 * 60 * 60 * 1000);
          return { start: last7Days, end: nowUTC };
        default:
          return { start: null, end: nowUTC };
      }
    };

    // Get current period and comparison periods
    const currentPeriod = getDateRange(timeFilter);
    
    // Calculate comparison periods
    const previousPeriod: { start: Date | null, end: Date | null } = { start: null, end: null };
    if (currentPeriod.start) {
      const periodLength = currentPeriod.end.getTime() - currentPeriod.start.getTime();
      previousPeriod.end = new Date(currentPeriod.start.getTime() - 1); // End 1ms before current period starts
      previousPeriod.start = new Date(currentPeriod.start.getTime() - periodLength);
    }
    
    // Get test filtering data
    const { data: testEmailsData } = await supabaseAdmin.from('test_emails').select('email');
    const testEmailsList = (testEmailsData?.map(item => item.email) || []) as string[];
    
    const [emailAccountsResponse, walletAccountsResponse] = await Promise.all([
      supabaseAdmin.from('account_emails').select('account_id, email'),
      supabaseAdmin.from('account_wallets').select('account_id, wallet')
    ]);
    
    const allowedAccountIdsSet = new Set<string>();
    
    // Add non-test email users
    if (emailAccountsResponse.data) {
      for (const account of emailAccountsResponse.data) {
        const email = account.email;
        if (!email) continue;
        if (testEmailsList.includes(email)) continue;
        if (email.includes('@example.com')) continue;
        if (email.includes('+')) continue;
        allowedAccountIdsSet.add(account.account_id);
      }
    }
    
    // Test wallet account IDs to exclude
    const testWalletAccountIds = ['3cdea198', '5ada04cd', '44b0c8fd', 'c9e86577', '496a071a', 'a3b8a5ba', '2fbe2485'];
    
    // Add wallet users, excluding test wallets
    if (walletAccountsResponse.data) {
      for (const account of walletAccountsResponse.data) {
        const isTestWallet = testWalletAccountIds.some(testId => account.account_id.startsWith(testId));
        if (!isTestWallet) {
          allowedAccountIdsSet.add(account.account_id);
        }
      }
    }
    
    const allowedAccountIds = Array.from(allowedAccountIdsSet);
    
    // Count messages in current period
    let currentMessageQuery = supabaseAdmin
      .from('memories')
      .select('room_id', { count: 'exact' })
      .lte('updated_at', currentPeriod.end.toISOString());
    
    if (currentPeriod.start) {
      currentMessageQuery = currentMessageQuery.gte('updated_at', currentPeriod.start.toISOString());
    }
    
    const { count: currentMessages } = await currentMessageQuery;
    
    // Count messages in previous period  
    let previousMessages = 0;
    if (previousPeriod.start && previousPeriod.end) {
      const { count } = await supabaseAdmin
        .from('memories')
        .select('room_id', { count: 'exact' })
        .gte('updated_at', previousPeriod.start.toISOString())
        .lte('updated_at', previousPeriod.end.toISOString());
      previousMessages = count || 0;
    }
    
    const result = {
      environment: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        serverTime: now.toString(),
        utcTime: now.toISOString()
      },
      dateRanges: {
        current: {
          start: currentPeriod.start?.toISOString(),
          end: currentPeriod.end.toISOString(),
          startLocal: currentPeriod.start?.toLocaleString(),
          endLocal: currentPeriod.end.toLocaleString()
        },
        previous: {
          start: previousPeriod.start?.toISOString(),
          end: previousPeriod.end?.toISOString(),
          startLocal: previousPeriod.start?.toLocaleString(),
          endLocal: previousPeriod.end?.toLocaleString()
        }
      },
      filtering: {
        testEmails: testEmailsList.length,
        allowedAccounts: allowedAccountIds.length,
        testWalletIds: testWalletAccountIds.length
      },
      messageCounts: {
        currentPeriod: currentMessages,
        previousPeriod: previousMessages
      }
    };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Date Range Debug API: Error:', error);
    return NextResponse.json({ error: 'Failed to debug date ranges' }, { status: 500 });
  }
} 