import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') || 'Last 7 Days';
    const excludeTest = searchParams.get('excludeTest') === 'true';
    
    const now = new Date();
    
    // OLD METHOD (timezone-dependent) - like the original chart API
    const oldDateRange = (() => {
      if (timeFilter === 'Last 7 Days') {
        const start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      return { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now };
    })();
    
    // NEW METHOD (UTC-consistent) - like our fixed API
    const newDateRange = (() => {
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { start: last7Days, end: new Date(now.getTime()) };
    })();
    
    // Helper function to get active users for a specific date range
    const getActiveUsersForRange = async (start: Date, end: Date, label: string) => {
      console.log(`[${label}] Date range:`, {
        start: start.toISOString(),
        end: end.toISOString(),
        startLocal: start.toLocaleString(),
        endLocal: end.toLocaleString()
      });
      
      // Get messages in date range
      const { data: messageData } = await supabaseAdmin
        .from('memories')
        .select('room_id')
        .gte('updated_at', start.toISOString())
        .lte('updated_at', end.toISOString());
      
      console.log(`[${label}] Found ${messageData?.length || 0} messages`);
      
      if (!messageData || messageData.length === 0) {
        return { userCount: 0, details: { messages: 0, rooms: 0 } };
      }
      
      // Get unique room IDs
      const uniqueRoomIds = Array.from(new Set(messageData.map(m => m.room_id)));
      
      // Get room owners
      const { data: roomsData } = await supabaseAdmin
        .from('rooms')
        .select('account_id')
        .in('id', uniqueRoomIds);
      
      const uniqueUserIds = new Set(roomsData?.map(r => r.account_id) || []);
      
      console.log(`[${label}] Found ${uniqueUserIds.size} unique users from ${uniqueRoomIds.length} rooms`);
      
      return {
        userCount: uniqueUserIds.size,
        details: {
          messages: messageData.length,
          rooms: uniqueRoomIds.length,
          users: uniqueUserIds.size
        }
      };
    };
    
    // Test both methods
    const [oldResult, newResult] = await Promise.all([
      getActiveUsersForRange(oldDateRange.start, oldDateRange.end, 'OLD_METHOD'),
      getActiveUsersForRange(newDateRange.start, newDateRange.end, 'NEW_METHOD')
    ]);
    
    const result = {
      timezoneInfo: {
        serverTime: now.toString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        utcTime: now.toISOString()
      },
      timeFilter,
      excludeTest,
      comparison: {
        oldMethod: {
          dateRange: {
            start: oldDateRange.start.toISOString(),
            end: oldDateRange.end.toISOString(),
            startLocal: oldDateRange.start.toLocaleString(),
            endLocal: oldDateRange.end.toLocaleString()
          },
          result: oldResult
        },
        newMethod: {
          dateRange: {
            start: newDateRange.start.toISOString(),
            end: newDateRange.end.toISOString(),
            startLocal: newDateRange.start.toLocaleString(),
            endLocal: newDateRange.end.toLocaleString()
          },
          result: newResult
        },
        difference: {
          userCountDiff: Math.abs(oldResult.userCount - newResult.userCount),
          percentageDiff: oldResult.userCount > 0 
            ? Math.round(((newResult.userCount - oldResult.userCount) / oldResult.userCount) * 100)
            : 0
        }
      }
    };
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Active Users Comparison API: Error:', error);
    return NextResponse.json({ error: 'Failed to compare active users methods' }, { status: 500 });
  }
} 