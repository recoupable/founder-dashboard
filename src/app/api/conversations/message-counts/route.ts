import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');

  // If start_date is not provided, use a very early date for "All Time"
  const now = new Date();
  const allTimeStartDate = '1970-01-01T00:00:00.000Z'; 
  const defaultCurrentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // If a start_date is explicitly passed, use it.
  // Otherwise, if it was intentionally omitted by the client (for All Time), use allTimeStartDate.
  const start = start_date ? start_date : (request.url.includes('start_date=') ? defaultCurrentMonthStart : allTimeStartDate);
  const end = end_date || now.toISOString();

  try {
    // Get message counts for each room owner in the time period
    const { data: messageData, error: messageError } = await supabaseAdmin
      .from('memories')
      .select('room_id')
      .gte('updated_at', start)
      .lte('updated_at', end);

    if (messageError) {
      console.error('Error fetching messages:', messageError);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Get room owners for all the rooms that had messages
    const roomIds = Array.from(new Set(messageData.map(m => m.room_id)));
    
    if (roomIds.length === 0) {
      return NextResponse.json([]);
    }

    // Process in chunks to avoid URL length limits
    const chunkSize = 100;
    const messageCounts: Record<string, number> = {};
    
    for (let i = 0; i < roomIds.length; i += chunkSize) {
      const roomIdChunk = roomIds.slice(i, i + chunkSize);
      
      // Get room owners for this chunk
      const { data: roomData, error: roomError } = await supabaseAdmin
        .from('rooms')
        .select('id, account_id')
        .in('id', roomIdChunk);

      if (roomError) {
        console.error('Error fetching rooms:', roomError);
        continue;
      }

      // Count messages per room and aggregate by account
      for (const room of roomData || []) {
        const roomMessageCount = messageData.filter(m => m.room_id === room.id).length;
        messageCounts[room.account_id] = (messageCounts[room.account_id] || 0) + roomMessageCount;
      }
    }

    // Get email addresses and wallets for all accounts
    const accountIds = Object.keys(messageCounts);
    
    if (accountIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get both emails and wallets
    const [emailsResponse, walletsResponse] = await Promise.all([
      supabaseAdmin
        .from('account_emails')
        .select('account_id, email')
        .in('account_id', accountIds),
      supabaseAdmin
        .from('account_wallets')
        .select('account_id, wallet')
        .in('account_id', accountIds)
    ]);

    if (emailsResponse.error) {
      console.error('Error fetching emails:', emailsResponse.error);
      return NextResponse.json({ error: 'Failed to fetch emails' }, { status: 500 });
    }

    const emailsData = emailsResponse.data || [];
    const walletsData = walletsResponse.data || [];

    // Build account to identifier map (prefer email, fallback to wallet)
    const accountToIdentifier = new Map<string, string>();
    emailsData.forEach((row: { account_id: string, email: string }) => {
      if (row.email) {
        accountToIdentifier.set(row.account_id, row.email);
      }
    });
    walletsData.forEach((row: { account_id: string, wallet: string }) => {
      if (row.wallet && !accountToIdentifier.has(row.account_id)) {
        accountToIdentifier.set(row.account_id, row.wallet);
      }
    });

    // Build final result
    const result = [];
    for (const [accountId, messageCount] of Object.entries(messageCounts)) {
      const identifier = accountToIdentifier.get(accountId);
      if (identifier) {
        result.push({
          account_email: identifier,
          message_count: messageCount
        });
      }
    }

    console.log(`[MESSAGE-COUNTS] Found ${result.length} users with messages between ${start} and ${end}`);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in message-counts API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 