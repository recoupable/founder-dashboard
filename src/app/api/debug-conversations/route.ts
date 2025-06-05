import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 CONVERSATION DEBUG: Starting diagnostic...');

    // Get total room count first
    const { count: totalRooms, error: countError } = await supabaseAdmin
      .from('rooms')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting room count:', countError);
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    console.log(`🔍 Total rooms in database: ${totalRooms}`);

    // Get specific room IDs that we know exist from the conversations API
    const knownRoomIds = [
      'e66a1413-c044-4feb-86ec-4eec718262ab', // "AI Bench & BILLBOARD"
      'b68c2083-6e11-41ec-a0d3-30c9b28fd6f0', // "Segment: Artist Fans"  
      'b1fed3f0-51d0-41e3-9cac-af66c445fc5f'  // "Artist Creation"
    ];

    const { data: roomsData, error: roomsError } = await supabaseAdmin
      .from('rooms')
      .select('id, account_id, artist_id, updated_at, topic')
      .in('id', knownRoomIds);

    if (roomsError) {
      console.error('❌ Error fetching rooms:', roomsError);
      return NextResponse.json({ error: roomsError.message }, { status: 500 });
    }

    console.log(`🔍 Found ${roomsData?.length || 0} recent rooms out of ${totalRooms} total`);

    // Check each room for messages
    const results = [];
    for (const room of roomsData || []) {
      console.log(`🔍 Checking room: ${room.id} - "${room.topic}"`);
      
      // Count all messages for this room
      const { data: memoriesData, error: memoriesError } = await supabaseAdmin
        .from('memories')
        .select('role, content, updated_at')
        .eq('room_id', room.id);

      if (memoriesError) {
        console.error(`❌ Error fetching memories for room ${room.id}:`, memoriesError);
        continue;
      }

      const messageCount = memoriesData?.length || 0;
      const roleBreakdown = memoriesData?.reduce((acc, memory) => {
        acc[memory.role] = (acc[memory.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      console.log(`🔍 Room ${room.id}: ${messageCount} messages, roles:`, roleBreakdown);

      results.push({
        roomId: room.id,
        title: room.topic,
        accountId: room.account_id,
        artistId: room.artist_id,
        roomUpdatedAt: room.updated_at,
        messageCount,
        roleBreakdown,
        sampleMessages: memoriesData?.slice(0, 2).map(m => ({
          role: m.role,
          content: m.content?.substring(0, 100) + '...',
          updatedAt: m.updated_at
        })) || []
      });
    }

    // Also check if there are any memories at all
    const { count: totalMemories } = await supabaseAdmin
      .from('memories')
      .select('*', { count: 'exact', head: true });

    console.log(`🔍 Total memories in database: ${totalMemories}`);

    // Check recent memories
    const { data: recentMemories } = await supabaseAdmin
      .from('memories')
      .select('room_id, role, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);

    console.log(`🔍 Recent memories:`, recentMemories?.map(m => ({
      roomId: m.room_id,
      role: m.role,
      updatedAt: m.updated_at
    })));

    return NextResponse.json({
      summary: {
        totalRoomsInDB: totalRooms,
        totalMemoriesInDB: totalMemories,
        roomsChecked: results.length,
        roomsWithMessages: results.filter(r => r.messageCount > 0).length,
        roomsWithoutMessages: results.filter(r => r.messageCount === 0).length
      },
      roomDetails: results,
      recentMemories: recentMemories?.map(m => ({
        roomId: m.room_id,
        role: m.role,
        updatedAt: m.updated_at
      }))
    });

  } catch (error) {
    console.error('🔍 CONVERSATION DEBUG ERROR:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 