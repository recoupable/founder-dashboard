import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start') || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(); // Default: last year
    const end = searchParams.get('end') || new Date().toISOString(); // Default: now
    
    console.log('=== VERIFICATION: Active Users Analysis ===');
    console.log('Date range:', start, 'to', end);
    
    // Step 1: Get ALL accounts (emails + wallets)
    const [emailAccountsResponse, walletAccountsResponse] = await Promise.all([
      supabaseAdmin.from('account_emails').select('account_id, email'),
      supabaseAdmin.from('account_wallets').select('account_id, wallet')
    ]);
    
    const emailAccounts = emailAccountsResponse.data || [];
    const walletAccounts = walletAccountsResponse.data || [];
    
    console.log('📊 STEP 1: Account Counts');
    console.log('- Email accounts:', emailAccounts.length);
    console.log('- Wallet accounts:', walletAccounts.length);
    
    // Step 2: Get test emails
    const { data: testEmailsData } = await supabaseAdmin.from('test_emails').select('email');
    const testEmailsList = testEmailsData?.map(item => item.email) || [];
    
    console.log('📊 STEP 2: Test Accounts');
    console.log('- Test emails in database:', testEmailsList);
    
    // List of test wallet account IDs to exclude
    const testWalletAccountIds = ['3cdea198', '5ada04cd', '44b0c8fd', 'c9e86577', '496a071a', 'a3b8a5ba', '2fbe2485'];
    
    // Get test artist accounts to exclude
    const { data: testArtistAccounts } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('name', 'sweetman_eth');
    
    const testArtistAccountIds = new Set(testArtistAccounts?.map(account => account.id) || []);
    console.log(`Verify API: Found ${testArtistAccountIds.size} test artist accounts to exclude`);
    
    const isTestAccount = (accountId: string, email: string): boolean => {
      // Test wallet patterns
      if (testWalletAccountIds.some(testId => accountId.includes(testId))) {
        return true;
      }
      
      // Test emails
      if (!email) return false;
      if (testEmailsList.includes(email)) return true;
      if (email.includes('@example.com') || email.includes('+')) return true;
      return false;
    };
    
    // Step 3: Identify test accounts
    const testAccountIds = new Set<string>();
    
    // Find test email accounts
    for (const account of emailAccounts) {
      const email = account.email;
      if (email && isTestAccount(account.account_id, email)) {
        testAccountIds.add(account.account_id);
      }
    }
    
    // Find test wallet accounts
    for (const account of walletAccounts) {
      if (isTestAccount(account.account_id, account.wallet)) {
        testAccountIds.add(account.account_id);
      }
    }
    
    console.log('- Test account IDs found:', Array.from(testAccountIds).map((id: string) => id.substring(0, 8)));
    
    // Step 4: Get ALL rooms
    const { data: allRoomsData } = await supabaseAdmin
      .from('rooms')
      .select('id, account_id, updated_at, topic');
    
    const allRooms = allRoomsData || [];
    console.log('📊 STEP 3: Room Counts');
    console.log('- Total rooms in database:', allRooms.length);
    
    // Step 5: Get rooms for test accounts
    const testAccountRooms = allRooms.filter(room => testAccountIds.has(room.account_id));
    console.log('- Rooms belonging to test accounts:', testAccountRooms.length);
    
    // Step 6: Get ALL active rooms (rooms with messages in date range)
    const { data: allActiveMemories } = await supabaseAdmin
      .from('memories')
      .select('room_id')
      .gte('updated_at', start)
      .lte('updated_at', end);
    
    const activeRoomIds = new Set((allActiveMemories || []).map(m => m.room_id));
    console.log('📊 STEP 4: Activity Analysis');
    console.log('- Rooms with messages in date range:', activeRoomIds.size);
    
    // Step 7: Find active rooms and their owners
    const activeRooms = allRooms.filter(room => activeRoomIds.has(room.id));
    const allActiveUserIds = new Set<string>(activeRooms.map(room => room.account_id));
    
    console.log('- Active rooms (rooms + messages):', activeRooms.length);
    console.log('- Unique active users (before filtering):', allActiveUserIds.size);
    
    // Step 8: Filter out test accounts
    const realActiveUserIds = new Set<string>();
    const testActiveUserIds = new Set<string>();
    
    for (const userId of allActiveUserIds) {
      if (testAccountIds.has(userId)) {
        testActiveUserIds.add(userId);
      } else {
        realActiveUserIds.add(userId);
      }
    }
    
    console.log('📊 STEP 5: Final Results');
    console.log('- Test accounts that were active:', testActiveUserIds.size, Array.from(testActiveUserIds).map((id: string) => id.substring(0, 8)));
    console.log('- Real active users (after filtering test accounts):', realActiveUserIds.size);
    console.log('- Expected difference:', testActiveUserIds.size);
    
    // Step 9: Verification math
    const expectedFilteredCount = allActiveUserIds.size - testActiveUserIds.size;
    console.log('📊 STEP 6: Verification');
    console.log('- Math check: Total active (' + allActiveUserIds.size + ') - Test active (' + testActiveUserIds.size + ') = Expected (' + expectedFilteredCount + ')');
    console.log('- Actual filtered count:', realActiveUserIds.size);
    console.log('- Math matches:', expectedFilteredCount === realActiveUserIds.size ? '✅ YES' : '❌ NO');
    
    // Step 4: Get rooms for non-test accounts
    const nonTestAccountIds = Array.from(new Set([...emailAccounts.map(a => a.account_id), ...walletAccounts.map(a => a.account_id)]).values());
    console.log('- Non-test account IDs:', nonTestAccountIds.length);
    
    const { data: nonTestRoomsRaw } = await supabaseAdmin
      .from('rooms')
      .select('id, account_id, artist_id')
      .in('account_id', nonTestAccountIds);
    
    // Filter out rooms with test artists
    const nonTestRooms = nonTestRoomsRaw?.filter(room => 
      !testArtistAccountIds.has(room.artist_id)
    ) || [];
    
    console.log('- Rooms after filtering test artists:', nonTestRooms.length, 'of', nonTestRoomsRaw?.length || 0);
    
    // Return comprehensive results
    return NextResponse.json({
      dateRange: { start, end },
      totalAccounts: {
        email: emailAccounts.length,
        wallet: walletAccounts.length,
        total: new Set([...emailAccounts.map(a => a.account_id), ...walletAccounts.map(a => a.account_id)]).size
      },
      testAccounts: {
        identified: testAccountIds.size,
        details: Array.from(testAccountIds).map((id: string) => id.substring(0, 8))
      },
      rooms: {
        total: allRooms.length,
        belongingToTestAccounts: testAccountRooms.length
      },
      activity: {
        roomsWithMessages: activeRoomIds.size,
        activeRooms: activeRooms.length,
        allActiveUsers: allActiveUserIds.size,
        testActiveUsers: testActiveUserIds.size,
        realActiveUsers: realActiveUserIds.size,
        mathCheck: {
          expected: expectedFilteredCount,
          actual: realActiveUserIds.size,
          matches: expectedFilteredCount === realActiveUserIds.size
        }
      }
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
} 