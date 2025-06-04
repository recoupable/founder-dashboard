import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Robust outlier handling using median + IQR filtering
function calculateRobustAverage(messagesPerUser: number[]) {
  if (messagesPerUser.length === 0) return 0;
  
  // Sort the array
  const sorted = [...messagesPerUser].sort((a, b) => a - b);
  
  // Calculate quartiles
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  // Define outlier boundaries (1.5 * IQR is standard)
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  // Filter outliers and calculate median of remaining data
  const filtered = sorted.filter(val => val >= lowerBound && val <= upperBound);
  
  if (filtered.length === 0) return sorted[Math.floor(sorted.length / 2)]; // fallback to overall median
  
  const medianIndex = Math.floor(filtered.length / 2);
  return filtered.length % 2 === 0 
    ? (filtered[medianIndex - 1] + filtered[medianIndex]) / 2
    : filtered[medianIndex];
}

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

    console.log('Average Usage API: Starting with filters:', { timeFilter, excludeTest });

    const { start, end } = getDateRangeForFilter(timeFilter);

    // Get test emails if excluding test accounts
    let testEmailsList: string[] = [];
    let allowedAccountIds: string[] = [];
    let allowedRoomIds: string[] = [];

    if (excludeTest) {
      // Get test emails
      const { data: testEmailsData } = await supabaseAdmin
        .from('test_emails')
        .select('email');
      testEmailsList = testEmailsData?.map(row => row.email) || [];

      // Get allowed account IDs (excluding test accounts)
      const { data: allEmailAccountsData } = await supabaseAdmin
        .from('accounts')
        .select('account_id, email')
        .not('email', 'is', null);

      const { data: allWalletAccountsData } = await supabaseAdmin
        .from('wallets')
        .select('account_id');

      // Filter email accounts
      const allowedEmailAccountIds = (allEmailAccountsData || [])
        .filter(account => {
          const email = account.email;
          if (!email) return false;
          if (testEmailsList.includes(email)) return false;
          if (email.includes('@example.com')) return false;
          if (email.includes('+')) return false;
          return true;
        })
        .map(account => account.account_id);

      // Filter wallet accounts (exclude specific test wallet IDs)
      const testWalletIds = ['2fbe2485', '44b0c8fd', '3cdea198', 'a3b8a5ba', '496a071a', 'c9e86577', '5ada04cd'];
      const allowedWalletAccountIds = (allWalletAccountsData || [])
        .filter(account => !testWalletIds.some(testId => account.account_id.includes(testId)))
        .map(account => account.account_id);

      allowedAccountIds = [...allowedEmailAccountIds, ...allowedWalletAccountIds];

      // Get allowed room IDs
      if (allowedAccountIds.length > 0) {
        const { data: roomsData } = await supabaseAdmin
          .from('rooms')
          .select('id')
          .in('account_id', allowedAccountIds);
        allowedRoomIds = (roomsData || []).map(room => room.id);
      }

      console.log('Average Usage API: Allowed accounts:', allowedAccountIds.length, 'Allowed rooms:', allowedRoomIds.length);
    }

    // Get message counts for the current period
    const getCurrentPeriodData = async () => {
      // Get message counts by user
      const messageQuery = supabaseAdmin.rpc('get_message_counts_by_user', { 
        start_date: start ? start.toISOString() : '1970-01-01T00:00:00.000Z', 
        end_date: end.toISOString() 
      });

      const { data: messageData } = await messageQuery;
      
      if (!messageData) return { averageUsage: 0, activeUsers: 0, outliers: 0 };

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

      const messagesPerUser = Array.from(messageUserMap.values()) as number[];
      const activeUsers = messagesPerUser.length;

      if (activeUsers === 0) return { averageUsage: 0, activeUsers: 0, outliers: 0 };

      // Calculate robust average (median with outlier filtering)
      const averageUsage = calculateRobustAverage(messagesPerUser);
      
      // Count outliers for reporting
      const sorted = [...messagesPerUser].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      const outliers = messagesPerUser.filter(val => val < lowerBound || val > upperBound).length;

      return { averageUsage: Math.round(averageUsage * 100) / 100, activeUsers, outliers };
    };

    // Get previous period data for comparison
    const getPreviousPeriodData = async () => {
      if (!start) return { averageUsage: 0, activeUsers: 0, outliers: 0 };

      const periodDuration = end.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime());
      const prevStart = new Date(start.getTime() - periodDuration);

      const messageQuery = supabaseAdmin.rpc('get_message_counts_by_user', { 
        start_date: prevStart.toISOString(), 
        end_date: prevEnd.toISOString() 
      });

      const { data: messageData } = await messageQuery;
      
      if (!messageData) return { averageUsage: 0, activeUsers: 0, outliers: 0 };

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

      const messagesPerUser = Array.from(messageUserMap.values()) as number[];
      const activeUsers = messagesPerUser.length;

      if (activeUsers === 0) return { averageUsage: 0, activeUsers: 0, outliers: 0 };

      const averageUsage = calculateRobustAverage(messagesPerUser);
      
      const sorted = [...messagesPerUser].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      const outliers = messagesPerUser.filter(val => val < lowerBound || val > upperBound).length;

      return { averageUsage: Math.round(averageUsage * 100) / 100, activeUsers, outliers };
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getCurrentPeriodData(),
      getPreviousPeriodData()
    ]);

    // Calculate percentage change
    let percentChange = 0;
    let changeDirection: 'up' | 'down' | 'neutral' = 'neutral';

    if (previousPeriod.averageUsage > 0) {
      percentChange = Math.round(((currentPeriod.averageUsage - previousPeriod.averageUsage) / previousPeriod.averageUsage) * 100);
      changeDirection = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
    } else if (currentPeriod.averageUsage > 0) {
      percentChange = 100;
      changeDirection = 'up';
    }

    const result = {
      averageUsage: currentPeriod.averageUsage,
      previousAverageUsage: previousPeriod.averageUsage,
      percentChange: Math.abs(percentChange),
      changeDirection,
      timeFilter,
      excludeTest,
      currentActiveUsers: currentPeriod.activeUsers,
      previousActiveUsers: previousPeriod.activeUsers,
      currentOutliers: currentPeriod.outliers,
      previousOutliers: previousPeriod.outliers
    };

    console.log('Average Usage API: Result:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Average Usage API: Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch average usage data',
      averageUsage: 0,
      previousAverageUsage: 0,
      percentChange: 0,
      changeDirection: 'neutral' 
    }, { status: 500 });
  }
} 