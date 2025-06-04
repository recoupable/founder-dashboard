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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') || 'Last 7 Days';
    const excludeTest = searchParams.get('excludeTest') === 'true';

    console.log('Engaged Users API: Starting with filters:', { timeFilter, excludeTest });

    const { start, end } = getDateRangeForFilter(timeFilter);

    // Get test emails if excluding test accounts
    let testEmailsList: string[] = [];
    if (excludeTest) {
      const { data: testEmailsData } = await supabaseAdmin
        .from('test_emails')
        .select('email');
      testEmailsList = testEmailsData?.map(row => row.email) || [];
    }

    // Get engaged users for current period
    const getCurrentPeriodData = async () => {
      // Get message counts by user
      const { data: messageData } = await supabaseAdmin.rpc('get_message_counts_by_user', { 
        start_date: start ? start.toISOString() : '1970-01-01T00:00:00.000Z', 
        end_date: end.toISOString() 
      });
      
      if (!messageData) return { engagedUsers: 0 };

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

      // Get segment report users for this period
      let reportQuery = supabaseAdmin
        .from('segment_reports')
        .select('account_email')
        .lte('updated_at', end.toISOString());

      if (start) {
        reportQuery = reportQuery.gte('updated_at', start.toISOString());
      }

      const { data: reportData } = await reportQuery;
      const reportUsers = new Set((reportData || [])
        .filter(report => {
          if (!excludeTest) return true;
          const email = report.account_email;
          if (!email) return false;
          if (testEmailsList.includes(email)) return false;
          if (email.includes('@example.com')) return false;
          if (email.includes('+')) return false;
          return true;
        })
        .map(report => report.account_email));

      // Combine users who sent messages or created reports
      const messageUserMap = new Map();
      filteredMessageData.forEach((row: { account_email: string, message_count: number }) => {
        messageUserMap.set(row.account_email, row.message_count);
      });

      // Add report users who may not have sent messages
      reportUsers.forEach(email => {
        if (!messageUserMap.has(email)) {
          messageUserMap.set(email, 0);
        }
      });

      // Count engaged users (3+ messages/reports)
      const userCounts = Array.from(messageUserMap.entries());
      const engagedUsers = userCounts.filter(entry => entry[1] >= 3).length;

      return { engagedUsers };
    };

    // Get previous period data for comparison
    const getPreviousPeriodData = async () => {
      if (!start) return { engagedUsers: 0 };

      const periodDuration = end.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime());
      const prevStart = new Date(start.getTime() - periodDuration);

      const { data: messageData } = await supabaseAdmin.rpc('get_message_counts_by_user', { 
        start_date: prevStart.toISOString(), 
        end_date: prevEnd.toISOString() 
      });
      
      if (!messageData) return { engagedUsers: 0 };

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

      // Get segment report users for previous period
      const { data: reportData } = await supabaseAdmin
        .from('segment_reports')
        .select('account_email')
        .gte('updated_at', prevStart.toISOString())
        .lte('updated_at', prevEnd.toISOString());

      const reportUsers = new Set((reportData || [])
        .filter(report => {
          if (!excludeTest) return true;
          const email = report.account_email;
          if (!email) return false;
          if (testEmailsList.includes(email)) return false;
          if (email.includes('@example.com')) return false;
          if (email.includes('+')) return false;
          return true;
        })
        .map(report => report.account_email));

      const messageUserMap = new Map();
      filteredMessageData.forEach((row: { account_email: string, message_count: number }) => {
        messageUserMap.set(row.account_email, row.message_count);
      });

      reportUsers.forEach(email => {
        if (!messageUserMap.has(email)) {
          messageUserMap.set(email, 0);
        }
      });

      const userCounts = Array.from(messageUserMap.entries());
      const engagedUsers = userCounts.filter(entry => entry[1] >= 3).length;

      return { engagedUsers };
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getCurrentPeriodData(),
      getPreviousPeriodData()
    ]);

    // Calculate percentage change
    let percentChange = 0;
    let changeDirection: 'up' | 'down' | 'neutral' = 'neutral';

    if (previousPeriod.engagedUsers > 0) {
      percentChange = Math.round(((currentPeriod.engagedUsers - previousPeriod.engagedUsers) / previousPeriod.engagedUsers) * 100);
      changeDirection = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
    } else if (currentPeriod.engagedUsers > 0) {
      percentChange = 100;
      changeDirection = 'up';
    }

    const result = {
      engagedUsers: currentPeriod.engagedUsers,
      previousEngagedUsers: previousPeriod.engagedUsers,
      percentChange: Math.abs(percentChange),
      changeDirection,
      timeFilter,
      excludeTest
    };

    console.log('Engaged Users API: Result:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Engaged Users API: Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch engaged users data',
      engagedUsers: 0,
      previousEngagedUsers: 0,
      percentChange: 0,
      changeDirection: 'neutral' 
    }, { status: 500 });
  }
} 