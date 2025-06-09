import { NextResponse } from 'next/server';
import { PrivyClient, User } from '@privy-io/server-auth';
import { supabaseAdmin } from '@/lib/supabase';

if (!process.env.PRIVY_API_KEY || !process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
  throw new Error('Missing Privy environment variables');
}

// Initialize Privy client
const privy = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID,
  process.env.PRIVY_API_KEY,
  {
    apiURL: 'https://auth.privy.io'
  }
);

// Cache for Privy users (1 hour cache)
const privyUsersCache: {
  users: User[] | null;
  timestamp: number;
} = {
  users: null,
  timestamp: 0
};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function getCachedPrivyUsers(): Promise<User[]> {
  const now = Date.now();
  
  // If cache is valid, return cached data
  if (privyUsersCache.users && (now - privyUsersCache.timestamp) < CACHE_DURATION) {
    console.log('Privy Sign-ins API: Using cached users data, count:', privyUsersCache.users.length);
    return privyUsersCache.users;
  }

  try {
    console.log('Privy Sign-ins API: Fetching fresh user data from Privy');
    const users = await privy.getUsers();
    console.log('Privy Sign-ins API: Fetched users count:', users.length);
    
    // Update cache
    privyUsersCache.users = users;
    privyUsersCache.timestamp = now;
    
    return users;
  } catch (error) {
    console.error('Privy Sign-ins API: Error fetching users from Privy:', error);
    
    // If cache exists but is expired, use it as fallback
    if (privyUsersCache.users) {
      console.log('Privy Sign-ins API: Using expired cache as fallback, count:', privyUsersCache.users.length);
      return privyUsersCache.users;
    }
    
    throw error;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const excludeTest = searchParams.get('excludeTest') === 'true';
    
    if (!start || !end) {
      return NextResponse.json({ error: 'start and end parameters are required' }, { status: 400 });
    }
    
    console.log('Privy Sign-ins API: Fetching sign-ins from', start, 'to', end, 'excludeTest:', excludeTest);
    
    // Get test emails if excluding test accounts
    let testEmailsList: string[] = [];
    if (excludeTest) {
      const { data: testEmailsData } = await supabaseAdmin
        .from('test_emails')
        .select('email');
      testEmailsList = testEmailsData?.map(item => item.email) || [];
      console.log('Privy Sign-ins API: Test emails from test_emails table:', testEmailsList);
    }
    
    // Get all Privy users
    const allUsers = await getCachedPrivyUsers();
    
    // Convert time period to Date objects
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Filter users who signed in during the specified time period
    const signedInUsers = allUsers.filter((user: User) => {
      if (!user.linkedAccounts || user.linkedAccounts.length === 0) {
        return false;
      }

      // Get the most recent verification time across all linked accounts
      const mostRecentActivity = user.linkedAccounts.reduce((latest, account) => {
        const verificationTime = account.latestVerifiedAt ? new Date(account.latestVerifiedAt) : new Date(0);
        return verificationTime > latest ? verificationTime : latest;
      }, new Date(0));

      // Check if the most recent activity falls within our time period
      return mostRecentActivity >= startDate && mostRecentActivity <= endDate;
    });

    console.log('Privy Sign-ins API: Users with sign-ins in period (before filtering):', signedInUsers.length);

    // Apply test email filtering if needed
    let filteredUsers = signedInUsers;
    if (excludeTest) {
      filteredUsers = signedInUsers.filter((user: User) => {
        // Check all linked accounts for test emails
        for (const account of user.linkedAccounts || []) {
          if (account.type === 'email') {
            const email = account.address;
            if (!email) continue;
            
            // Apply same filtering logic as other endpoints
            if (testEmailsList.includes(email)) return false;
            if (email.includes('@example.com')) return false;
            if (email.includes('+')) return false;
          }
        }
        return true;
      });
      
      console.log('Privy Sign-ins API: Users after filtering test accounts:', filteredUsers.length);
    }

    // Prepare user list for drill-down
    const userList = filteredUsers.map((user: User) => {
      const emailAccount = user.linkedAccounts?.find(account => account.type === 'email');
      const walletAccount = user.linkedAccounts?.find(account => account.type === 'wallet');
      
      // Get the most recent verification time
      const mostRecentActivity = user.linkedAccounts?.reduce((latest, account) => {
        const verificationTime = account.latestVerifiedAt ? new Date(account.latestVerifiedAt) : new Date(0);
        return verificationTime > latest ? verificationTime : latest;
      }, new Date(0));

      return {
        userId: user.id,
        email: emailAccount?.address || null,
        wallet: walletAccount?.address || null,
        signedInAt: mostRecentActivity?.toISOString() || null,
        verificationMethod: emailAccount ? 'email' : 'wallet'
      };
    });

    const result = {
      privySignins: filteredUsers.length,
      excludeTest,
      userList: userList.sort((a, b) => 
        new Date(b.signedInAt || 0).getTime() - new Date(a.signedInAt || 0).getTime()
      )
    };

    console.log('Privy Sign-ins API: Final result:', {
      privySignins: result.privySignins,
      excludeTest: result.excludeTest,
      userListLength: result.userList.length
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Privy Sign-ins API: Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch Privy sign-ins data',
      privySignins: 0,
      excludeTest: false,
      userList: []
    }, { status: 500 });
  }
} 