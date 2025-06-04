import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  console.log('API ROUTE: Starting conversations fetch');
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search') || '';
    const excludeTestEmails = searchParams.get('excludeTest') === 'true';
    const timeFilter = searchParams.get('timeFilter') || 'Last 30 Days';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const userFilter = searchParams.get('userFilter') || '';
    
    console.log('API ROUTE: Request parameters:', { 
      searchQuery, 
      excludeTestEmails, 
      timeFilter,
      page,
      limit,
      userFilter,
      url: request.url
    });
    
    // For debugging - check Supabase connection
    console.log('API ROUTE: Checking Supabase connection');
    try {
      const { error: testError } = await supabaseAdmin.from('rooms').select('count', { count: 'exact', head: true });
      if (testError) {
        console.error('API ROUTE: Supabase connection test failed:', testError);
      } else {
        console.log('API ROUTE: Supabase connection test successful');
      }
    } catch (testErr) {
      console.error('API ROUTE: Supabase connection test exception:', testErr);
    }
    
    // Apply time filter - remove unused variable
    // const now = new Date();
    
    // Get total count first for pagination
    const { count: totalRooms, error: countError } = await supabaseAdmin
      .from('rooms')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('API ROUTE: Error getting room count:', countError);
    }
    console.log(`API ROUTE: Total rooms in database: ${totalRooms}`);

    // Get total unique users across all conversations
    let totalUniqueUsers = 0;
    let filteredTotalRooms = totalRooms || 0;
    let filteredTotalUniqueUsers = 0;
    
    try {
      // Get users from both account_emails AND account_wallets to include miniapp users
      const [emailUsersResponse, walletUsersResponse] = await Promise.all([
        supabaseAdmin
          .from('account_emails')
          .select('account_id, email')
          .limit(10000),
        supabaseAdmin
          .from('account_wallets')
          .select('account_id, wallet')
          .limit(10000)
      ]);
      
      if (emailUsersResponse.error) {
        console.error('API ROUTE: Error getting account emails:', emailUsersResponse.error);
      }
      if (walletUsersResponse.error) {
        console.error('API ROUTE: Error getting account wallets:', walletUsersResponse.error);
      }
      
      const allAccountEmailsData = emailUsersResponse.data || [];
      const allWalletUsersData = walletUsersResponse.data || [];
      
      // Calculate total unique users from BOTH email and wallet users (exclude accounts with neither)
      const emailAccountIds = new Set(allAccountEmailsData.map(r => r.account_id));
      const walletAccountIds = new Set(allWalletUsersData.map(r => r.account_id));
      const allAccountIds = new Set([...emailAccountIds, ...walletAccountIds]);
      totalUniqueUsers = allAccountIds.size;
      
      console.log(`API ROUTE: Total unique users (emails + wallets): ${totalUniqueUsers} (${allAccountEmailsData.length} email users + ${allWalletUsersData.length} wallet users, excluding no-contact accounts)`);
      
      if (allAccountEmailsData) {
        // If excluding test emails, we need to filter the totals
        if (excludeTestEmails) {
          // Get test emails list
          const { data: testEmailsData } = await supabaseAdmin
            .from('test_emails')
            .select('email');
          
          const testEmailsList = testEmailsData?.map(item => item.email) || [];
          console.log(`API ROUTE: Test emails to exclude: ${testEmailsList.length}`);
          
          // Filter out test accounts from both email and wallet users
          const nonTestAccountIds = new Set();
          
          // Add non-test email users
          for (const accountEmail of allAccountEmailsData) {
            const email = accountEmail.email;
            if (!email) continue;
            if (testEmailsList.includes(email)) continue;
            if (email.includes('@example.com')) continue;
            if (email.includes('+')) continue;
            nonTestAccountIds.add(accountEmail.account_id);
          }
          
          // List of test wallet account IDs to exclude
          const testWalletAccountIds = ['3cdea198', '5ada04cd', '44b0c8fd', 'c9e86577', '496a071a', 'a3b8a5ba', '2fbe2485'];
          
          // Add wallet users, but ALSO filter out test wallet users
          for (const walletUser of allWalletUsersData) {
            // Check if this is a test wallet user (by account ID pattern)
            const isTestWallet = testWalletAccountIds.some(testId => walletUser.account_id.startsWith(testId));
            if (isTestWallet) {
              console.log('API ROUTE: *** SKIPPING test wallet user in conversations:', walletUser.account_id.substring(0, 8));
              continue;
            }
            
            // Wallet users are considered real users unless their account_id is in some test list
            nonTestAccountIds.add(walletUser.account_id);
          }
          
          // Count filtered users and rooms
          const nonTestAccountIdsArray = Array.from(nonTestAccountIds);
          filteredTotalUniqueUsers = nonTestAccountIdsArray.length;
          
          console.log(`API ROUTE: After filtering test emails - Email users: ${allAccountEmailsData.filter(e => e.email && !testEmailsList.includes(e.email) && !e.email.includes('@example.com') && !e.email.includes('+')).length}, Wallet users: ${allWalletUsersData.length}, Total: ${filteredTotalUniqueUsers}`);
          
          if (nonTestAccountIdsArray.length > 0) {
            // Keep all rooms, just filter user count
            filteredTotalRooms = totalRooms || 0;
          } else {
            filteredTotalRooms = totalRooms || 0;
          }
          
          console.log(`API ROUTE: After filtering test emails - Rooms: ${filteredTotalRooms}, Users: ${filteredTotalUniqueUsers}`);
        } else {
          // Not excluding test emails, but still exclude no-contact accounts from USER count
          // Keep all rooms in the room count
          filteredTotalRooms = totalRooms || 0;
          filteredTotalUniqueUsers = totalUniqueUsers;
        }
      }
    } catch (error) {
      console.error('API ROUTE: Exception getting unique users:', error);
    }

    // Calculate pagination using filtered totals
    const offset = (page - 1) * limit;
    console.log(`API ROUTE: Fetching page ${page}, limit ${limit}, offset ${offset}`);

    // Handle user filtering - find account ID for the filtered email
    let userFilteredAccountIds: Set<string> | null = null;
    if (userFilter) {
      console.log(`API ROUTE: Filtering by user: ${userFilter}`);
      
      // Check if this is a wallet user filter (contains "wallet")
      if (userFilter.includes('(wallet)')) {
        // Extract wallet address from display format like "1a2b3c4d...ef56 (wallet)"
        const walletMatch = userFilter.match(/^([a-fA-F0-9]{8})\.\.\.([a-fA-F0-9]{4})\s*\(wallet\)$/);
        if (walletMatch) {
          const walletStart = walletMatch[1];
          const walletEnd = walletMatch[2];
          
          // Find wallet users that match this pattern
          const { data: walletUsers } = await supabaseAdmin
            .from('account_wallets')
            .select('account_id, wallet');
          
          const matchingAccountIds = new Set<string>();
          if (walletUsers) {
            for (const walletUser of walletUsers) {
              if (walletUser.wallet?.startsWith(walletStart) && walletUser.wallet?.endsWith(walletEnd)) {
                matchingAccountIds.add(walletUser.account_id);
              }
            }
          }
          userFilteredAccountIds = matchingAccountIds;
          console.log(`API ROUTE: Found ${matchingAccountIds.size} accounts for wallet filter ${userFilter}`);
        }
      } else {
        // Regular email filtering
        const { data: emailUsers } = await supabaseAdmin
          .from('account_emails')
          .select('account_id, email')
          .eq('email', userFilter);
        
        if (emailUsers && emailUsers.length > 0) {
          userFilteredAccountIds = new Set(emailUsers.map(user => user.account_id));
          console.log(`API ROUTE: Found ${userFilteredAccountIds.size} accounts for email filter ${userFilter}`);
        } else {
          console.log(`API ROUTE: No accounts found for email filter ${userFilter}`);
          userFilteredAccountIds = new Set(); // Empty set will result in no rooms
        }
      }
    }

    // Type for room objects
    type Room = {
      id: string;
      account_id: string;
      artist_id: string;
      updated_at: string;
      topic: string | null;
    };

    // Fetch rooms - filter by account IDs if excluding test emails
    let roomsData: Room[] | null;
    let roomsError;
    
    if (excludeTestEmails || userFilteredAccountIds) {
      console.log('API ROUTE: Fetching rooms with filtering (test emails and/or user filter)');
      
      let allowedAccountIds = new Set<string>();
      
      if (excludeTestEmails) {
        // Get test emails list
        const { data: testEmailsData } = await supabaseAdmin
          .from('test_emails')
          .select('email');
        const testEmailsList = testEmailsData?.map(item => item.email) || [];
        
        // Get all account data for filtering
        const [emailAccountsResponse, walletAccountsResponse] = await Promise.all([
          supabaseAdmin.from('account_emails').select('account_id, email'),
          supabaseAdmin.from('account_wallets').select('account_id, wallet')
        ]);
        
        // Add non-test email users
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
        
        // Add wallet users, but ALSO filter out test wallet users
        if (walletAccountsResponse.data) {
          for (const account of walletAccountsResponse.data) {
            // Check if this is a test wallet user (by account ID pattern)
            const isTestWallet = testWalletAccountIds.some(testId => account.account_id.startsWith(testId));
            if (isTestWallet) {
              console.log('API ROUTE: *** EXCLUDING test wallet user from room fetching:', account.account_id.substring(0, 8));
              continue;
            }
            allowedAccountIds.add(account.account_id);
          }
        }
      } else {
        // If not excluding test emails but we have user filter, start with all accounts
        const [emailAccountsResponse, walletAccountsResponse] = await Promise.all([
          supabaseAdmin.from('account_emails').select('account_id, email'),
          supabaseAdmin.from('account_wallets').select('account_id, wallet')
        ]);
        
        if (emailAccountsResponse.data) {
          for (const account of emailAccountsResponse.data) {
            allowedAccountIds.add(account.account_id);
          }
        }
        
        if (walletAccountsResponse.data) {
          for (const account of walletAccountsResponse.data) {
            allowedAccountIds.add(account.account_id);
          }
        }
      }
      
      // Apply user filter if provided
      if (userFilteredAccountIds) {
        // Intersect allowedAccountIds with userFilteredAccountIds
        const intersection = new Set<string>();
        for (const accountId of userFilteredAccountIds) {
          if (allowedAccountIds.has(accountId)) {
            intersection.add(accountId);
          }
        }
        allowedAccountIds = intersection;
        console.log(`API ROUTE: After applying user filter, ${allowedAccountIds.size} accounts remain`);
      }
      
      // Get accounts with test artist names and exclude them (only if excludeTestEmails is true)
      let testArtistAccountIds = new Set<string>();
      if (excludeTestEmails) {
        const { data: testArtistAccounts } = await supabaseAdmin
          .from('accounts')
          .select('id')
          .eq('name', 'sweetman_eth');
        
        testArtistAccountIds = new Set(testArtistAccounts?.map(account => account.id) || []);
        console.log(`API ROUTE: Found ${testArtistAccountIds.size} accounts with test artist name "sweetman_eth"`);
      }
      
      const allowedAccountIdsArray = Array.from(allowedAccountIds);
      console.log(`API ROUTE: Fetching rooms for ${allowedAccountIdsArray.length} allowed accounts`);
      
      if (allowedAccountIdsArray.length > 0) {
        // Fetch rooms only for allowed accounts
        const { data, error } = await supabaseAdmin
          .from('rooms')
          .select('id, account_id, artist_id, updated_at, topic')
          .in('account_id', allowedAccountIdsArray)
          .order('updated_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        // Filter out test artist rooms after fetching (only if excludeTestEmails is true)
        if (excludeTestEmails) {
          roomsData = data?.filter(room => !testArtistAccountIds.has(room.artist_id)) || [];
          console.log(`API ROUTE: Filtered out ${(data?.length || 0) - roomsData.length} rooms with test artists`);
        } else {
          roomsData = data || [];
        }
        roomsError = error;
      } else {
        roomsData = [];
        roomsError = null;
      }
    } else {
      console.log('API ROUTE: Fetching all rooms (no filtering)');
      
      // Fetch all rooms without filtering
      const { data, error } = await supabaseAdmin
        .from('rooms')
        .select('id, account_id, artist_id, updated_at, topic')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      roomsData = data;
      roomsError = error;
    }

    console.log(`API ROUTE: Fetched ${roomsData?.length || 0} rooms for page ${page}`);

    if (roomsError || !roomsData) {
      console.error('Error fetching rooms:', roomsError);
      return NextResponse.json({ 
        conversations: [createFallbackConversation()],
        totalCount: filteredTotalRooms,
        totalUniqueUsers: filteredTotalUniqueUsers,
        currentPage: page,
        totalPages: Math.ceil(filteredTotalRooms / limit),
        hasMore: false
      });
    }

    // Count messages for each room - with smaller dataset, we can use larger batches
    const roomIds = roomsData.map((room: { id: string }) => room.id);
    console.log(`Fetching message counts for ${roomIds.length} rooms`);
    
    // Batch the message count queries - larger batch size since we have fewer rooms
    const messageCountMap = new Map<string, number>();
    const batchSize = 100; // Larger batch since we only have ~100 rooms per page
    
    for (let i = 0; i < roomIds.length; i += batchSize) {
      const batch = roomIds.slice(i, i + batchSize);
      console.log(`API ROUTE: Fetching message counts for batch ${Math.floor(i/batchSize) + 1}, rooms ${i} to ${Math.min(i + batchSize - 1, roomIds.length - 1)}`);
      
      try {
        const { data: memoriesData, error: memoriesError } = await supabaseAdmin
          .from('memories')
          .select('room_id')
          .in('room_id', batch)
          .eq('role', 'user');  // Only count user messages
          
        if (memoriesError) {
          console.error(`Error fetching message counts for batch ${Math.floor(i/batchSize) + 1}:`, memoriesError);
          continue; // Continue with next batch
        }
        
        if (memoriesData && memoriesData.length > 0) {
          // Count occurrences of each room_id in this batch
          for (const memory of memoriesData as { room_id: string }[]) {
            const count = messageCountMap.get(memory.room_id) || 0;
            messageCountMap.set(memory.room_id, count + 1);
          }
        }
      } catch (error) {
        console.error(`Exception fetching message counts for batch ${Math.floor(i/batchSize) + 1}:`, error);
      }
    }
    
    console.log(`Found message counts for ${messageCountMap.size} rooms`);
    
    // Cast roomsData for type safety
    const typedRoomsData = roomsData as Array<{
      id: string;
      account_id: string;
      artist_id: string;
      updated_at: string;
      topic: string | null;
    }>;
    
    // Fetch account details in parallel (including wallet data for miniapp users)
    const accountIds = typedRoomsData
      .map((room) => room.account_id)
      .filter((id, index, self) => self.indexOf(id) === index);
    
    const [accountsResponse, accountEmailsResponse, accountWalletsResponse, artistAccountsResponse] = await Promise.all([
      // Get account names
      supabaseAdmin
        .from('accounts')
        .select('id, name')
        .in('id', accountIds),
      
      // Get account emails
      supabaseAdmin
        .from('account_emails')
        .select('account_id, email')
        .in('account_id', accountIds),
        
      // Get account wallets for miniapp users
      supabaseAdmin
        .from('account_wallets')
        .select('account_id, wallet')
        .in('account_id', accountIds),
        
      // Get artist names using artist_ids directly from rooms
      supabaseAdmin
        .from('accounts')
        .select('id, name')
        .in('id', typedRoomsData.map(room => room.artist_id).filter(Boolean))
    ]);

    // Create maps for quick lookups
    const accountNamesMap = new Map();
    if (accountsResponse.data) {
      for (const account of accountsResponse.data) {
        accountNamesMap.set(account.id, account.name);
      }
    }

    const accountEmailsMap = new Map();
    if (accountEmailsResponse.data) {
      for (const entry of accountEmailsResponse.data) {
        accountEmailsMap.set(entry.account_id, entry.email);
      }
    }
    
    // Create wallet map for miniapp users
    const accountWalletsMap = new Map();
    if (accountWalletsResponse.data) {
      for (const entry of accountWalletsResponse.data) {
        accountWalletsMap.set(entry.account_id, entry.wallet);
      }
    }
    
    // Create artist names map
    const artistNamesMap = new Map();
    if (artistAccountsResponse.data) {
      for (const artist of artistAccountsResponse.data) {
        artistNamesMap.set(artist.id, artist.name);
      }
    }

    // Transform the data
    const result = typedRoomsData.map((room) => {
      const accountId = room.account_id;
      const accountName = accountNamesMap.get(accountId) || accountId.substring(0, 8);
      
      // Check if user has email or wallet (all users now have at least one)
      const email = accountEmailsMap.get(accountId);
      const wallet = accountWalletsMap.get(accountId);
      
      let displayEmail;
      let isWalletUser = false;
      
      if (email) {
        // Regular email user
        displayEmail = email;
      } else if (wallet) {
        // Wallet user - show truncated wallet as "email"
        displayEmail = `${wallet.substring(0, 8)}...${wallet.slice(-4)} (wallet)`;
        isWalletUser = true;
      } else {
        // Account with neither email nor wallet (artist/project record)
        displayEmail = `${accountName} (no contact)`;
      }
      
      const artistId = room.artist_id || 'Unknown Artist';
      const artistName = artistNamesMap.get(artistId) || artistId;
      
      return {
        room_id: room.id,
        created_at: room.updated_at,
        last_message_date: room.updated_at,
        account_email: displayEmail,
        account_name: accountName,
        artist_name: artistName,
        artist_reference: artistId !== 'Unknown Artist' ? `REF-${artistId.substring(0, 5)}` : 'REF-UNKNOWN',
        topic: room.topic || null,
        is_test_account: false,
        id: room.id,
        updatedAt: room.updated_at,
        messageCount: messageCountMap.get(room.id) || 0,
        email: displayEmail,
        artist_id: artistId,
        is_wallet_user: isWalletUser
      };
    });

    // Calculate pagination metadata using filtered totals
    const totalPages = Math.ceil(filteredTotalRooms / limit);
    const hasMore = page < totalPages;

    // Calculate conversation counts by time period for percentage calculations
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfToday.getDate() - 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfPrevWeek = new Date(startOfWeek);
    startOfPrevWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const conversationCounts = {
      today: 0,
      yesterday: 0,
      thisWeek: 0,
      lastWeek: 0,
      thisMonth: 0,
      lastMonth: 0
    };
    
    // We need to query the full dataset for accurate counts, not just the current page
    try {
      let todayCount, yesterdayCount, thisWeekCount, lastWeekCount, thisMonthCount, lastMonthCount;
      
      if (excludeTestEmails) {
        console.log('API ROUTE: Calculating active conversation counts excluding test emails');
        
        // Get test emails list for filtering
        const { data: testEmailsData } = await supabaseAdmin
          .from('test_emails')
          .select('email');
        const testEmailsList = testEmailsData?.map(item => item.email) || [];
        
        // Get account IDs to include (email users minus test emails + all wallet users)
        const [emailAccountsResponse, walletAccountsResponse] = await Promise.all([
          supabaseAdmin
            .from('account_emails')
            .select('account_id, email'),
          supabaseAdmin
            .from('account_wallets') 
            .select('account_id, wallet')
        ]);
        
        const allowedAccountIds = new Set();
        
        // Add non-test email users
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
        
        // Add wallet users, but ALSO filter out test wallet users
        if (walletAccountsResponse.data) {
          for (const account of walletAccountsResponse.data) {
            // Check if this is a test wallet user (by account ID pattern)
            const isTestWallet = testWalletAccountIds.some(testId => account.account_id.startsWith(testId));
            if (isTestWallet) {
              console.log('API ROUTE: *** SKIPPING test wallet user in conversation counts:', account.account_id.substring(0, 8));
              continue;
            }
            
            allowedAccountIds.add(account.account_id);
          }
        }
        
        const allowedAccountIdsArray = Array.from(allowedAccountIds);
        console.log(`API ROUTE: Filtering active conversation counts to ${allowedAccountIdsArray.length} allowed accounts`);
        
        // Get rooms for allowed accounts first
        const { data: allowedRooms } = await supabaseAdmin
          .from('rooms')
          .select('id, artist_id')
          .in('account_id', allowedAccountIdsArray);
        
        // Also exclude rooms with test artist
        const { data: testArtistAccounts } = await supabaseAdmin
          .from('accounts')
          .select('id')
          .eq('name', 'sweetman_eth');
        
        const testArtistAccountIds = new Set(testArtistAccounts?.map(account => account.id) || []);
        
        // Filter out rooms with test artists
        const allowedRoomIds = allowedRooms?.filter(room => !testArtistAccountIds.has(room.artist_id))?.map(room => room.id) || [];
        console.log(`API ROUTE: Allowed rooms after filtering test artists: ${allowedRoomIds.length}`);
        
        if (allowedRoomIds.length > 0) {
          // Query active conversations (rooms with messages) filtered by allowed room IDs
          const [todayActive, yesterdayActive, thisWeekActive, lastWeekActive, thisMonthActive, lastMonthActive] = await Promise.all([
            // Today - active conversations
            supabaseAdmin
              .from('memories')
              .select('room_id')
              .gte('updated_at', startOfToday.toISOString())
              .in('room_id', allowedRoomIds),
            
            // Yesterday - active conversations
            supabaseAdmin
              .from('memories')
              .select('room_id')
              .gte('updated_at', startOfYesterday.toISOString())
              .lt('updated_at', startOfToday.toISOString())
              .in('room_id', allowedRoomIds),
            
            // This week - active conversations
            supabaseAdmin
              .from('memories')
              .select('room_id')
              .gte('updated_at', startOfWeek.toISOString())
              .in('room_id', allowedRoomIds),
            
            // Last week - active conversations
            supabaseAdmin
              .from('memories')
              .select('room_id')
              .gte('updated_at', startOfPrevWeek.toISOString())
              .lt('updated_at', startOfWeek.toISOString())
              .in('room_id', allowedRoomIds),
            
            // This month - active conversations
            supabaseAdmin
              .from('memories')
              .select('room_id')
              .gte('updated_at', startOfMonth.toISOString())
              .in('room_id', allowedRoomIds),
            
            // Last month - active conversations
            supabaseAdmin
              .from('memories')
              .select('room_id')
              .gte('updated_at', startOfPrevMonth.toISOString())
              .lt('updated_at', startOfMonth.toISOString())
              .in('room_id', allowedRoomIds)
          ]);
          
          // Count unique rooms for each period
          todayCount = { count: new Set(todayActive.data?.map(m => m.room_id) || []).size };
          yesterdayCount = { count: new Set(yesterdayActive.data?.map(m => m.room_id) || []).size };
          thisWeekCount = { count: new Set(thisWeekActive.data?.map(m => m.room_id) || []).size };
          lastWeekCount = { count: new Set(lastWeekActive.data?.map(m => m.room_id) || []).size };
          thisMonthCount = { count: new Set(thisMonthActive.data?.map(m => m.room_id) || []).size };
          lastMonthCount = { count: new Set(lastMonthActive.data?.map(m => m.room_id) || []).size };
        } else {
          // No allowed rooms, set all counts to 0
          todayCount = { count: 0 };
          yesterdayCount = { count: 0 };
          thisWeekCount = { count: 0 };
          lastWeekCount = { count: 0 };
          thisMonthCount = { count: 0 };
          lastMonthCount = { count: 0 };
        }
      } else {
        console.log('API ROUTE: Calculating active conversation counts including all users');
        
        // Original queries without filtering - count active conversations (rooms with messages)
        const [todayActive, yesterdayActive, thisWeekActive, lastWeekActive, thisMonthActive, lastMonthActive] = await Promise.all([
          // Today - active conversations
          supabaseAdmin
            .from('memories')
            .select('room_id')
            .gte('updated_at', startOfToday.toISOString()),
          
          // Yesterday - active conversations
          supabaseAdmin
            .from('memories')
            .select('room_id')
            .gte('updated_at', startOfYesterday.toISOString())
            .lt('updated_at', startOfToday.toISOString()),
          
          // This week - active conversations
          supabaseAdmin
            .from('memories')
            .select('room_id')
            .gte('updated_at', startOfWeek.toISOString()),
          
          // Last week - active conversations
          supabaseAdmin
            .from('memories')
            .select('room_id')
            .gte('updated_at', startOfPrevWeek.toISOString())
            .lt('updated_at', startOfWeek.toISOString()),
          
          // This month - active conversations
          supabaseAdmin
            .from('memories')
            .select('room_id')
            .gte('updated_at', startOfMonth.toISOString()),
          
          // Last month - active conversations
          supabaseAdmin
            .from('memories')
            .select('room_id')
            .gte('updated_at', startOfPrevMonth.toISOString())
            .lt('updated_at', startOfMonth.toISOString())
        ]);
        
        // Count unique rooms for each period
        todayCount = { count: new Set(todayActive.data?.map(m => m.room_id) || []).size };
        yesterdayCount = { count: new Set(yesterdayActive.data?.map(m => m.room_id) || []).size };
        thisWeekCount = { count: new Set(thisWeekActive.data?.map(m => m.room_id) || []).size };
        lastWeekCount = { count: new Set(lastWeekActive.data?.map(m => m.room_id) || []).size };
        thisMonthCount = { count: new Set(thisMonthActive.data?.map(m => m.room_id) || []).size };
        lastMonthCount = { count: new Set(lastMonthActive.data?.map(m => m.room_id) || []).size };
      }
      
      conversationCounts.today = todayCount.count || 0;
      conversationCounts.yesterday = yesterdayCount.count || 0;
      conversationCounts.thisWeek = thisWeekCount.count || 0;
      conversationCounts.lastWeek = lastWeekCount.count || 0;
      conversationCounts.thisMonth = thisMonthCount.count || 0;
      conversationCounts.lastMonth = lastMonthCount.count || 0;
      
      console.log(`API ROUTE: Active conversation counts${excludeTestEmails ? ' (excluding test emails)' : ' (including all users)'} - Today: ${conversationCounts.today}, Week: ${conversationCounts.thisWeek}, Month: ${conversationCounts.thisMonth}`);
    } catch (error) {
      console.error('API ROUTE: Error fetching conversation counts:', error);
    }

    // Filter by search query if provided
    if (searchQuery) {
      console.log('Filtering by search query:', searchQuery);
      const filteredResult = result.filter(
        (conversation) =>
          conversation.account_email?.toLowerCase?.().includes(searchQuery.toLowerCase()) ||
          conversation.artist_name?.toLowerCase?.().includes(searchQuery.toLowerCase()) ||
          conversation.topic?.toLowerCase?.().includes(searchQuery.toLowerCase())
      );
      console.log(`API ROUTE: Returning ${filteredResult.length} filtered conversations (page ${page}/${totalPages})`);
      return NextResponse.json({
        conversations: filteredResult,
        totalCount: filteredTotalRooms,
        totalUniqueUsers: filteredTotalUniqueUsers,
        currentPage: page,
        totalPages,
        hasMore,
        filtered: true,
        originalCount: result.length,
        conversationCounts
      });
    }

    console.log(`API ROUTE: Returning ${result.length} total conversations (page ${page}/${totalPages})`);
    
    return NextResponse.json({
      conversations: result,
      totalCount: filteredTotalRooms,
      totalUniqueUsers: filteredTotalUniqueUsers,
      currentPage: page,
      totalPages,
      hasMore,
      conversationCounts
    });
  } catch (error) {
    console.error('API ROUTE: Uncaught error processing request:', error);
    return NextResponse.json([createFallbackConversation()]);
  }
}

// Helper function to create a fallback conversation
function createFallbackConversation() {
  const id = `fallback-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();
  return {
    room_id: id,
    created_at: timestamp,
    last_message_date: timestamp,
    account_email: 'unknown@example.com',
    account_name: 'Unknown User',
    artist_name: 'Unknown Artist',
    artist_reference: 'REF-UNKNOWN',
    topic: null,
    is_test_account: false,
    id,
    updatedAt: timestamp,
    messageCount: 0,
    email: 'unknown@example.com',
    artist_id: 'unknown'
  };
}