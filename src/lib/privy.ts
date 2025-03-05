import { PrivyClient, User } from '@privy-io/server-auth';

if (!process.env.PRIVY_API_KEY || !process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
  throw new Error('Missing Privy environment variables');
}

// Initialize Privy client with correct parameters
const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  process.env.PRIVY_API_KEY,
  {
    apiURL: 'https://auth.privy.io'
  }
);

// Cache structure
interface Cache {
  users: User[] | null;
  timestamp: number;
  activeUsers: number | null;
  activeUsersTimestamp: number;
  lastMonthActiveUsers: number | null;
  lastMonthActiveUsersTimestamp: number;
  fetchInProgress: boolean;
}

// Initialize cache
const cache: Cache = {
  users: null,
  timestamp: 0,
  activeUsers: null,
  activeUsersTimestamp: 0,
  lastMonthActiveUsers: null,
  lastMonthActiveUsersTimestamp: 0,
  fetchInProgress: false
};

// Cache duration (1 hour instead of 1 minute)
const CACHE_DURATION = 60 * 60 * 1000;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Helper function to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Function to get users with caching and retries
async function getCachedUsers(): Promise<User[]> {
  const now = Date.now();
  
  // If cache is valid, return cached data
  if (cache.users && (now - cache.timestamp) < CACHE_DURATION) {
    console.log('Using cached users data, count:', cache.users.length);
    return cache.users;
  }

  // If a fetch is already in progress, wait for it to complete
  if (cache.fetchInProgress) {
    console.log('Fetch already in progress, waiting...');
    // Wait for the fetch to complete (poll every 100ms)
    while (cache.fetchInProgress) {
      await wait(100);
    }
    
    // If cache was updated while waiting, return it
    if (cache.users) {
      console.log('Using newly fetched users data, count:', cache.users.length);
      return cache.users;
    }
  }

  // Set fetch in progress flag
  cache.fetchInProgress = true;
  
  let lastError: Error | unknown = null;
  
  try {
    // Try multiple times with exponential backoff
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`Fetching users directly from Privy API (attempt ${attempt}/${MAX_RETRIES})...`);
        console.log('Using Privy App ID:', process.env.NEXT_PUBLIC_PRIVY_APP_ID?.substring(0, 5) + '...');
        console.log('API URL:', 'https://auth.privy.io');
        
        const users = await privy.getUsers();
        console.log('Privy API returned users count:', users.length);
        
        // Update cache
        cache.users = users;
        cache.timestamp = now;
        
        return users;
      } catch (error) {
        lastError = error;
        console.error(`Error fetching users from Privy (attempt ${attempt}/${MAX_RETRIES}):`, error);
        console.error('Error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        
        // If not the last attempt, wait before retrying
        if (attempt < MAX_RETRIES) {
          const delayTime = RETRY_DELAY * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`Retrying in ${delayTime}ms...`);
          await wait(delayTime);
        }
      }
    }
    
    // All retries failed
    console.error('All retry attempts failed');
    
    // If cache exists but is expired, use it as fallback
    if (cache.users) {
      console.log('Using expired cache as fallback due to API error, count:', cache.users.length);
      return cache.users;
    }
    
    throw lastError;
  } finally {
    // Reset fetch in progress flag
    cache.fetchInProgress = false;
  }
}

// Function to get rolling 30-day active users
export async function getActiveUsersCount(): Promise<number> {
  const now = Date.now();
  
  // If cache is valid, return cached count
  if (cache.activeUsers !== null && (now - cache.activeUsersTimestamp) < CACHE_DURATION) {
    console.log('Using cached active users count:', cache.activeUsers);
    return cache.activeUsers;
  }

  try {
    console.log('Calculating active users count...');
    const users = await getCachedUsers();
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    console.log('Thirty days ago:', thirtyDaysAgo.toISOString());
    
    const activeUsers = users.filter((user: User) => {
      if (!user.linkedAccounts || user.linkedAccounts.length === 0) {
        return false;
      }

      // Get the most recent verification time across all linked accounts
      const mostRecentActivity = user.linkedAccounts.reduce((latest, account) => {
        const verificationTime = account.latestVerifiedAt ? new Date(account.latestVerifiedAt) : new Date(0);
        return verificationTime > latest ? verificationTime : latest;
      }, new Date(0));

      return mostRecentActivity >= thirtyDaysAgo;
    }).length;

    console.log('Calculated active users:', activeUsers);
    
    // Update cache
    cache.activeUsers = activeUsers;
    cache.activeUsersTimestamp = now;
    
    return activeUsers;
  } catch (error) {
    console.error('Error calculating active users:', error);
    
    // If cache exists, use it as fallback
    if (cache.activeUsers !== null) {
      console.log('Using expired active users cache as fallback');
      return cache.activeUsers;
    }
    
    // Return -1 to indicate an error
    return -1;
  }
}

// Function to get previous 30-day active users count for comparison
export async function getLastMonthActiveUsersCount(): Promise<number> {
  const now = Date.now();
  
  // If cache is valid, return cached count
  if (cache.lastMonthActiveUsers !== null && (now - cache.lastMonthActiveUsersTimestamp) < CACHE_DURATION) {
    console.log('Using cached last month active users count:', cache.lastMonthActiveUsers);
    return cache.lastMonthActiveUsers;
  }
  
  try {
    console.log('Calculating last month active users...');
    const users = await getCachedUsers();
    const sixtyDaysAgo = new Date();
    const thirtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const lastMonthActiveUsers = users.filter((user: User) => {
      if (!user.linkedAccounts || user.linkedAccounts.length === 0) {
        return false;
      }

      const mostRecentActivity = user.linkedAccounts.reduce((latest, account) => {
        const verificationTime = account.latestVerifiedAt ? new Date(account.latestVerifiedAt) : new Date(0);
        return verificationTime > latest ? verificationTime : latest;
      }, new Date(0));

      return mostRecentActivity >= sixtyDaysAgo && mostRecentActivity < thirtyDaysAgo;
    }).length;

    console.log('Calculated last month active users:', lastMonthActiveUsers);
    
    // Update cache
    cache.lastMonthActiveUsers = lastMonthActiveUsers;
    cache.lastMonthActiveUsersTimestamp = now;
    
    return lastMonthActiveUsers;
  } catch (error) {
    console.error('Error calculating previous month active users:', error);
    
    // If cache exists, use it as fallback
    if (cache.lastMonthActiveUsers !== null) {
      console.log('Using expired last month active users cache as fallback');
      return cache.lastMonthActiveUsers;
    }
    
    return -1;
  }
} 