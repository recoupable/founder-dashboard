/**
 * Hook to fetch all users (both active and inactive) for organization-user matching
 * This fetches users directly from account_emails table by domain, including those with zero activity
 */

import { useState, useEffect, useCallback } from 'react';
import { UserActivity } from '@/lib/userOrgMatcher';

interface UseAllUsersReturn {
  allUsers: UserActivity[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export function useAllUsers(): UseAllUsersReturn {
  const [allUsers, setAllUsers] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllUsers = async (): Promise<UserActivity[]> => {
    try {
      // Fetch activity data for users who have activity
      const [messageResponse, reportsResponse, artistCountsResponse] = await Promise.all([
        fetch('/api/conversations/message-counts'),
        fetch('/api/conversations/leaderboard'),
        fetch('/api/artist-counts')
      ]);
      
      const messageData = await messageResponse.json();
      const reportsData = await reportsResponse.json();
      const artistCountsData = await artistCountsResponse.json();

      // Get test emails for filtering
      let testEmails: string[] = [];
      try {
        const testEmailsResponse = await fetch('/api/test-emails');
        const testEmailsData = await testEmailsResponse.json();
        testEmails = testEmailsData.testEmails || [];
      } catch (testError) {
        console.warn('Could not fetch test emails, proceeding without filtering:', testError);
      }

      // Helper function to check if email should be excluded
      const isNotTestEmail = (email: string): boolean => {
        if (!email) return false;
        if (testEmails.includes(email)) return false;
        if (email.includes('@example.com')) return false;
        if (email.includes('+')) return false;
        return true;
      };

      // Create user activity map from activity APIs
      const userActivityMap = new Map<string, UserActivity>();

      // Add message counts
      if (messageData && Array.isArray(messageData)) {
        messageData.forEach((row: { account_email: string; message_count: number }) => {
          if (!isNotTestEmail(row.account_email)) {
            return;
          }
          
          const existing = userActivityMap.get(row.account_email) || {
            email: row.account_email,
            messages: 0,
            reports: 0,
            artists: 0,
            totalActivity: 0
          };
          existing.messages = row.message_count;
          existing.totalActivity = existing.messages + existing.reports + existing.artists;
          userActivityMap.set(row.account_email, existing);
        });
      }

      // Add segment report counts
      if (reportsData?.segmentReports && Array.isArray(reportsData.segmentReports)) {
        reportsData.segmentReports.forEach((row: { email: string; segment_report_count: number }) => {
          if (!isNotTestEmail(row.email)) {
            return;
          }
          
          const existing = userActivityMap.get(row.email) || {
            email: row.email,
            messages: 0,
            reports: 0,
            artists: 0,
            totalActivity: 0
          };
          existing.reports = row.segment_report_count;
          existing.totalActivity = existing.messages + existing.reports + existing.artists;
          userActivityMap.set(row.email, existing);
        });
      }

      // Fetch ALL users from account_emails table to include zero-activity users
      const emailToAccountMap = new Map<string, string>();
      try {
        const allEmailsResponse = await fetch('/api/all-account-emails');
        
        if (allEmailsResponse.ok) {
          const allEmailsData = await allEmailsResponse.json();
          
          if (allEmailsData && Array.isArray(allEmailsData)) {
            // Create mapping of email to account_id and add users with zero activity
            allEmailsData.forEach((row: { account_id: string; email: string }) => {
              const email = row.email;
              if (!isNotTestEmail(email)) return;
              
              // Map email to account_id for artist count lookup
              emailToAccountMap.set(email, row.account_id);
              
              // If user is not already in activity map, add them with zero activity
              if (!userActivityMap.has(email)) {
                userActivityMap.set(email, {
                  email: email,
                  messages: 0,
                  reports: 0,
                  artists: 0,
                  totalActivity: 0
                });
              }
            });
          }
        } else {
          console.warn('Could not fetch all account emails, falling back to activity-only users');
        }
      } catch (allEmailsError) {
        console.warn('Error fetching all account emails:', allEmailsError);
      }

      // Add artist counts
      if (artistCountsData && Array.isArray(artistCountsData)) {
        // Create a map of account_id to artist_count
        const artistCountMap = new Map<string, number>();
        artistCountsData.forEach((row: { account_id: string; artist_count: number }) => {
          artistCountMap.set(row.account_id, row.artist_count);
        });

        // Match artist counts to users by account_id
        userActivityMap.forEach((user, email) => {
          const accountId = emailToAccountMap.get(email);
          if (accountId && artistCountMap.has(accountId)) {
            const artistCount = artistCountMap.get(accountId) || 0;
            user.artists = artistCount;
            user.totalActivity = user.messages + user.reports + user.artists;
          }
        });
      }

      // Convert to array and include ALL users (including those with 0 activity)
      const usersArray = Array.from(userActivityMap.values())
        .sort((a, b) => b.totalActivity - a.totalActivity);
      
      return usersArray;

    } catch (fetchError) {
      console.error('❌ Error fetching all users:', fetchError);
      throw fetchError;
    }
  };

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userData = await fetchAllUsers();
      setAllUsers(userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch all users';
      setError(errorMessage);
      console.error('Error in useAllUsers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    allUsers,
    loading,
    error,
    refreshData
  };
} 