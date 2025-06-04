import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') || 'Last 30 Days';
    const excludeTest = searchParams.get('excludeTest') === 'true';
    
    console.log('Active Users Chart API: Generating chart data for period:', timeFilter);
    
    // Calculate date ranges and granularity based on time filter
    const now = new Date();
    const intervals: { start: Date, end: Date, label: string }[] = [];
    
    switch (timeFilter) {
      case 'Last 24 Hours':
        // Hourly intervals for last 24 hours
        for (let i = 23; i >= 0; i--) {
          const end = new Date(now.getTime() - i * 60 * 60 * 1000);
          const start = new Date(end.getTime() - 60 * 60 * 1000);
          intervals.push({
            start,
            end,
            label: end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          });
        }
        break;
        
      case 'Last 7 Days':
        // Daily intervals for last 7 days
        for (let i = 6; i >= 0; i--) {
          const start = new Date(now);
          start.setDate(now.getDate() - i);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setHours(23, 59, 59, 999);
          intervals.push({
            start,
            end,
            label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          });
        }
        break;
        
      case 'Last 30 Days':
        // Daily intervals for last 30 days
        for (let i = 29; i >= 0; i--) {
          const start = new Date(now);
          start.setDate(now.getDate() - i);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setHours(23, 59, 59, 999);
          intervals.push({
            start,
            end,
            label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          });
        }
        break;
        
      case 'Last 3 Months':
        // Weekly intervals for last 3 months
        for (let i = 12; i >= 0; i--) {
          const end = new Date(now);
          end.setDate(now.getDate() - i * 7);
          const start = new Date(end);
          start.setDate(end.getDate() - 6);
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          intervals.push({
            start,
            end,
            label: `Week of ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
          });
        }
        break;
        
      case 'Last 12 Months':
        // Monthly intervals for last 12 months
        for (let i = 11; i >= 0; i--) {
          const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
          intervals.push({
            start,
            end,
            label: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          });
        }
        break;
        
      default:
        // Default to last 30 days
        for (let i = 29; i >= 0; i--) {
          const start = new Date(now);
          start.setDate(now.getDate() - i);
          start.setHours(0, 0, 0, 0);
          const end = new Date(start);
          end.setHours(23, 59, 59, 999);
          intervals.push({
            start,
            end,
            label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          });
        }
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
    }

    // Calculate active users for each interval
    const data = await Promise.all(intervals.map(async (interval) => {
      const activeUserIds = new Set<string>();
      
      // Get users who sent messages in this interval
      let messageQuery = supabaseAdmin
        .from('memories')
        .select('room_id')
        .gte('updated_at', interval.start.toISOString())
        .lte('updated_at', interval.end.toISOString());
      
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
      
      // Get users who created segment reports in this interval
      const reportQuery = supabaseAdmin
        .from('segment_reports')
        .select('account_email')
        .gte('updated_at', interval.start.toISOString())
        .lte('updated_at', interval.end.toISOString());
      
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
      
      return {
        label: interval.label,
        value: activeUserIds.size,
        date: interval.start.toISOString()
      };
    }));

    const result = {
      labels: data.map(d => d.label),
      data: data.map(d => d.value),
      timeFilter,
      excludeTest
    };

    console.log('Active Users Chart API: Generated', data.length, 'data points');
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Active Users Chart API: Error:', error);
    return NextResponse.json({ error: 'Failed to fetch active users chart data' }, { status: 500 });
  }
} 