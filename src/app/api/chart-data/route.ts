import { NextResponse } from 'next/server'
import { PrivyClient } from '@privy-io/server-auth'
import type { User } from '@privy-io/server-auth'
import { supabaseAdmin } from '@/lib/supabase'

if (!process.env.PRIVY_API_KEY || !process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
  throw new Error('Missing Privy environment variables')
}

// Initialize Privy client
const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  process.env.PRIVY_API_KEY,
  {
    apiURL: 'https://auth.privy.io'
  }
)

// Cache structure for storing both user data and processed metrics
interface MetricsCache {
  activeUsers: number[];
  timeframe: string;
  timestamp: number;
}

interface Cache {
  userData: {
    data: User[] | null;
    timestamp: number;
  };
  metrics: {
    [key: string]: MetricsCache;
  };
}

// Initialize cache
const cache: Cache = {
  userData: {
    data: null,
    timestamp: 0
  },
  metrics: {}
};

// Cache duration in milliseconds (1 minute)
const CACHE_DURATION = 1 * 60 * 1000;

// Rate limiting
let lastApiCall = 0;
const API_CALL_MINIMUM_INTERVAL = 2000; // 2 seconds between API calls

// Helper function to get users with caching
async function getCachedUsers(): Promise<User[]> {
  const now = Date.now();
  
  // If cache is valid, return cached data
  if (cache.userData.data && (now - cache.userData.timestamp) < CACHE_DURATION) {
    console.log('Using cached user data');
    return cache.userData.data;
  }

  // Check rate limiting
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < API_CALL_MINIMUM_INTERVAL) {
    console.log('Rate limit protection: Using expired cache as fallback');
    if (cache.userData.data) {
      return cache.userData.data;
    }
    await new Promise(resolve => setTimeout(resolve, API_CALL_MINIMUM_INTERVAL - timeSinceLastCall));
  }

  try {
    console.log('Fetching fresh user data from Privy');
    lastApiCall = now;
    const users = await privy.getUsers();
    
    // Update cache
    cache.userData = {
      data: users,
      timestamp: now
    };
    
    return users;
  } catch (error) {
    console.error('Error fetching users from Privy:', error);
    
    // If cache exists but is expired, use it as fallback
    if (cache.userData.data) {
      console.log('Using expired cache as fallback');
      return cache.userData.data;
    }
    
    throw error;
  }
}

// Helper function to get active users for a specific date range
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function getActiveUsersForDateRange(startDate: Date, endDate: Date): Promise<number> {
  try {
    const users = await getCachedUsers();
    
    console.log(`Checking active users between ${startDate.toISOString()} and ${endDate.toISOString()}`);
    
    const activeUsers = users.filter((user: User) => {
      if (!user.linkedAccounts || user.linkedAccounts.length === 0) {
        return false;
      }

      // Find the most recent verification time
      let mostRecentActivity = new Date(0);
      for (const account of user.linkedAccounts) {
        if (account.latestVerifiedAt) {
          const verificationTime = new Date(account.latestVerifiedAt);
          if (verificationTime > mostRecentActivity) {
            mostRecentActivity = verificationTime;
          }
        }
      }

      const isActive = mostRecentActivity >= startDate && mostRecentActivity <= endDate;
      return isActive;
    });

    return activeUsers.length;
  } catch (error) {
    console.error('Error calculating active users for date range:', error);
    return 0;
  }
}

// Helper function to get cached metrics
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getCachedMetrics(timeframe: string): number[] | null {
  const now = Date.now();
  const cachedMetrics = cache.metrics[timeframe];
  
  if (cachedMetrics && (now - cachedMetrics.timestamp) < CACHE_DURATION) {
    console.log(`Using cached metrics for timeframe: ${timeframe}`);
    return cachedMetrics.activeUsers;
  }
  
  return null;
}

// Helper function to cache metrics
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function cacheMetrics(timeframe: string, activeUsers: number[]): void {
  cache.metrics[timeframe] = {
    activeUsers,
    timeframe,
    timestamp: Date.now()
  };
}

// Helper function to format date for labels
function formatDateLabel(date: Date, timeframe: string): string {
  switch (timeframe) {
    case 'daily':
      return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
    case 'weekly':
    case 'allTimeWeekly':
      return `${date.toLocaleDateString('default', { month: 'short', day: 'numeric' })}`;
    case 'monthly':
      return date.toLocaleDateString('default', { month: 'short', year: '2-digit' });
    case 'allTime':
      return date.toLocaleDateString('default', { month: 'short', year: 'numeric' });
    default:
      return date.toLocaleDateString();
  }
}

