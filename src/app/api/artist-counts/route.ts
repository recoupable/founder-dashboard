import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Query to get all account_id entries using supabaseAdmin for RLS bypass
    const { data: rawData, error } = await supabaseAdmin
      .from('account_artist_ids')
      .select('account_id');

    if (error) {
      console.error('❌ API: Error fetching artist counts:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!rawData || rawData.length === 0) {
      return NextResponse.json([]);
    }

    // Group by account_id and count
    const artistCounts: Record<string, number> = {};
    
    rawData.forEach((row) => {
      const accountId = row.account_id;
      artistCounts[accountId] = (artistCounts[accountId] || 0) + 1;
    });
    
    // Convert to array format for easier consumption
    const formattedData = Object.entries(artistCounts).map(([account_id, artist_count]) => ({
      account_id,
      artist_count
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('❌ API: Exception in artist-counts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch artist counts' }, 
      { status: 500 }
    );
  }
} 