import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Get total memory count
    const { count: totalMemories } = await supabaseAdmin
      .from('memories')
      .select('*', { count: 'exact', head: true });

    // Get sample of room IDs from memories table
    const { data: sampleMemories } = await supabaseAdmin
      .from('memories')
      .select('room_id, role, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10);

    // Count unique room IDs in memories
    const uniqueRoomIds = new Set(sampleMemories?.map(m => m.room_id) || []);

    // Check specific room IDs from conversations API
    const testRoomIds = [
      'e66a1413-c044-4feb-86ec-4eec718262ab',
      'b68c2083-6e11-41ec-a0d3-30c9b28fd6f0', 
      'b1fed3f0-51d0-41e3-9cac-af66c445fc5f'
    ];

    const testResults = [];
    for (const roomId of testRoomIds) {
      const { count } = await supabaseAdmin
        .from('memories')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);
      
      testResults.push({ roomId: roomId.substring(0, 8), count: count || 0 });
    }

    return NextResponse.json({
      totalMemories,
      sampleMemories: sampleMemories?.map(m => ({
        roomId: m.room_id?.substring(0, 8),
        role: m.role,
        updatedAt: m.updated_at
      })),
      uniqueRoomIdsInSample: uniqueRoomIds.size,
      testRoomResults: testResults
    });
  } catch (error) {
    console.error('Check room messages error:', error);
    return NextResponse.json({ error: 'Failed to check room messages' }, { status: 500 });
  }
} 