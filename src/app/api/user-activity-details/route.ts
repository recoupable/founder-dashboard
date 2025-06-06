import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface Memory {
  room_id: string;
  content: { role?: string; [key: string]: unknown };
  updated_at: string;
}

// Helper function to extract role from content structure
function extractRoleFromContent(content: { role?: string; [key: string]: unknown }): string {
  if (typeof content === 'object' && content?.role) {
    return content.role;
  }
  // Default to user if role cannot be determined
  return 'user';
}

interface Room {
  id: string;
  artist_id: string;
  topic: string | null;
  updated_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('email');
    
    if (!userEmail) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }

    console.log(`Fetching activity details for user: ${userEmail}`);

    // Get the account ID for this email
    const { data: emailData, error: emailError } = await supabaseAdmin
      .from('account_emails')
      .select('account_id')
      .eq('email', userEmail)
      .single();

    if (emailError) {
      console.error('Error fetching account for email:', emailError);
      return NextResponse.json({ 
        error: 'User not found', 
        details: emailError.message 
      }, { status: 404 });
    }

    if (!emailData) {
      console.log('No account data found for email:', userEmail);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const accountId = emailData.account_id;
    console.log(`Found account ID: ${accountId}`);

    // Get all rooms for this user
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, artist_id, topic, updated_at')
      .eq('account_id', accountId)
      .order('updated_at', { ascending: true });

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError);
      return NextResponse.json({ 
        error: 'Failed to fetch user rooms', 
        details: roomsError.message,
        accountId: accountId
      }, { status: 500 });
    }

    if (!rooms || rooms.length === 0) {
      return NextResponse.json({
        newArtistsCreated: 0,
        artistUsage: [],
        totalRooms: 0
      });
    }

    console.log(`Found ${rooms.length} rooms for user`);

    // Get all memories for these rooms
    const roomIds = rooms.map((room: Room) => room.id);
    const { data: memories, error: memoriesError } = await supabaseAdmin
      .from('memories')
      .select('room_id, content, updated_at')
      .in('room_id', roomIds)
      .order('updated_at', { ascending: true });

    if (memoriesError) {
      console.error('Error fetching memories:', memoriesError);
      return NextResponse.json({ 
        error: 'Failed to fetch memories', 
        details: memoriesError.message,
        roomIds: roomIds.slice(0, 3) // Show first 3 room IDs for debugging
      }, { status: 500 });
    }

    console.log(`Found ${memories?.length || 0} memories`);

    // Get artist names
    const artistIds = [...new Set(rooms.map(room => room.artist_id))].filter(Boolean);
    console.log(`Fetching artist names for ${artistIds.length} artists:`, artistIds);
    
    const { data: artists, error: artistsError } = await supabaseAdmin
      .from('accounts')
      .select('id, name')
      .in('id', artistIds);

    if (artistsError) {
      console.error('Error fetching artists:', artistsError);
    }

    console.log(`Found ${artists?.length || 0} artist names:`, artists);

    const artistNamesMap = new Map();
    if (artists) {
      for (const artist of artists) {
        artistNamesMap.set(artist.id, artist.name);
        console.log(`Mapped artist: ${artist.id} -> ${artist.name}`);
      }
    }

    // 1. Count new artists created
    let newArtistsCreated = 0;
    const roomMemoriesMap = new Map();

    // Group memories by room
    if (memories) {
      for (const memory of memories as Memory[]) {
        if (!roomMemoriesMap.has(memory.room_id)) {
          roomMemoriesMap.set(memory.room_id, []);
        }
        roomMemoriesMap.get(memory.room_id).push(memory);
      }
    }

    // Check first user message in each room
    for (const room of rooms) {
      const roomMemories = roomMemoriesMap.get(room.id) || [];
      const firstUserMessage = roomMemories.find((memory: Memory) => 
        extractRoleFromContent(memory.content) === 'user'
      );
      
      if (firstUserMessage && 
          JSON.stringify(firstUserMessage.content).toLowerCase().includes('create a new artist')) {
        newArtistsCreated++;
      }
    }

    console.log(`Found ${newArtistsCreated} new artists created`);

    // 2. Calculate artist usage statistics
    const artistUsageMap = new Map();

    // Initialize artist usage
    for (const artistId of artistIds) {
      artistUsageMap.set(artistId, {
        artistId,
        artistName: artistNamesMap.get(artistId) || (artistId ? artistId.substring(0, 8) : 'Unknown'),
        rooms: 0,
        messages: 0,
        reports: 0,
        topics: []
      });
    }

    // Count rooms per artist and collect topics
    for (const room of rooms) {
      const usage = artistUsageMap.get(room.artist_id);
      if (usage) {
        usage.rooms++;
        if (room.topic) {
          usage.topics.push(room.topic);
        }
      }
    }

    // Count messages and reports per artist
    if (memories) {
      for (const memory of memories as Memory[]) {
        const room = rooms.find(r => r.id === memory.room_id);
        if (room) {
          const usage = artistUsageMap.get(room.artist_id);
          if (usage) {
            const role = extractRoleFromContent(memory.content);
            if (role === 'user') {
              usage.messages++;
            } else if (role === 'report') {
              usage.reports++;
            }
          }
        }
      }
    }

    // Convert to array and sort by total activity (messages + reports + rooms)
    const artistUsage = Array.from(artistUsageMap.values())
      .map(usage => ({
        ...usage,
        totalActivity: usage.messages + usage.reports + usage.rooms
      }))
      .sort((a, b) => b.totalActivity - a.totalActivity);

    console.log(`Artist usage calculated for ${artistUsage.length} artists`);

    return NextResponse.json({
      newArtistsCreated,
      artistUsage,
      totalRooms: rooms.length,
      totalMemories: memories?.length || 0
    });

  } catch (error) {
    console.error('Error in user-activity-details API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 