// Helper function to get date ranges based on timeframe
function getDateRanges(timeframe: string, minDateOverride?: Date): { dates: Date[], intervals: { start: Date, end: Date }[] } {
  const now = new Date();
  const dates: Date[] = [];
  const intervals: { start: Date, end: Date }[] = [];

  if ((timeframe === 'allTime' || timeframe === 'allTimeWeekly') && minDateOverride) {
    if (timeframe === 'allTime') {
      const d = new Date(minDateOverride.getFullYear(), minDateOverride.getMonth(), 1);
      while (d <= now) {
        dates.push(new Date(d));
        const start = new Date(d);
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        intervals.push({ start, end });
        d.setMonth(d.getMonth() + 1);
      }
      return { dates, intervals };
    }
    if (timeframe === 'allTimeWeekly') {
      // eslint-disable-next-line prefer-const
      let currentWeekStart = new Date(minDateOverride);
      currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
      currentWeekStart.setHours(0, 0, 0, 0);

      while (currentWeekStart <= now) {
        dates.push(new Date(currentWeekStart));
        const start = new Date(currentWeekStart);
        const end = new Date(currentWeekStart);
        end.setDate(currentWeekStart.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        intervals.push({ start, end: end > now ? now : end });
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      }
      return { dates, intervals };
    }
  }

  switch (timeframe) {
    case 'daily':
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dates.push(date);
        intervals.push({
          start: new Date(date.setHours(0, 0, 0, 0)),
          end: new Date(date.setHours(23, 59, 59, 999))
        });
      }
      break;

    case 'weekly':
      // Last 8 weeks
      for (let i = 7; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - (i * 7));
        dates.push(date);
        intervals.push({
          start: new Date(new Date(date).setDate(date.getDate() - 6)),
          end: date
        });
      }
      break;

    case 'monthly':
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        dates.push(date);
        intervals.push({
          start: new Date(date),
          end: new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        });
      }
      break;

    case 'allTime':
      // Every month since the start of data (or last 12 months if too much data)
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        dates.push(date);
        intervals.push({
          start: new Date(date),
          end: new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        });
      }
      break;

    default:
      // Default to monthly
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        dates.push(date);
        intervals.push({
          start: new Date(date),
          end: new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        });
      }
  }

  return { dates, intervals };
}

// Helper to format a date as YYYY-MM-DD
function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper to get the start of the week (Sunday)
function getWeekStart(date: Date): string {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return formatDateKey(d);
}

// Helper to get the start of the month
function getMonthStart(date: Date): string {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  return formatDateKey(d);
}

