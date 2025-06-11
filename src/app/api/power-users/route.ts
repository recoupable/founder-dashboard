import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function getDateRangeForFilter(filter: string): { start: Date | null, end: Date } {
  const now = new Date();
  let start: Date | null = null;
  const end: Date = now;
  
  switch (filter) {
    case 'Last 24 Hours':
      start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'Last 7 Days':
      start = new Date(now);
      start.setDate(now.getDate() - 7);
      break;
    case 'Last 30 Days':
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      break;
    case 'Last 3 Months':
      start = new Date(now);
      start.setMonth(now.getMonth() - 3);
      break;
    case 'Last 12 Months':
      start = new Date(now);
      start.setFullYear(now.getFullYear() - 1);
      break;
    default:
      start = null;
  }
  
  return { start, end };
}

function getPowerUserCriteria(timeFilter: string): { minDaysActive: number, minTotalActions: number } {
  switch (timeFilter) {
    case 'Last 24 Hours':
      return { minDaysActive: 1, minTotalActions: 10 }; // 10+ messages in 24 hours
    case 'Last 7 Days':
      return { minDaysActive: 5, minTotalActions: 1 }; // Active 5 out of 7 days (71.4%)
    case 'Last 30 Days':
      return { minDaysActive: 20, minTotalActions: 1 }; // Active 20 out of 30 days (66.7%)
    case 'Last 3 Months':
      return { minDaysActive: 60, minTotalActions: 1 }; // Active 60 out of 90 days (66.7%)
    case 'Last 12 Months':
      return { minDaysActive: 240, minTotalActions: 1 }; // Active 240 out of 365 days (65.8%)
    default:
      return { minDaysActive: 20, minTotalActions: 1 }; // Default to 30-day criteria
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') || 'Last 7 Days';
    const excludeTest = searchParams.get('excludeTest') === 'true';

    console.log('Power Users API: Starting with filters:', { timeFilter, excludeTest });

    const { start, end } = getDateRangeForFilter(timeFilter);

    // Get test emails if excluding test accounts
    let testEmailsList: string[] = [];
    if (excludeTest) {
      const { data: testEmailsData } = await supabaseAdmin
        .from('test_emails')
        .select('email');
      testEmailsList = testEmailsData?.map(row => row.email) || [];
    }

    // Get power users for current period
    const getCurrentPeriodData = async () => {
      if (!start) return { powerUsers: 0 };
      
      const { minDaysActive, minTotalActions } = getPowerUserCriteria(timeFilter);
      
      // Get message counts by user
      const { data: messageData } = await supabaseAdmin.rpc('get_message_counts_by_user', { 
        start_date: start.toISOString(), 
        end_date: end.toISOString() 
      });
      
      if (!messageData) return { powerUsers: 0 };

      // Filter out test emails if needed
      const filteredMessageData = excludeTest 
        ? messageData.filter((row: { account_email: string }) => {
            const email = row.account_email;
            if (!email) return false;
            if (testEmailsList.includes(email)) return false;
            if (email.includes('@example.com')) return false;
            if (email.includes('+')) return false;
            return true;
          })
        : messageData;

      // Get segment reports for this period and count them by user
      const { data: reportData } = await supabaseAdmin
        .from('segment_reports')
        .select('account_email')
        .gte('updated_at', start.toISOString())
        .lte('updated_at', end.toISOString());
      
      // Count reports per user
      const reportCountByUser = new Map<string, number>();
      (reportData || [])
        .filter(report => {
          if (!excludeTest) return true;
          const email = report.account_email;
          if (!email) return false;
          if (testEmailsList.includes(email)) return false;
          if (email.includes('@example.com')) return false;
          if (email.includes('+')) return false;
          return true;
        })
        .forEach(report => {
          const email = report.account_email;
          if (email) {
            reportCountByUser.set(email, (reportCountByUser.get(email) || 0) + 1);
          }
        });

      // Get all unique user emails
      const allUserEmails = new Set<string>();
      filteredMessageData.forEach((row: { account_email: string }) => {
        allUserEmails.add(row.account_email);
      });
      reportCountByUser.forEach((_, email) => {
        allUserEmails.add(email);
      });

      // Calculate consistency (days active) for each user
      const userConsistency = new Map<string, number>();
      
      for (const email of allUserEmails) {
        try {
          // Get account_id for this email
          const { data: emailData } = await supabaseAdmin
            .from('account_emails')
            .select('account_id')
            .eq('email', email)
            .single();
          
          if (!emailData) continue;
          
          const accountId = emailData.account_id;
          const userDays = new Set<string>();

          // Get both messages and reports in parallel
          const [roomsData, reportRoomsData] = await Promise.all([
            // Get rooms for messages
            supabaseAdmin
              .from('rooms')
              .select('id')
              .eq('account_id', accountId),
            
            // Get segment report rooms
            supabaseAdmin
              .from('rooms')
              .select('updated_at, topic')
              .eq('account_id', accountId)
              .gte('updated_at', start.toISOString())
              .lte('updated_at', end.toISOString())
          ]);

          const roomIds = (roomsData.data || []).map(r => r.id);

          // Get messages for this user's rooms
          if (roomIds.length > 0) {
            const { data: msgRows } = await supabaseAdmin
              .from('memories')
              .select('updated_at')
              .in('room_id', roomIds)
              .gte('updated_at', start.toISOString())
              .lte('updated_at', end.toISOString());

            if (msgRows) {
              msgRows.forEach((row: { updated_at: string }) => {
                const day = row.updated_at.slice(0, 10);
                userDays.add(day);
              });
            }
          }

          // Process segment reports
          if (reportRoomsData.data) {
            reportRoomsData.data.forEach((row: { updated_at: string, topic: string }) => {
              // Only count rooms with topics starting with "segment:" (case insensitive)
              if (row.topic?.toLowerCase?.().startsWith('segment:')) {
                const day = row.updated_at.slice(0, 10);
                userDays.add(day);
              }
            });
          }

          userConsistency.set(email, userDays.size);
        } catch (error) {
          console.error('Error calculating consistency for user', email, ':', error);
          userConsistency.set(email, 0);
        }
      }

      // Combine users who sent messages or created reports with their total activity
      const userActivityMap = new Map<string, number>();
      
      // Add message counts
      filteredMessageData.forEach((row: { account_email: string, message_count: number }) => {
        userActivityMap.set(row.account_email, row.message_count);
      });

      // Add report counts to existing users or create new entries
      reportCountByUser.forEach((reportCount, email) => {
        const existingActivity = userActivityMap.get(email) || 0;
        userActivityMap.set(email, existingActivity + reportCount);
      });

      // Count power users (must meet BOTH criteria: consistency AND volume)
      let powerUsers = 0;
      userActivityMap.forEach((totalActions, email) => {
        const daysActive = userConsistency.get(email) || 0;
        if (daysActive >= minDaysActive && totalActions >= minTotalActions) {
          powerUsers++;
        }
      });

      return { powerUsers };
    };

    // Get previous period data for comparison
    const getPreviousPeriodData = async () => {
      if (!start) return { powerUsers: 0 };

      const { minDaysActive, minTotalActions } = getPowerUserCriteria(timeFilter);
      const periodDuration = end.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime());
      const prevStart = new Date(start.getTime() - periodDuration);

      const { data: messageData } = await supabaseAdmin.rpc('get_message_counts_by_user', { 
        start_date: prevStart.toISOString(), 
        end_date: prevEnd.toISOString() 
      });
      
      if (!messageData) return { powerUsers: 0 };

      const filteredMessageData = excludeTest 
        ? messageData.filter((row: { account_email: string }) => {
            const email = row.account_email;
            if (!email) return false;
            if (testEmailsList.includes(email)) return false;
            if (email.includes('@example.com')) return false;
            if (email.includes('+')) return false;
            return true;
          })
        : messageData;

      // Get segment reports for previous period and count them by user
      const { data: reportData } = await supabaseAdmin
        .from('segment_reports')
        .select('account_email')
        .gte('updated_at', prevStart.toISOString())
        .lte('updated_at', prevEnd.toISOString());

      // Count reports per user
      const reportCountByUser = new Map<string, number>();
      (reportData || [])
        .filter(report => {
          if (!excludeTest) return true;
          const email = report.account_email;
          if (!email) return false;
          if (testEmailsList.includes(email)) return false;
          if (email.includes('@example.com')) return false;
          if (email.includes('+')) return false;
          return true;
        })
        .forEach(report => {
          const email = report.account_email;
          if (email) {
            reportCountByUser.set(email, (reportCountByUser.get(email) || 0) + 1);
          }
        });

      // Get all unique user emails
      const allUserEmails = new Set<string>();
      filteredMessageData.forEach((row: { account_email: string }) => {
        allUserEmails.add(row.account_email);
      });
      reportCountByUser.forEach((_, email) => {
        allUserEmails.add(email);
      });

      // Calculate consistency (days active) for each user
      const userConsistency = new Map<string, number>();
      
      for (const email of allUserEmails) {
        try {
          // Get account_id for this email
          const { data: emailData } = await supabaseAdmin
            .from('account_emails')
            .select('account_id')
            .eq('email', email)
            .single();
          
          if (!emailData) continue;
          
          const accountId = emailData.account_id;
          const userDays = new Set<string>();

          // Get both messages and reports in parallel
          const [roomsData, reportRoomsData] = await Promise.all([
            // Get rooms for messages
            supabaseAdmin
              .from('rooms')
              .select('id')
              .eq('account_id', accountId),
            
            // Get segment report rooms
            supabaseAdmin
              .from('rooms')
              .select('updated_at, topic')
              .eq('account_id', accountId)
              .gte('updated_at', prevStart.toISOString())
              .lte('updated_at', prevEnd.toISOString())
          ]);

          const roomIds = (roomsData.data || []).map(r => r.id);

          // Get messages for this user's rooms
          if (roomIds.length > 0) {
            const { data: msgRows } = await supabaseAdmin
              .from('memories')
              .select('updated_at')
              .in('room_id', roomIds)
              .gte('updated_at', prevStart.toISOString())
              .lte('updated_at', prevEnd.toISOString());

            if (msgRows) {
              msgRows.forEach((row: { updated_at: string }) => {
                const day = row.updated_at.slice(0, 10);
                userDays.add(day);
              });
            }
          }

          // Process segment reports
          if (reportRoomsData.data) {
            reportRoomsData.data.forEach((row: { updated_at: string, topic: string }) => {
              // Only count rooms with topics starting with "segment:" (case insensitive)
              if (row.topic?.toLowerCase?.().startsWith('segment:')) {
                const day = row.updated_at.slice(0, 10);
                userDays.add(day);
              }
            });
          }

          userConsistency.set(email, userDays.size);
        } catch (error) {
          console.error('Error calculating consistency for user', email, ':', error);
          userConsistency.set(email, 0);
        }
      }

      // Combine users who sent messages or created reports with their total activity
      const userActivityMap = new Map<string, number>();
      
      // Add message counts
      filteredMessageData.forEach((row: { account_email: string, message_count: number }) => {
        userActivityMap.set(row.account_email, row.message_count);
      });

      // Add report counts to existing users or create new entries
      reportCountByUser.forEach((reportCount, email) => {
        const existingActivity = userActivityMap.get(email) || 0;
        userActivityMap.set(email, existingActivity + reportCount);
      });

      // Count power users (must meet BOTH criteria: consistency AND volume)
      let powerUsers = 0;
      userActivityMap.forEach((totalActions, email) => {
        const daysActive = userConsistency.get(email) || 0;
        if (daysActive >= minDaysActive && totalActions >= minTotalActions) {
          powerUsers++;
        }
      });

      return { powerUsers };
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getCurrentPeriodData(),
      getPreviousPeriodData()
    ]);

    // Calculate percentage change
    let percentChange = 0;
    let changeDirection: 'up' | 'down' | 'neutral' = 'neutral';

    if (previousPeriod.powerUsers > 0) {
      percentChange = Math.round(((currentPeriod.powerUsers - previousPeriod.powerUsers) / previousPeriod.powerUsers) * 100);
      changeDirection = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
    } else if (currentPeriod.powerUsers > 0) {
      percentChange = 100;
      changeDirection = 'up';
    }

    const result = {
      powerUsers: currentPeriod.powerUsers,
      previousPowerUsers: previousPeriod.powerUsers,
      percentChange: Math.abs(percentChange),
      changeDirection,
      timeFilter,
      excludeTest
    };

    console.log('Power Users API: Result:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Power Users API: Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch power users data',
      powerUsers: 0,
      previousPowerUsers: 0,
      percentChange: 0,
      changeDirection: 'neutral' 
    }, { status: 500 });
  }
} 