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
}

// Initialize cache
const cache: Cache = {
  users: null,
  timestamp: 0,
  activeUsers: null,
  activeUsersTimestamp: 0
};

// Cache duration (1 minute)
const CACHE_DURATION = 1 * 60 * 1000;

// Function to get users with caching
async function getCachedUsers(): Promise<User[]> {
  const now = Date.now();
  
  // If cache is valid, return cached data
  if (cache.users && (now - cache.timestamp) < CACHE_DURATION) {
    return cache.users;
  }

  try {
    const users = await privy.getUsers();
    
    // Update cache
    cache.users = users;
    cache.timestamp = now;
    
    return users;
  } catch (error) {
    console.error('Error fetching users from Privy:', error);
    
    // If cache exists but is expired, use it as fallback
    if (cache.users) {
      console.log('Using expired cache as fallback due to API error');
      return cache.users;
    }
    
    throw error;
  }
}

// Function to get rolling 30-day active users
export async function getActiveUsersCount(): Promise<number> {
  const now = Date.now();
  
  // If cache is valid, return cached count
  if (cache.activeUsers !== null && (now - cache.activeUsersTimestamp) < CACHE_DURATION) {
    return cache.activeUsers;
  }

  try {
    const users = await getCachedUsers();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
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
    
    return 0;
  }
}

// Function to get previous 30-day active users count for comparison
export async function getLastMonthActiveUsersCount(): Promise<number> {
  try {
    const users = await getCachedUsers();
    const sixtyDaysAgo = new Date();
    const thirtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return users.filter((user: User) => {
      if (!user.linkedAccounts || user.linkedAccounts.length === 0) {
        return false;
      }

      const mostRecentActivity = user.linkedAccounts.reduce((latest, account) => {
        const verificationTime = account.latestVerifiedAt ? new Date(account.latestVerifiedAt) : new Date(0);
        return verificationTime > latest ? verificationTime : latest;
      }, new Date(0));

      return mostRecentActivity >= sixtyDaysAgo && mostRecentActivity < thirtyDaysAgo;
    }).length;
  } catch (error) {
    console.error('Error calculating previous month active users:', error);
    return 0;
  }
} 