export async function GET(request: Request) {
  try {
    console.log('API: Fetching metrics...');
    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || 'monthly';
    const excludeTest = url.searchParams.get('excludeTest') === 'true';
    
    let minDateOverride: Date | undefined = undefined;
    if (timeframe === 'allTime' || timeframe === 'allTimeWeekly') { 
      const { data: minData } = await supabaseAdmin
        .from('memories')
        .select('updated_at')
        .order('updated_at', { ascending: true })
        .limit(1)
        .single();
      
      if (minData?.updated_at) { 
        const earliestDate = new Date(minData.updated_at);
        if (timeframe === 'allTime') {
          minDateOverride = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);
        } else {
          minDateOverride = earliestDate; 
        }
      }
    }
    
    // Get test emails to filter (same as leaderboard)
    const { data: testEmailsData } = await supabaseAdmin
      .from('test_emails')
      .select('email');
    
    const testEmails = testEmailsData ? testEmailsData.map(te => te.email) : [];
    console.log(`Test emails from test_emails table: ${testEmails.length}`);
    
    // Helper function to check if email should be excluded (same as leaderboard)
    const isNotTestEmail = (email: string): boolean => {
      if (!email) return false;
      if (testEmails.includes(email)) return false;
      if (email.includes('@example.com')) return false;
      if (email.includes('+')) return false;
      return true;
    };
    
    // Get date ranges based on timeframe and minDateOverride
    const { dates, intervals } = getDateRanges(timeframe, minDateOverride);
    
    // Build date keys for each interval
    let dateKeys: string[] = [];
    if (timeframe === 'daily') {
      dateKeys = dates.map(formatDateKey);
    } else if (timeframe === 'weekly' || timeframe === 'allTimeWeekly') { 
      dateKeys = dates.map(getWeekStart);
    } else if (timeframe === 'monthly' || timeframe === 'allTime') {
      dateKeys = dates.map(getMonthStart);
    }
    
    // Get min/max for the query
    const minDate = intervals[0].start;
    const maxDate = intervals[intervals.length - 1].end;
    
    console.log('DEBUG minDate:', minDate.toISOString(), 'maxDate:', maxDate.toISOString());
    console.log('DEBUG dateKeys:', dateKeys);
    console.log('DEBUG excludeTest:', excludeTest);
    
    // Initialize data arrays
    const messagesData: number[] = new Array(dateKeys.length).fill(0);
    const reportsData: number[] = new Array(dateKeys.length).fill(0);
    
    // For each interval, we need to get message counts by email and filter
    for (let i = 0; i < intervals.length; i++) {
      const { start, end } = intervals[i];
      
      // Get message counts grouped by email for this interval
      // We'll use the same RPC function as the leaderboard
      const { data: messageCounts, error: messageError } = await supabaseAdmin
        .rpc('get_message_counts_by_user', { 
          start_date: start.toISOString(), 
          end_date: end.toISOString() 
        });
      
      if (messageError) {
        console.error(`Error fetching message counts for interval ${i}:`, messageError);
        messagesData[i] = 0;
      } else if (messageCounts) {
        // Filter and sum the counts (same as leaderboard)
        const totalMessages = messageCounts
          .filter((row: { account_email: string, message_count: number }) => 
            isNotTestEmail(row.account_email)
          )
          .reduce((sum: number, row: { account_email: string, message_count: number }) => 
            sum + row.message_count, 0
          );
        
        messagesData[i] = totalMessages;
        console.log(`Interval ${i}: Total user messages (excluding test emails): ${totalMessages}`);
      }
      
      // For segment reports, count rooms with topics starting with "segment:"
      const { data: roomsData } = await supabaseAdmin
        .from('rooms')
        .select('account_id, topic')
        .gte('updated_at', start.toISOString())
        .lt('updated_at', end.toISOString());
      
      if (roomsData) {
        // Get emails for these accounts
        const accountIds = [...new Set(roomsData.map(r => r.account_id))];
        const { data: emailsData } = await supabaseAdmin
          .from('account_emails')
          .select('account_id, email')
          .in('account_id', accountIds);
        
        // Count segment reports (rooms with topic starting with "segment:")
        let segmentReportCount = 0;
        for (const room of roomsData) {
          if (room.topic?.toLowerCase()?.startsWith?.('segment:')) { 
            const email = emailsData?.find(e => e.account_id === room.account_id)?.email;
            if (email && isNotTestEmail(email)) {
              segmentReportCount++;
            }
          }
        }
        
        reportsData[i] = segmentReportCount;
        console.log(`Interval ${i}: Segment reports (excluding test emails): ${segmentReportCount}`);
      } else {
        reportsData[i] = 0;
      }
    }
    
    console.log('Messages Data:', messagesData);
    console.log('Reports Data:', reportsData);
    
    // Fetch chart annotations (events)
    let eventAnnotations = [];
    try {
      const { data: annotationData, error: annotationError } = await supabaseAdmin
        .from('founder_dashboard_chart_annotations')
        .select('*')
        .gte('event_date', minDate.toISOString().split('T')[0]) // Use YYYY-MM-DD for comparison with DATE type
        .lte('event_date', maxDate.toISOString().split('T')[0]) // Use YYYY-MM-DD for comparison with DATE type
        .eq('chart_type', 'messages_reports_over_time') // Filter by chart_type
        .order('event_date', { ascending: true });

      if (annotationError) {
        console.error('Error fetching chart event annotations:', annotationError);
      } else {
        eventAnnotations = annotationData || [];
      }
    } catch (e) {
      console.error('Exception fetching chart event annotations:', e);
    }

    // Generate daily marker annotations (for faint grid lines)
    const dailyMarkerAnnotations = [];
    if (intervals.length > 0) {
        // eslint-disable-next-line prefer-const
        let currentDate = new Date(minDate); // minDate is the overall start of the chart
        const overallEndDate = new Date(maxDate); // maxDate is the overall end of the chart

        while (currentDate <= overallEndDate) {
            dailyMarkerAnnotations.push({
                type: 'line',
                scaleID: 'x',
                value: currentDate.toISOString(), // Use ISO string for time scale
                borderColor: 'rgba(200, 200, 200, 0.3)', // Very faint gray
                borderWidth: 1,
                // No label for these grid lines
            });
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }
    
    // Combine event annotations and daily markers
    const allAnnotations = [...dailyMarkerAnnotations, ...eventAnnotations];

    // Format labels for major ticks (still weekly)
    const labels = dates.map(date => formatDateLabel(date, timeframe));
    const rawDates = dates.map(date => date.toISOString());
    
    const response = {
      labels, // These are for the major weekly ticks
      rawDates, 
      datasets: [
        {
          label: 'Messages Sent',
          data: messagesData,
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
        },
        {
          label: 'Segment Reports',
          data: reportsData,
          borderColor: 'rgb(251, 191, 36)',
          backgroundColor: 'rgba(251, 191, 36, 0.2)',
        }
      ],
      annotations: allAnnotations // Send combined annotations
    };
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error fetching chart data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
} 