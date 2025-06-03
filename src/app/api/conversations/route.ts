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
    
    console.log('API ROUTE: Request parameters:', { 
      searchQuery, 
      excludeTestEmails, 
      timeFilter,
      page,
      limit,
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
          
          // Add all wallet users (assuming wallet users are real users, not test accounts)
          for (const walletUser of allWalletUsersData) {
            // Wallet users are considered real users unless their account_id is in some test list
            // You can add additional wallet-specific filtering here if needed
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

    // Fetch only the requested page of rooms (keep all rooms, just exclude no-contact from user counts)
    const { data: roomsData, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, account_id, artist_id, updated_at, topic')
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

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
          .in('room_id', batch);
          
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
        originalCount: result.length
      });
    }

    console.log(`API ROUTE: Returning ${result.length} total conversations (page ${page}/${totalPages})`);
    return NextResponse.json({
      conversations: result,
      totalCount: filteredTotalRooms,
      totalUniqueUsers: filteredTotalUniqueUsers,
      currentPage: page,
      totalPages,
      hasMore
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