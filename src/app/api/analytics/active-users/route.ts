import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Type for room objects
type Room = {
  id: string;
  account_id: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    
    if (!start || !end) {
      return NextResponse.json({ error: 'start and end parameters are required' }, { status: 400 });
    }
    
    console.log('Analytics API: Fetching active users from', start, 'to', end);
    
    // Step 1: Get test emails to exclude (same as conversations route)
    const { data: testEmailsData } = await supabaseAdmin
      .from('test_emails')
      .select('email');
    const testEmailsList = testEmailsData?.map(item => item.email) || [];
    console.log('Analytics API: Test emails from test_emails table:', testEmailsList);
    
    // Step 2: Get account IDs to include (email users minus test emails + wallet users minus test emails)
    const [emailAccountsResponse, walletAccountsResponse] = await Promise.all([
      supabaseAdmin
        .from('account_emails')
        .select('account_id, email'),
      supabaseAdmin
        .from('account_wallets') 
        .select('account_id, wallet')
    ]);
    
    const allowedAccountIds = new Set();
    const allAccountIds = new Set(); // Track ALL accounts for comparison
    
    // Add ALL email users first (for comparison)
    if (emailAccountsResponse.data) {
      for (const account of emailAccountsResponse.data) {
        allAccountIds.add(account.account_id);
      }
    }
    if (walletAccountsResponse.data) {
      for (const account of walletAccountsResponse.data) {
        allAccountIds.add(account.account_id);
      }
    }
    
    // Add non-test email users (exact same logic as conversations route)
    if (emailAccountsResponse.data) {
      for (const account of emailAccountsResponse.data) {
        const email = account.email;
        if (!email) continue;
        if (testEmailsList.includes(email)) continue;
        if (email.includes('@example.com')) continue;
        if (email.includes('+')) continue;
        allowedAccountIds.add(account.account_id);
      }
    }
    
    // List of test wallet account IDs to exclude
    const testWalletAccountIds = ['3cdea198', '5ada04cd', '44b0c8fd', 'c9e86577', '496a071a', 'a3b8a5ba', '2fbe2485'];
    
    // Also get test artist accounts to exclude
    const { data: testArtistAccounts } = await supabaseAdmin
      .from('accounts')
      .select('id')
      .eq('name', 'sweetman_eth');
    
    const testArtistAccountIds = new Set(testArtistAccounts?.map(account => account.id) || []);
    console.log(`Analytics API: Found ${testArtistAccountIds.size} test artist accounts to exclude`);
    
    // Add wallet users, but ALSO filter out test wallet users
    let walletUsersSkipped = 0;
    if (walletAccountsResponse.data) {
      console.log('Analytics API: Processing', walletAccountsResponse.data.length, 'wallet users');
      
      for (const walletAccount of walletAccountsResponse.data) {
        const accountId = walletAccount.account_id;
        
        // Check if this is a test wallet user (by account ID pattern)
        const isTestWallet = testWalletAccountIds.some(testId => accountId.startsWith(testId));
        if (isTestWallet) {
          console.log('Analytics API: *** SKIPPING test wallet user:', accountId.substring(0, 8));
          walletUsersSkipped++;
          continue;
        }
        
        // Check if this wallet user has an associated email that's a test email
        const associatedEmailAccount = emailAccountsResponse.data?.find(
          emailAccount => emailAccount.account_id === accountId
        );
        
        if (associatedEmailAccount) {
          const email = associatedEmailAccount.email;
          console.log('Analytics API: Wallet user', accountId.substring(0, 8), 'has email:', email);
          
          // If wallet user has a test email, skip them
          if (email && (
            testEmailsList.includes(email) ||
            email.includes('@example.com') ||
            email.includes('+')
          )) {
            console.log('Analytics API: *** SKIPPING wallet user with test email:', email);
            walletUsersSkipped++;
            continue;
          }
        } else {
          console.log('Analytics API: Wallet user', accountId.substring(0, 8), 'has NO associated email');
        }
        
        // Add wallet user if they don't have a test email and aren't a test wallet
        allowedAccountIds.add(accountId);
      }
    }
    
    const allowedAccountIdsArray = Array.from(allowedAccountIds);
    const allAccountIdsArray = Array.from(allAccountIds);
    
    console.log('Analytics API: Total accounts (before filtering):', allAccountIdsArray.length);
    console.log('Analytics API: Allowed accounts (after filtering):', allowedAccountIdsArray.length);
    console.log('Analytics API: Skipped', walletUsersSkipped, 'wallet users with test emails or test account IDs');
    
    if (allowedAccountIdsArray.length === 0) {
      return NextResponse.json({ activeUsers: 0 });
    }
    
    // Helper function to chunk large arrays for database queries
    const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
      }
      return chunks;
    };
    
    // Step 3A: Get ALL rooms first (for comparison) - chunk if necessary
    let allRooms: Room[] = [];
    if (allAccountIdsArray.length > 1000) {
      console.log('Analytics API: Chunking large query for all accounts:', allAccountIdsArray.length, 'accounts');
      const accountChunks = chunkArray(allAccountIdsArray, 500);
      
      for (let i = 0; i < accountChunks.length; i++) {
        const chunk = accountChunks[i];
        console.log(`Analytics API: Querying chunk ${i + 1}/${accountChunks.length} (${chunk.length} accounts)`);
        
        const { data: chunkRooms } = await supabaseAdmin
          .from('rooms')
          .select('id, account_id')
          .in('account_id', chunk);
        
        if (chunkRooms) {
          allRooms.push(...chunkRooms);
        }
      }
    } else {
      const { data: roomsData } = await supabaseAdmin
        .from('rooms')
        .select('id, account_id')
        .in('account_id', allAccountIdsArray);
      
      allRooms = roomsData || [];
    }
    
    // Step 3B: Get rooms for allowed accounts and exclude test artist rooms
    const { data: allowedRoomsRaw } = await supabaseAdmin
      .from('rooms')
      .select('id, account_id, artist_id')
      .in('account_id', allowedAccountIdsArray);
    
    // Filter out rooms with test artists
    const allowedRooms = allowedRoomsRaw?.filter(room => 
      !testArtistAccountIds.has(room.artist_id)
    ) || [];
    
    console.log('Analytics API: Rooms after filtering test artists:', allowedRooms.length, 'of', allowedRoomsRaw?.length || 0);
    
    const allRoomIds = allRooms.map(room => room.id);
    const allowedRoomIds = allowedRooms.map(room => room.id);
    
    console.log('Analytics API: Total rooms (before filtering):', allRoomIds.length);
    console.log('Analytics API: Allowed rooms (after filtering):', allowedRoomIds.length);
    
    // Step 4A: Query active conversations for ALL accounts (unfiltered count)
    const { data: allActiveRooms } = await supabaseAdmin
      .from('memories')
      .select('room_id')
      .gte('updated_at', start)
      .lte('updated_at', end)
      .in('room_id', allRoomIds);
    
    // Step 4B: Query active conversations for ALLOWED accounts (filtered count)
    const { data: allowedActiveRooms } = await supabaseAdmin
      .from('memories')
      .select('room_id')
      .gte('updated_at', start)
      .lte('updated_at', end)
      .in('room_id', allowedRoomIds);
    
    // Calculate unfiltered active users count
    const allUniqueActiveRoomIds = Array.from(new Set(allActiveRooms?.map(m => m.room_id) || []));
    const allActiveRoomsWithAccounts = allRooms.filter(room => 
      allUniqueActiveRoomIds.includes(room.id)
    );
    const allUniqueActiveUsers = new Set(allActiveRoomsWithAccounts.map(room => room.account_id));
    const unfilteredActiveUsers = allUniqueActiveUsers.size;
    
    // Calculate filtered active users count  
    const allowedUniqueActiveRoomIds = Array.from(new Set(allowedActiveRooms?.map(m => m.room_id) || []));
    const allowedActiveRoomsWithAccounts = allowedRooms?.filter(room => 
      allowedUniqueActiveRoomIds.includes(room.id)
    ) || [];
    const allowedUniqueActiveUsers = new Set(allowedActiveRoomsWithAccounts.map(room => room.account_id));
    const filteredActiveUsers = allowedUniqueActiveUsers.size;
    
    console.log('Analytics API: *** COMPARISON ***');
    console.log('Analytics API: Active users (BEFORE filtering test accounts):', unfilteredActiveUsers);
    console.log('Analytics API: Active users (AFTER filtering test accounts):', filteredActiveUsers);
    console.log('Analytics API: Difference (should be 2 if both test accounts were active):', unfilteredActiveUsers - filteredActiveUsers);
    
    // Check if test wallet accounts were in the unfiltered active users
    const unfilteredActiveAccountIds = Array.from(allUniqueActiveUsers);
    const testAccount1Active = unfilteredActiveAccountIds.some(id => id.startsWith('3cdea198'));
    const testAccount2Active = unfilteredActiveAccountIds.some(id => id.startsWith('5ada04cd'));
    
    console.log('Analytics API: Test account 3cdea198 was active (before filtering):', testAccount1Active);
    console.log('Analytics API: Test account 5ada04cd was active (before filtering):', testAccount2Active);
    
    if (!allowedActiveRooms || allowedActiveRooms.length === 0) {
      console.log('Analytics API: No active rooms found in date range');
      return NextResponse.json({ activeUsers: 0 });
    }
    
    console.log('Analytics API: Found', allowedUniqueActiveRoomIds.length, 'unique active rooms');
    console.log('Analytics API: Final active user account IDs (first 8 chars):', Array.from(allowedUniqueActiveUsers).map(id => id.substring(0, 8)));
    
    return NextResponse.json({ activeUsers: filteredActiveUsers });
    
  } catch (error) {
    console.error('Analytics API: Error fetching active users:', error);
    return NextResponse.json({ error: 'Failed to fetch active users' }, { status: 500 });
  }
} 