import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') || 'Last 30 Days';
    const excludeTest = searchParams.get('excludeTest') === 'true';
    
    console.log('Active Users API: Calculating active users for period:', timeFilter);
    
    // Calculate date ranges based on time filter
    const now = new Date();
    const getDateRange = (filter: string) => {
      switch (filter) {
        case 'Last 24 Hours':
          const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          return { start: last24Hours, end: now };
        case 'Last 7 Days':
          const last7Days = new Date(now);
          last7Days.setDate(now.getDate() - 7);
          return { start: last7Days, end: now };
        case 'Last 30 Days':
          const last30Days = new Date(now);
          last30Days.setDate(now.getDate() - 30);
          return { start: last30Days, end: now };
        case 'Last 3 Months':
          const last3Months = new Date(now);
          last3Months.setMonth(now.getMonth() - 3);
          return { start: last3Months, end: now };
        case 'Last 12 Months':
          const last12Months = new Date(now);
          last12Months.setFullYear(now.getFullYear() - 1);
          return { start: last12Months, end: now };
        default: // All Time or any unrecognized filter
          return { start: null, end: now };
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

    // Get test filtering data if excluding test accounts
    let allowedAccountIds: string[] = [];
    let allowedRoomIds: string[] = [];
    
    if (excludeTest) {
      // Get test emails list
      const { data: testEmailsData } = await supabaseAdmin
        .from('test_emails')
        .select('email');
      const testEmailsList = (testEmailsData?.map(item => item.email) || []) as string[];
      
      // Get account data for filtering
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
      
      allowedAccountIds = Array.from(allowedAccountIdsSet);
      
      // Get test artist accounts to exclude
      const { data: testArtistAccounts } = await supabaseAdmin
        .from('accounts')
        .select('id')
        .eq('name', 'sweetman_eth');
      
      const testArtistAccountIds = new Set(testArtistAccounts?.map(account => account.id) || []);
      
      // Get allowed rooms (excluding test artist rooms)
      const { data: allowedRoomsData } = await supabaseAdmin
        .from('rooms')
        .select('id, artist_id')
        .in('account_id', allowedAccountIds);
      
      allowedRoomIds = allowedRoomsData?.filter(room => !testArtistAccountIds.has(room.artist_id))?.map(room => room.id) || [];
      
      console.log('Active Users API: Allowed accounts:', allowedAccountIds.length, 'Allowed rooms:', allowedRoomIds.length);
    }

    // Helper function to get active users for a time period
    const getActiveUsersForPeriod = async (start: Date | null, end: Date) => {
      const activeUserIds = new Set<string>();
      
      // Get users who sent messages
      let messageQuery = supabaseAdmin
        .from('memories')
        .select('room_id')
        .lte('updated_at', end.toISOString());
      
      if (start) {
        messageQuery = messageQuery.gte('updated_at', start.toISOString());
      }
      
      if (excludeTest && allowedRoomIds.length > 0) {
        messageQuery = messageQuery.in('room_id', allowedRoomIds);
      }
      
      const { data: messageData } = await messageQuery;
      
      if (messageData) {
        // Get room owners for message rooms
        const activeRoomIds = Array.from(new Set(messageData.map(m => m.room_id)));
        if (activeRoomIds.length > 0) {
          const { data: roomsData } = await supabaseAdmin
            .from('rooms')
            .select('account_id')
            .in('id', activeRoomIds);
          
          if (roomsData) {
            roomsData.forEach(room => activeUserIds.add(room.account_id));
          }
        }
      }
      
      // Get users who created segment reports
      let reportQuery = supabaseAdmin
        .from('segment_reports')
        .select('account_email')
        .lte('updated_at', end.toISOString());
      
      if (start) {
        reportQuery = reportQuery.gte('updated_at', start.toISOString());
      }
      
      const { data: reportData } = await reportQuery;
      
      if (reportData) {
        // Convert emails to account IDs
        for (const report of reportData) {
          if (!report.account_email) continue;
          
          // Find account ID for this email
          const { data: emailAccount } = await supabaseAdmin
            .from('account_emails')
            .select('account_id')
            .eq('email', report.account_email)
            .single();
          
          if (emailAccount && (!excludeTest || allowedAccountIds.includes(emailAccount.account_id))) {
            activeUserIds.add(emailAccount.account_id);
          }
        }
      }
      
      return activeUserIds.size;
    };

    // Calculate active users for current and previous periods
    const [currentActiveUsers, previousActiveUsers] = await Promise.all([
      getActiveUsersForPeriod(currentPeriod.start, currentPeriod.end),
      previousPeriod.start && previousPeriod.end ? getActiveUsersForPeriod(previousPeriod.start, previousPeriod.end) : Promise.resolve(0)
    ]);

    // Calculate percentage change
    let percentChange = 0;
    let changeDirection = 'neutral';
    
    if (previousActiveUsers > 0) {
      percentChange = Math.round(((currentActiveUsers - previousActiveUsers) / previousActiveUsers) * 100);
      changeDirection = currentActiveUsers > previousActiveUsers ? 'up' : currentActiveUsers < previousActiveUsers ? 'down' : 'neutral';
    } else if (currentActiveUsers > 0) {
      changeDirection = 'up';
      percentChange = 100; // If no previous data but current data exists
    }

    const result = {
      activeUsers: currentActiveUsers,
      previousActiveUsers,
      percentChange,
      changeDirection,
      timeFilter,
      excludeTest
    };

    console.log('Active Users API: Result:', result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Active Users API: Error:', error);
    return NextResponse.json({ error: 'Failed to fetch active users' }, { status: 500 });
  }
} 