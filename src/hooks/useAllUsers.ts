/**
 * Hook to fetch all users (both active and inactive) for organization-user matching
 * This fetches users directly from account_emails table by domain, including those with zero activity
 */

import { useState, useEffect } from 'react';
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
      const [messageResponse, reportsResponse] = await Promise.all([
        fetch('/api/conversations/message-counts'),
        fetch('/api/conversations/leaderboard')
      ]);
      
      const messageData = await messageResponse.json();
      const reportsData = await reportsResponse.json();

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
            totalActivity: 0
          };
          existing.messages = row.message_count;
          existing.totalActivity = existing.messages + existing.reports;
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
            totalActivity: 0
          };
          existing.reports = row.segment_report_count;
          existing.totalActivity = existing.messages + existing.reports;
          userActivityMap.set(row.email, existing);
        });
      }

      // Fetch ALL users from account_emails table to include zero-activity users
      try {
        const allEmailsResponse = await fetch('/api/all-account-emails');
        
        if (allEmailsResponse.ok) {
          const allEmailsData = await allEmailsResponse.json();
          
          if (allEmailsData && Array.isArray(allEmailsData)) {
            // Add users from account_emails that aren't already in the activity map
            allEmailsData.forEach((row: { account_id: string; email: string }) => {
              const email = row.email;
              if (!isNotTestEmail(email)) return;
              
              // If user is not already in activity map, add them with zero activity
              if (!userActivityMap.has(email)) {
                userActivityMap.set(email, {
                  email: email,
                  messages: 0,
                  reports: 0,
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

      // Convert to array and include ALL users (including those with 0 activity)
      const usersArray = Array.from(userActivityMap.values())
        .sort((a, b) => b.totalActivity - a.totalActivity);
      
      return usersArray;

    } catch (fetchError) {
      console.error('❌ Error fetching all users:', fetchError);
      throw fetchError;
    }
  };

  const refreshData = async () => {
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
  };

  // Initial load
  useEffect(() => {
    refreshData();
  }, []);

  return {
    allUsers,
    loading,
    error,
    refreshData
  };
} 