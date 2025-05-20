import { NextResponse } from 'next/server'
import { PrivyClient, User } from '@privy-io/server-auth'

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
function getDateRanges(timeframe: string): { dates: Date[], intervals: { start: Date, end: Date }[] } {
  const now = new Date();
  const dates: Date[] = [];
  const intervals: { start: Date, end: Date }[] = [];

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

export async function GET(request: Request) {
  try {
    console.log('API: Fetching metrics...');
    
    // Get timeframe from query parameters
    const url = new URL(request.url);
    const timeframe = url.searchParams.get('timeframe') || 'monthly';
    
    // Get date ranges based on timeframe
    const { dates, intervals } = getDateRanges(timeframe);

    // Check if we have cached metrics for this timeframe
    const cachedMetrics = getCachedMetrics(timeframe);
    let activeUsersData: number[];

    if (cachedMetrics) {
      activeUsersData = cachedMetrics;
    } else {
      // Get active users data for each interval
      activeUsersData = await Promise.all(
        intervals.map(interval => getActiveUsersForDateRange(interval.start, interval.end))
      );
      
      // Cache the results
      cacheMetrics(timeframe, activeUsersData);
    }

    // Get current paying customers
    const currentPayingCustomers = 0;
    console.log('API: Current paying customers:', currentPayingCustomers);

    // Format labels based on timeframe
    const labels = dates.map(date => formatDateLabel(date, timeframe));

    // Generate paying customers data (steady growth)
    const payingCustomersData = Array(dates.length).fill(0).map((_, i) => {
      const factor = (dates.length - 1 - i) / (dates.length - 1);
      return Math.max(1, Math.floor(currentPayingCustomers * (1 - factor * 0.5)));
    });

    const response = {
      labels,
      datasets: [
        {
          label: 'Paying Customers',
          data: payingCustomersData,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
        },
        {
          label: 'Active Users',
          data: activeUsersData,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
        }
      ]
    };

    console.log('API: Sending response:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('API Error fetching chart data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
} 