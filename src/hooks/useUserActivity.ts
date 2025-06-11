/**
 * Hook to fetch user activity data for organization-user matching
 * Leverages existing leaderboard APIs to get user messages and reports
 */

import { useState, useEffect, useCallback } from 'react';
import { UserActivity } from '@/lib/userOrgMatcher';

interface UseUserActivityOptions {
  timeFilter?: string;
  excludeTestEmails?: boolean;
  refreshInterval?: number; // in milliseconds
}

interface UseUserActivityReturn {
  users: UserActivity[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

export function useUserActivity(options: UseUserActivityOptions = {}): UseUserActivityReturn {
  const {
    timeFilter = 'Month',
    excludeTestEmails = true,
    refreshInterval = 5 * 60 * 1000 // 5 minutes default
  } = options;

  const [users, setUsers] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Main data fetching function
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Function to fetch data from APIs (moved inside useCallback to fix dependency warning)
      const fetchUserActivity = async (): Promise<UserActivity[]> => {
        try {
          console.log('🔄 Fetching user activity data...');
          
          // Get date range for time filter
          const getDateRangeForFilter = (filter: string) => {
            const now = new Date();
            let start: string | null = null;
            
            switch (filter) {
              case 'Day':
                start = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
                break;
              case 'Week':
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
                break;
              case 'Month':
                start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                break;
              case 'All Time':
              default:
                start = null;
                break;
            }
            
            return { start, end: now.toISOString() };
          };

          const { start, end } = getDateRangeForFilter(timeFilter);

          // Fetch message counts
          let messageUrl = '/api/conversations/message-counts';
          if (start && end) {
            messageUrl += `?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`;
          }
          
          const messageResponse = await fetch(messageUrl);
          const messageData = await messageResponse.json();

          // Fetch segment report counts  
          let reportsUrl = '/api/conversations/leaderboard';
          if (start && end) {
            reportsUrl += `?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`;
          }
          
          const reportsResponse = await fetch(reportsUrl);
          const reportsData = await reportsResponse.json();

          // Get test emails if excluding them
          let testEmails: string[] = [];
          if (excludeTestEmails) {
            try {
              const testEmailsResponse = await fetch('/api/test-emails');
              const testEmailsData = await testEmailsResponse.json();
              testEmails = testEmailsData.testEmails || [];
            } catch (testError) {
              console.warn('Could not fetch test emails, proceeding without filtering:', testError);
            }
          }

          // Helper function to check if email should be excluded
          const isNotTestEmail = (email: string): boolean => {
            if (!email) return false;
            if (testEmails.includes(email)) return false;
            if (email.includes('@example.com')) return false;
            if (email.includes('+')) return false;
            return true;
          };

          // Create user activity map
          const userMap = new Map<string, UserActivity>();

          // Add message counts
          if (messageData && Array.isArray(messageData)) {
            messageData.forEach((row: { account_email: string; message_count: number }) => {
              if (!isNotTestEmail(row.account_email)) return;
              
              if (!userMap.has(row.account_email)) {
                userMap.set(row.account_email, {
                  email: row.account_email,
                  messages: 0,
                  reports: 0,
                  artists: 0,
                  totalActivity: 0
                });
              }
              
              const user = userMap.get(row.account_email)!;
              user.messages = row.message_count;
              user.totalActivity += row.message_count;
            });
          }

          // Add segment report counts
          if (reportsData?.segmentReports && Array.isArray(reportsData.segmentReports)) {
            reportsData.segmentReports.forEach((row: { email: string; segment_report_count: number }) => {
              if (!isNotTestEmail(row.email)) return;
              
              if (!userMap.has(row.email)) {
                userMap.set(row.email, {
                  email: row.email,
                  messages: 0,
                  reports: 0,
                  artists: 0,
                  totalActivity: 0
                });
              }
              
              const user = userMap.get(row.email)!;
              user.reports = row.segment_report_count;
              user.totalActivity += row.segment_report_count;
            });
          }

          // Convert to array and filter users with activity
          const usersArray = Array.from(userMap.values())
            .filter(user => user.totalActivity > 0)
            .sort((a, b) => b.totalActivity - a.totalActivity);

          console.log(`✅ Fetched ${usersArray.length} active users`);
          return usersArray;

        } catch (fetchError) {
          console.error('❌ Error fetching user activity:', fetchError);
          throw fetchError;
        }
      };
      
      const userData = await fetchUserActivity();
      setUsers(userData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user activity';
      setError(errorMessage);
      console.error('Error in useUserActivity:', err);
    } finally {
      setLoading(false);
    }
  }, [timeFilter, excludeTestEmails]);

  // Initial load and dependencies
  useEffect(() => {
    refreshData();
  }, [timeFilter, excludeTestEmails, refreshData]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refreshData]);

  return {
    users,
    loading,
    error,
    refreshData
  };
} 