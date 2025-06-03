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
    
    console.log('API ROUTE: Request parameters:', { 
      searchQuery, 
      excludeTestEmails, 
      timeFilter,
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
    
    // Get total count first
    const { count: totalRooms, error: countError } = await supabaseAdmin
      .from('rooms')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('API ROUTE: Error getting room count:', countError);
    }
    console.log(`API ROUTE: Total rooms in database: ${totalRooms}`);

    // Get conversations
    const { data: roomsData, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, account_id, artist_id, updated_at, topic', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(0, 9999);

    console.log(`API ROUTE: Fetched ${roomsData?.length || 0} rooms from database`);

    if (roomsError || !roomsData) {
      console.error('Error fetching rooms:', roomsError);
      return NextResponse.json([createFallbackConversation()]);
    }

    // Count messages for each room
    const roomIds = roomsData.map((room: { id: string }) => room.id);
    console.log(`Fetching message counts for ${roomIds.length} rooms`);
    
    // Get all memories
    const { data: memoriesData, error: memoriesError } = await supabaseAdmin
      .from('memories')
      .select('room_id')
      .in('room_id', roomIds);
      
    if (memoriesError) {
      console.error('Error fetching message counts:', memoriesError);
    }
    
    // Count messages per room
    const messageCountMap = new Map<string, number>();
    if (memoriesData && memoriesData.length > 0) {
      // Count occurrences of each room_id
      for (const memory of memoriesData as { room_id: string }[]) {
        const count = messageCountMap.get(memory.room_id) || 0;
        messageCountMap.set(memory.room_id, count + 1);
      }
      console.log(`Found message counts for ${messageCountMap.size} rooms`);
    } else {
      console.log('No messages found');
    }
    
    // Cast roomsData for type safety
    const typedRoomsData = roomsData as Array<{
      id: string;
      account_id: string;
      artist_id: string;
      updated_at: string;
      topic: string | null;
    }>;
    
    // Fetch account details in parallel
    const accountIds = typedRoomsData
      .map((room) => room.account_id)
      .filter((id, index, self) => self.indexOf(id) === index);
    
    const [accountsResponse, accountEmailsResponse, artistAccountsResponse] = await Promise.all([
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
      const email = accountEmailsMap.get(accountId) || `${accountName}@example.com`;
      const artistId = room.artist_id || 'Unknown Artist';
      const artistName = artistNamesMap.get(artistId) || artistId;
      
      return {
        room_id: room.id,
        created_at: room.updated_at,
        last_message_date: room.updated_at,
        account_email: email,
        account_name: accountName,
        artist_name: artistName,
        artist_reference: artistId !== 'Unknown Artist' ? `REF-${artistId.substring(0, 5)}` : 'REF-UNKNOWN',
        topic: room.topic || null,
        is_test_account: false,
        id: room.id,
        updatedAt: room.updated_at,
        messageCount: messageCountMap.get(room.id) || 0,
        email,
        artist_id: artistId
      };
    });

    // Filter by search query if provided
    if (searchQuery) {
      console.log('Filtering by search query:', searchQuery);
      const filteredResult = result.filter(
        (conversation) =>
          conversation.account_email?.toLowerCase?.().includes(searchQuery.toLowerCase()) ||
          conversation.artist_name?.toLowerCase?.().includes(searchQuery.toLowerCase()) ||
          conversation.topic?.toLowerCase?.().includes(searchQuery.toLowerCase())
      );
      console.log(`API ROUTE: Returning ${filteredResult.length} filtered conversations`);
      return NextResponse.json(filteredResult);
    }

    console.log(`API ROUTE: Returning ${result.length} total conversations`);
    return NextResponse.json(result);
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