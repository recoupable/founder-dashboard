import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const excludeTestEmails = searchParams.get('excludeTest') === 'true';
  
  console.log('=== DEBUG VERIFICATION START ===');
  console.log('excludeTestEmails:', excludeTestEmails);
  
  try {
    // Define time periods
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    console.log('Time period - Today:', startOfToday.toISOString(), 'to', now.toISOString());
    
    // Get test emails list if excluding
    let allowedAccountIds: string[] = [];
    let testEmailsList: string[] = [];
    
    if (excludeTestEmails) {
      const { data: testEmailsData } = await supabaseAdmin
        .from('test_emails')
        .select('email');
      testEmailsList = testEmailsData?.map(item => item.email) || [];
      
      console.log('Test emails to exclude:', testEmailsList);
      
      // Get account IDs to include (email users minus test emails + all wallet users)
      const [emailAccountsResponse, walletAccountsResponse] = await Promise.all([
        supabaseAdmin
          .from('account_emails')
          .select('account_id, email'),
        supabaseAdmin
          .from('account_wallets') 
          .select('account_id, wallet')
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
      
      // Add all wallet users
      if (walletAccountsResponse.data) {
        for (const account of walletAccountsResponse.data) {
          allowedAccountIdsSet.add(account.account_id);
        }
      }
      
      allowedAccountIds = Array.from(allowedAccountIdsSet);
      console.log('Allowed account IDs count:', allowedAccountIds.length);
    }
    
    // METHOD 1: Count rooms created today (current "Conversations Today" logic)
    let roomsCreatedToday = 0;
    if (excludeTestEmails && allowedAccountIds.length > 0) {
      const { count: roomCount } = await supabaseAdmin
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', startOfToday.toISOString())
        .in('account_id', allowedAccountIds);
      roomsCreatedToday = roomCount || 0;
    } else {
      const { count: roomCount } = await supabaseAdmin
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', startOfToday.toISOString());
      roomsCreatedToday = roomCount || 0;
    }
    
    console.log('METHOD 1 - Rooms created today:', roomsCreatedToday);
    
    // METHOD 2: Count messages sent today (current leaderboard logic)
    const { data: messageCountsData, error: messageError } = await supabaseAdmin
      .rpc('get_message_counts_by_user', { 
        start_date: startOfToday.toISOString(), 
        end_date: now.toISOString() 
      });
    
    let totalMessagesSentToday = 0;
    let messageCountsByUser = [];
    
    if (messageError) {
      console.error('Error fetching message counts:', messageError);
    } else if (messageCountsData) {
      // Filter out test emails if needed
      const filteredMessageCounts = excludeTestEmails 
        ? messageCountsData.filter((row: { account_email: string, message_count: number }) => {
            const email = row.account_email;
            if (!email) return false;
            // Apply same test email filtering logic
            if (testEmailsList.includes(email)) return false;
            if (email.includes('@example.com')) return false;
            if (email.includes('+')) return false;
            return true;
          })
        : messageCountsData;
      
      totalMessagesSentToday = filteredMessageCounts.reduce((sum: number, row: { message_count: number }) => 
        sum + row.message_count, 0
      );
      
      messageCountsByUser = filteredMessageCounts;
      console.log('METHOD 2 - Messages sent today (total):', totalMessagesSentToday);
      console.log('METHOD 2 - Message counts by user:', messageCountsByUser);
    }
    
    // METHOD 3: Direct count of memories created today
    let memoriesCreatedToday = 0;
    if (excludeTestEmails && allowedAccountIds.length > 0) {
      // Get rooms for allowed accounts
      const { data: allowedRooms } = await supabaseAdmin
        .from('rooms')
        .select('id')
        .in('account_id', allowedAccountIds);
      
      const allowedRoomIds = allowedRooms?.map(room => room.id) || [];
      
      if (allowedRoomIds.length > 0) {
        const { count: memoryCount } = await supabaseAdmin
          .from('memories')
          .select('*', { count: 'exact', head: true })
          .gte('updated_at', startOfToday.toISOString())
          .in('room_id', allowedRoomIds);
        memoriesCreatedToday = memoryCount || 0;
      }
    } else {
      const { count: memoryCount } = await supabaseAdmin
        .from('memories')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', startOfToday.toISOString());
      memoriesCreatedToday = memoryCount || 0;
    }
    
    console.log('METHOD 3 - Direct memories count today:', memoriesCreatedToday);
    
    // METHOD 4: Count rooms that had messages today (active conversations)
    let activeConversationsToday = 0;
    if (excludeTestEmails && allowedAccountIds.length > 0) {
      const { data: allowedRooms } = await supabaseAdmin
        .from('rooms')
        .select('id')
        .in('account_id', allowedAccountIds);
      
      const allowedRoomIds = allowedRooms?.map(room => room.id) || [];
      
      if (allowedRoomIds.length > 0) {
        const { data: activeRooms } = await supabaseAdmin
          .from('memories')
          .select('room_id')
          .gte('updated_at', startOfToday.toISOString())
          .in('room_id', allowedRoomIds);
        
        const uniqueActiveRooms = new Set(activeRooms?.map(m => m.room_id) || []);
        activeConversationsToday = uniqueActiveRooms.size;
      }
    } else {
      const { data: activeRooms } = await supabaseAdmin
        .from('memories')
        .select('room_id')
        .gte('updated_at', startOfToday.toISOString());
      
      const uniqueActiveRooms = new Set(activeRooms?.map(m => m.room_id) || []);
      activeConversationsToday = uniqueActiveRooms.size;
    }
    
    console.log('METHOD 4 - Active conversations today (rooms with messages):', activeConversationsToday);
    
    const result = {
      timestamp: now.toISOString(),
      excludeTestEmails,
      timeRange: {
        start: startOfToday.toISOString(),
        end: now.toISOString()
      },
      metrics: {
        roomsCreatedToday, // Current "Conversations Today" metric
        totalMessagesSentToday, // Current leaderboard total
        memoriesCreatedToday, // Direct count from memories table
        activeConversationsToday // Rooms that had messages today
      },
      messageCountsByUser,
      recommendations: {
        issue: totalMessagesSentToday !== memoriesCreatedToday ? 
          'DISCREPANCY: RPC function result differs from direct memories count' : 
          'Message counts match between RPC and direct query',
        suggestion: roomsCreatedToday > activeConversationsToday ?
          'Many rooms created without messages - consider showing active conversations instead' :
          'Room creation and activity are aligned'
      }
    };
    
    console.log('=== DEBUG VERIFICATION RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Debug verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Debug verification failed', details: errorMessage }, { status: 500 });
  }
} 