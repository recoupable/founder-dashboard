'use client';

import React, { useState, useEffect } from 'react';
import { conversationService } from '@/lib/conversationService';
import type { ConversationListItem, ConversationDetail, ConversationFilters } from '@/lib/conversationService';
import ReactMarkdown from 'react-markdown';
import parse from 'html-react-parser';
import DOMPurify from 'dompurify';
import { MagnifyingGlassIcon, CogIcon, CalendarIcon, ChatBubbleLeftRightIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';
import { createClient } from '@supabase/supabase-js';

// Custom Switch component with proper TypeScript types
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

// Combined type for conversation with detail
interface ConversationWithDetail extends ConversationListItem {
  detail: ConversationDetail | null;
  messageCount?: number;
}

function Switch({ checked, onChange, className, children }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked="false"
      className={className}
      onClick={() => onChange(!checked)}
    >
      {children}
    </button>
  );
}

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [excludeTestEmails, setExcludeTestEmails] = useState(false);
  const [timeFilter, setTimeFilter] = useState('All Time');
  
  // Test email management state
  const [showTestEmailPopup, setShowTestEmailPopup] = useState(false);
  const [testEmails, setTestEmails] = useState<string[]>([]);
  const [newTestEmail, setNewTestEmail] = useState('');
  const [isLoadingTestEmails, setIsLoadingTestEmails] = useState(false);
  const [testEmailError, setTestEmailError] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [conversationDetail, setConversationDetail] = useState<ConversationDetail | null>(null);
  
  // Segment report counts state
  const [segmentReportCounts, setSegmentReportCounts] = useState({ today: 0, week: 0, month: 0, prevDay: 0, prevWeek: 0, prevMonth: 0 });

  type SegmentReport = { id: string; account_email: string; created_at: string };
  const [segmentReports, setSegmentReports] = React.useState<SegmentReport[]>([]);
  const [messagesByUser, setMessagesByUser] = useState<Record<string, number>>({});

  // Add state for segmentReportsByUser
  const [segmentReportsByUser, setSegmentReportsByUser] = useState<Record<string, number>>({});

  React.useEffect(() => {
    async function fetchReports() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) return;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase
        .from('segment_reports')
        .select('id, account_email, created_at');
      if (!error && data) setSegmentReports(data);
    }
    fetchReports();
  }, []);

  // Listen for data source updates
  useEffect(() => {
    const handleDataSourceUpdate = (event: CustomEvent) => {
      console.log('Data source update:', event.detail);
      // We're no longer updating debugInfo since it's not being displayed
    };
    
    // Add event listener
    window.addEventListener('data-source-update', handleDataSourceUpdate as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('data-source-update', handleDataSourceUpdate as EventListener);
    };
  }, []);
    
  // Load conversations when filters change
  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const filters: ConversationFilters = {
          searchQuery,
          excludeTestEmails,
          timeFilter
        };
        
        console.log('Fetching conversations with filters:', filters);
        
        // Add event listener to capture console logs about data source
        const originalConsoleLog = console.log;
        console.log = function(...args) {
          originalConsoleLog.apply(console, args);
        };
        
        const result = await conversationService.getConversationList(filters);
        
        // Restore original console.log
        console.log = originalConsoleLog;
        
        setConversations(result);
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError('Failed to load conversations. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadConversations();
  }, [searchQuery, excludeTestEmails, timeFilter]);
  
  // Load conversation detail when selection changes
  useEffect(() => {
    const loadConversationDetail = async () => {
      if (!selectedConversation) {
        setConversationDetail(null);
        return;
      }
      
      try {
        const result = await conversationService.getConversationDetail(selectedConversation);
        setConversationDetail(result);
      } catch (err) {
        console.error('Failed to load conversation detail:', err);
        setError('Failed to load conversation details. Please try again.');
      }
    };
    
    loadConversationDetail();
  }, [selectedConversation]);

  // Load test emails from Supabase when the popup is opened
  useEffect(() => {
    if (showTestEmailPopup) {
      fetchTestEmails();
    }
  }, [showTestEmailPopup]);

  // Also load test emails on initial page load
  useEffect(() => {
    fetchTestEmails();
  }, []);

  // Fetch test emails from the API
  const fetchTestEmails = async () => {
    try {
      setIsLoadingTestEmails(true);
      setTestEmailError(null);
      
      const response = await fetch('/api/test-emails');
      
      if (!response.ok) {
        throw new Error(`Error fetching test emails: ${response.status}`);
      }
      
      const data = await response.json();
      setTestEmails(data.emails || []);
    } catch (err) {
      console.error('Failed to load test emails:', err);
      setTestEmailError('Failed to load test emails. Please try again.');
      
      // Fallback to localStorage if API fails
      const savedEmails = localStorage.getItem('testEmails');
      if (savedEmails) {
        try {
          setTestEmails(JSON.parse(savedEmails));
        } catch (parseErr) {
          console.error('Failed to parse stored test emails:', parseErr);
        }
      }
    } finally {
      setIsLoadingTestEmails(false);
    }
  };

  // Handle adding a new test email
  const addTestEmail = async () => {
    if (!newTestEmail) return;
    
    try {
      setIsLoadingTestEmails(true);
      setTestEmailError(null);
      
      const response = await fetch('/api/test-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: newTestEmail }),
      });
      
      if (!response.ok) {
        throw new Error(`Error adding test email: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.added) {
        // Only update the list if the email was actually added
        setTestEmails([...testEmails, newTestEmail]);
      }
      
      // Reset the input field
      setNewTestEmail('');
      
      // Refresh the list to ensure it's up to date
      fetchTestEmails();
    } catch (err) {
      console.error('Failed to add test email:', err);
      setTestEmailError('Failed to add test email. Please try again.');
      
      // Fallback to localStorage if API fails
      if (!testEmails.includes(newTestEmail)) {
        const updatedEmails = [...testEmails, newTestEmail];
        setTestEmails(updatedEmails);
        localStorage.setItem('testEmails', JSON.stringify(updatedEmails));
        setNewTestEmail('');
      }
    } finally {
      setIsLoadingTestEmails(false);
    }
  };

  // Handle removing a test email
  const removeTestEmail = async (email: string) => {
    try {
      setIsLoadingTestEmails(true);
      setTestEmailError(null);
      
      const response = await fetch(`/api/test-emails?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Error removing test email: ${response.status}`);
      }
      
      // Update the local state
      setTestEmails(testEmails.filter(e => e !== email));
    } catch (err) {
      console.error('Failed to remove test email:', err);
      setTestEmailError('Failed to remove test email. Please try again.');
      
      // Fallback to localStorage if API fails
      const updatedEmails = testEmails.filter(e => e !== email);
      setTestEmails(updatedEmails);
      localStorage.setItem('testEmails', JSON.stringify(updatedEmails));
    } finally {
      setIsLoadingTestEmails(false);
    }
  };

  // Only filter out test emails for the summary cards
  const testEmailFilteredConversations = conversations.filter(conv => {
    if (testEmails.includes(conv.account_email)) return false;
    if (conv.account_email.includes('@example.com')) return false;
    if (conv.account_email.includes('+')) return false;
    return true;
  });

  // Filter conversations based on time filter and test emails
  const timeFilteredConversations = conversations.filter(conv => {
    if (timeFilter === 'All Time') return true;
    const now = new Date();
    const filterDate = new Date();
    switch (timeFilter) {
      case 'Last 7 Days':
        filterDate.setDate(now.getDate() - 7);
        break;
      case 'Last 30 Days':
        filterDate.setDate(now.getDate() - 30);
        break;
      case 'Last 90 Days':
        filterDate.setDate(now.getDate() - 90);
        break;
      default:
        return true;
    }
    return new Date(conv.created_at) >= filterDate;
  });

  const filteredConversations = excludeTestEmails
    ? timeFilteredConversations.filter(conv => {
        if (testEmails.includes(conv.account_email)) return false;
        if (conv.account_email.includes('@example.com')) return false;
        if (conv.account_email.includes('+')) return false;
        return true;
      })
    : timeFilteredConversations;

  useEffect(() => {
    async function fetchSegmentReportCounts() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Supabase environment variables are not set.');
        return;
      }
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfToday.getDate() - 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const startOfPrevWeek = new Date(startOfWeek);
      startOfPrevWeek.setDate(startOfWeek.getDate() - 7);
      const endOfPrevWeek = new Date(startOfWeek);
      endOfPrevWeek.setMilliseconds(-1);
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Log date ranges for debugging
      console.log('Segment Report Date Ranges:');
      console.log('Today:', startOfToday.toISOString());
      console.log('Yesterday:', startOfYesterday.toISOString(), 'to', startOfToday.toISOString());
      console.log('This Week:', startOfWeek.toISOString());
      console.log('Prev Week:', startOfPrevWeek.toISOString(), 'to', startOfWeek.toISOString());
      console.log('This Month:', startOfMonth.toISOString());
      console.log('Prev Month:', startOfPrevMonth.toISOString(), 'to', startOfMonth.toISOString());

      // Today
      const todayRes = await supabase
        .from('segment_reports')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', startOfToday.toISOString());
      const todayCount = todayRes.count;
      console.log('[SegmentReports] Today query result:', todayRes);
      // Yesterday
      const prevDayRes = await supabase
        .from('segment_reports')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', startOfYesterday.toISOString())
        .lt('updated_at', startOfToday.toISOString());
      const prevDayCount = prevDayRes.count;
      console.log('[SegmentReports] Yesterday query result:', prevDayRes);
      // This week
      const weekRes = await supabase
        .from('segment_reports')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', startOfWeek.toISOString());
      const weekCount = weekRes.count;
      console.log('[SegmentReports] This week query result:', weekRes);
      // Previous week
      const prevWeekRes = await supabase
        .from('segment_reports')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', startOfPrevWeek.toISOString())
        .lt('updated_at', startOfWeek.toISOString());
      const prevWeekCount = prevWeekRes.count;
      console.log('[SegmentReports] Prev week query result:', prevWeekRes);
      // This month
      const monthRes = await supabase
        .from('segment_reports')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', startOfMonth.toISOString());
      const monthCount = monthRes.count;
      console.log('[SegmentReports] This month query result:', monthRes);
      // Previous month
      const prevMonthRes = await supabase
        .from('segment_reports')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', startOfPrevMonth.toISOString())
        .lt('updated_at', startOfMonth.toISOString());
      const prevMonthCount = prevMonthRes.count;
      console.log('[SegmentReports] Prev month query result:', prevMonthRes);

      // Log final values for percent change
      console.log('[SegmentReports] Final counts for percent change:', {
        today: todayCount, prevDay: prevDayCount,
        week: weekCount, prevWeek: prevWeekCount,
        month: monthCount, prevMonth: prevMonthCount
      });

      setSegmentReportCounts({
        today: todayCount || 0,
        week: weekCount || 0,
        month: monthCount || 0,
        prevDay: prevDayCount || 0,
        prevWeek: prevWeekCount || 0,
        prevMonth: prevMonthCount || 0,
      });
    }
    fetchSegmentReportCounts();
  }, []);

  // Fetch message counts from the API on mount
  useEffect(() => {
    fetch('/api/conversations/message-counts')
      .then(res => res.json())
      .then((data: { account_email: string, message_count: number }[]) => {
        const map: Record<string, number> = {};
        for (const row of data) {
          map[row.account_email] = row.message_count;
        }
        setMessagesByUser(map);
      });
  }, []);

  // Fetch segment report counts from the API on mount
  useEffect(() => {
    fetch('/api/conversations/leaderboard')
      .then(res => res.json())
      .then((data: { segmentReports: { email: string, segment_report_count: number }[] }) => {
        const map: Record<string, number> = {};
        if (data.segmentReports) {
          for (const row of data.segmentReports) {
            map[row.email] = row.segment_report_count;
          }
        }
        setSegmentReportsByUser(map);
      });
  }, []);

  // Helper for percent change
  function getPercentChange(current: number, previous: number) {
    if (previous === 0 && current > 0) return 'N/A';
    if (previous === 0 && current === 0) return '0%';
    return `${(((current - previous) / previous) * 100).toFixed(0)}%`;
  }
  function getArrowAndColor(current: number, previous: number) {
    if (previous === 0) return { arrow: '', color: 'text-gray-400' };
    if (current > previous) return { arrow: '▲', color: 'text-green-600' };
    if (current < previous) return { arrow: '▼', color: 'text-red-600' };
    return { arrow: '', color: 'text-gray-500' };
  }

  return (
    <main className="p-4 sm:p-8">
      {/* Test Email Popup */}
      {showTestEmailPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Manage Test Emails</h2>
              <button 
                onClick={() => setShowTestEmailPopup(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            {testEmailError && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
                {testEmailError}
              </div>
            )}
            
            <div className="mb-4">
              <label htmlFor="test-email" className="block text-sm font-medium text-gray-700 mb-1">
                Add Test Email
              </label>
              <div className="flex">
                <input
                  id="test-email"
                  type="email"
                  className="flex-1 p-2 border rounded-l-md"
                  placeholder="email@example.com"
                  value={newTestEmail}
                  onChange={(e) => setNewTestEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTestEmail()}
                />
                <button
                  onClick={addTestEmail}
                  className="bg-blue-600 text-white px-4 py-2 rounded-r-md hover:bg-blue-700 disabled:bg-blue-300"
                  disabled={isLoadingTestEmails || !newTestEmail}
                >
                  Add
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Current Test Emails</h3>
              {isLoadingTestEmails ? (
                <p className="text-gray-500 text-sm">Loading test emails...</p>
              ) : testEmails.length === 0 ? (
                <p className="text-gray-500 text-sm">No test emails added yet.</p>
              ) : (
                <ul className="divide-y">
                  {testEmails.map((email) => (
                    <li key={email} className="py-2 flex justify-between items-center">
                      <span>{email}</span>
                      <button
                        onClick={() => removeTestEmail(email)}
                        className="text-red-600 hover:text-red-800 text-sm disabled:text-red-300"
                        disabled={isLoadingTestEmails}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">User Conversations</h1>

        {/* Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
          {/* Conversations Today */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl shadow-md p-6 flex flex-col items-start transition-transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center mb-2">
              <span className="text-blue-600 mr-2">
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-blue-700">Conversations Today</span>
            </div>
            <div className="text-4xl font-extrabold text-blue-900 mb-1">{(() => {
              const now = new Date();
              const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              return testEmailFilteredConversations.filter(conv => new Date(conv.created_at) >= startOfToday).length;
            })()}</div>
            <div className="text-xs text-blue-500 mb-2">Created since midnight</div>
          </div>
          {/* Conversations This Week */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl shadow-md p-6 flex flex-col items-start transition-transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center mb-2">
              <span className="text-green-600 mr-2">
                <CalendarIcon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-green-700">Conversations This Week</span>
            </div>
            <div className="text-4xl font-extrabold text-green-900 mb-1">{(() => {
              const now = new Date();
              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - now.getDay());
              startOfWeek.setHours(0, 0, 0, 0);
              return testEmailFilteredConversations.filter(conv => new Date(conv.created_at) >= startOfWeek).length;
            })()}</div>
            <div className="text-xs text-green-500 mb-2">Since Sunday</div>
            <div className="flex items-center text-xs">
              {(() => {
                const now = new Date();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                const prevWeekStart = new Date(startOfWeek);
                prevWeekStart.setDate(startOfWeek.getDate() - 7);
                const prevWeekEnd = new Date(startOfWeek.getTime() - 1);
                const curr = testEmailFilteredConversations.filter(conv => new Date(conv.created_at) >= startOfWeek).length;
                const prev = testEmailFilteredConversations.filter(conv => {
                  const created = new Date(conv.created_at);
                  return created >= prevWeekStart && created <= prevWeekEnd;
                }).length;
                let percent = null;
                if (prev === 0 && curr > 0) percent = 'N/A';
                else if (prev === 0 && curr === 0) percent = '0%';
                else percent = `${(((curr - prev) / prev) * 100).toFixed(0)}%`;
                const isUp = prev !== 0 && curr > prev;
                const isDown = prev !== 0 && curr < prev;
                return (
                  <>
                    {isUp && <span className="text-green-600 font-bold mr-1">▲</span>}
                    {isDown && <span className="text-red-600 font-bold mr-1">▼</span>}
                    <span className={isUp ? 'text-green-600 font-bold' : isDown ? 'text-red-600 font-bold' : 'text-gray-500'}>{percent}</span>
                    <span className="ml-1 text-gray-400">from last week</span>
                  </>
                );
              })()}
            </div>
          </div>
          {/* Conversations This Month */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl shadow-md p-6 flex flex-col items-start transition-transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center mb-2">
              <span className="text-yellow-600 mr-2">
                <CalendarIcon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-yellow-700">Conversations This Month</span>
            </div>
            <div className="text-4xl font-extrabold text-yellow-900 mb-1">{(() => {
              const now = new Date();
              const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
              return testEmailFilteredConversations.filter(conv => new Date(conv.created_at) >= startOfMonth).length;
            })()}</div>
            <div className="text-xs text-yellow-500 mb-2">Since 1st of month</div>
            <div className="flex items-center text-xs">
              {(() => {
                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const curr = testEmailFilteredConversations.filter(conv => new Date(conv.created_at) >= startOfMonth).length;
                const prev = testEmailFilteredConversations.filter(conv => {
                  const created = new Date(conv.created_at);
                  return created >= prevMonth && created <= new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 30);
                }).length;
                let percent = null;
                if (prev === 0 && curr > 0) percent = 'N/A';
                else if (prev === 0 && curr === 0) percent = '0%';
                else percent = `${(((curr - prev) / prev) * 100).toFixed(0)}%`;
                const isUp = prev !== 0 && curr > prev;
                const isDown = prev !== 0 && curr < prev;
                return (
                  <>
                    {isUp && <span className="text-green-600 font-bold mr-1">▲</span>}
                    {isDown && <span className="text-red-600 font-bold mr-1">▼</span>}
                    <span className={isUp ? 'text-green-600 font-bold' : isDown ? 'text-red-600 font-bold' : 'text-gray-500'}>{percent}</span>
                    <span className="ml-1 text-gray-400">from last month</span>
                  </>
                );
              })()}
            </div>
          </div>
          {/* Segment Reports Today */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl shadow-md p-6 flex flex-col items-start transition-transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center mb-2">
              <span className="text-purple-600 mr-2">
                <DocumentChartBarIcon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-purple-700">Segment Reports Today</span>
            </div>
            <div className="text-4xl font-extrabold text-purple-900 mb-1">{segmentReportCounts.today}</div>
            <div className="text-xs text-purple-500 mb-2">Created since midnight</div>
            <div className="flex items-center text-xs">
              {getPercentChange(segmentReportCounts.today, segmentReportCounts.prevDay) === 'N/A' ? (
                <span className="text-gray-400">N/A</span>
              ) : (
                <>
                  {getArrowAndColor(segmentReportCounts.today, segmentReportCounts.prevDay).arrow && (
                    <span className={`${getArrowAndColor(segmentReportCounts.today, segmentReportCounts.prevDay).color} font-bold mr-1`}>
                      {getArrowAndColor(segmentReportCounts.today, segmentReportCounts.prevDay).arrow}
                    </span>
                  )}
                  <span className={`${getArrowAndColor(segmentReportCounts.today, segmentReportCounts.prevDay).color} font-bold`}>
                    {getPercentChange(segmentReportCounts.today, segmentReportCounts.prevDay)}
                  </span>
                  <span className="ml-1 text-gray-400">from yesterday</span>
                </>
              )}
            </div>
          </div>
          {/* Segment Reports This Week */}
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200 rounded-2xl shadow-md p-6 flex flex-col items-start transition-transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center mb-2">
              <span className="text-pink-600 mr-2">
                <DocumentChartBarIcon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-pink-700">Segment Reports This Week</span>
            </div>
            <div className="text-4xl font-extrabold text-pink-900 mb-1">{segmentReportCounts.week}</div>
            <div className="text-xs text-pink-500 mb-2">Since Sunday</div>
            <div className="flex items-center text-xs">
              {getPercentChange(segmentReportCounts.week, segmentReportCounts.prevWeek) === 'N/A' ? (
                <span className="text-gray-400">N/A</span>
              ) : (
                <>
                  {getArrowAndColor(segmentReportCounts.week, segmentReportCounts.prevWeek).arrow && (
                    <span className={`${getArrowAndColor(segmentReportCounts.week, segmentReportCounts.prevWeek).color} font-bold mr-1`}>
                      {getArrowAndColor(segmentReportCounts.week, segmentReportCounts.prevWeek).arrow}
                    </span>
                  )}
                  <span className={`${getArrowAndColor(segmentReportCounts.week, segmentReportCounts.prevWeek).color} font-bold`}>
                    {getPercentChange(segmentReportCounts.week, segmentReportCounts.prevWeek)}
                  </span>
                  <span className="ml-1 text-gray-400">from last week</span>
                </>
              )}
            </div>
          </div>
          {/* Segment Reports This Month */}
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl shadow-md p-6 flex flex-col items-start transition-transform hover:scale-105 hover:shadow-lg">
            <div className="flex items-center mb-2">
              <span className="text-orange-600 mr-2">
                <DocumentChartBarIcon className="h-6 w-6" />
              </span>
              <span className="text-sm font-semibold text-orange-700">Segment Reports This Month</span>
            </div>
            <div className="text-4xl font-extrabold text-orange-900 mb-1">{segmentReportCounts.month}</div>
            <div className="text-xs text-orange-500 mb-2">Since 1st of month</div>
            <div className="flex items-center text-xs">
              {getPercentChange(segmentReportCounts.month, segmentReportCounts.prevMonth) === 'N/A' ? (
                <span className="text-gray-400">N/A</span>
              ) : (
                <>
                  {getArrowAndColor(segmentReportCounts.month, segmentReportCounts.prevMonth).arrow && (
                    <span className={`${getArrowAndColor(segmentReportCounts.month, segmentReportCounts.prevMonth).color} font-bold mr-1`}>
                      {getArrowAndColor(segmentReportCounts.month, segmentReportCounts.prevMonth).arrow}
                    </span>
                  )}
                  <span className={`${getArrowAndColor(segmentReportCounts.month, segmentReportCounts.prevMonth).color} font-bold`}>
                    {getPercentChange(segmentReportCounts.month, segmentReportCounts.prevMonth)}
                  </span>
                  <span className="ml-1 text-gray-400">from last month</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* User Leaderboard (Monthly) */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">User Leaderboard (This Month)</h2>
          {(() => {
            // Get start of current month
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            // Helper: filter out test emails
            const isNotTestEmail = (email: string): boolean => {
              if (!email) return false;
              if (testEmails.includes(email)) return false;
              if (email.includes('@example.com')) return false;
              if (email.includes('+')) return false;
              return true;
            };
            // 1. Aggregate rooms created this month by user
            const roomsByUser: Record<string, number> = {};
            for (const conv of testEmailFilteredConversations) {
              const email = conv.account_email;
              if (!isNotTestEmail(email)) continue;
              const created = new Date(conv.created_at);
              if (created >= startOfMonth) {
                roomsByUser[email] = (roomsByUser[email] || 0) + 1;
              }
            }
            // 2. Aggregate messages sent this month by user
            // Use the messagesByUser state instead
            // 3. Aggregate segment reports generated this month by user
            const reportsByUser: Record<string, number> = {};
            for (const report of segmentReports) {
              const email = report.account_email;
              if (!isNotTestEmail(email)) continue;
              const created = new Date(report.created_at);
              if (created >= startOfMonth) {
                reportsByUser[email] = (reportsByUser[email] || 0) + 1;
              }
            }
            // 4. Combine scores
            const allUsers = new Set([
              ...Object.keys(roomsByUser),
              ...Object.keys(messagesByUser),
              ...Object.keys(reportsByUser)
            ]);
            const leaderboard = Array.from(allUsers)
              .filter(isNotTestEmail)
              .map(email => {
                return {
                  email,
                  rooms: roomsByUser[email] || 0,
                  messages: messagesByUser[email] || 0,
                  reports: segmentReportsByUser[email] || 0,
                  score: (roomsByUser[email] || 0) + (messagesByUser[email] || 0) + (segmentReportsByUser[email] || 0)
                };
              })
              .filter(u => u.score > 0);
            leaderboard.sort((a, b) => b.score - a.score);
            return (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-2 text-left font-semibold">User Email</th>
                      <th className="px-4 py-2 text-center font-semibold">Messages</th>
                      <th className="px-4 py-2 text-center font-semibold">Rooms Created</th>
                      <th className="px-4 py-2 text-center font-semibold">Segment Reports</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((user, idx) => (
                      <tr key={user.email} className={idx < 3 ? 'bg-yellow-50' : ''}>
                        <td className="px-4 py-2 font-mono text-xs sm:text-sm">{user.email}</td>
                        <td className="px-4 py-2 text-center">{user.messages}</td>
                        <td className="px-4 py-2 text-center">{user.rooms}</td>
                        <td className="px-4 py-2 text-center">{user.reports}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {leaderboard.length === 0 && (
                  <div className="text-center text-gray-400 py-8">No user activity this month yet.</div>
                )}
              </div>
            );
          })()}
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left panel - Conversation List */}
          <div className="w-full lg:w-2/5 bg-white rounded-lg shadow-sm p-4 border">
            <div className="flex-1 overflow-auto pr-4">
              {/* Conversation list header */}
              <div className="flex justify-between items-center mb-4">
                <div className="text-lg font-bold">Rooms</div>
                <div className="flex space-x-2">
                  <div className="text-sm bg-gray-100 px-2 py-1 rounded-md">
                    {filteredConversations.length} rooms
                  </div>
                  <div className="text-sm bg-gray-100 px-2 py-1 rounded-md">
                    {new Set(filteredConversations.map(conv => conv.account_email)).size} users
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        // Show loading indicator
                        setLoading(true);
                        
                        // First, create headers for our CSV
                        const headers = [
                          'Room ID',
                          'Account Email',
                          'Account Name',
                          'Artist Name',
                          'Topic',
                          'Created At',
                          'Last Message Date',
                          'Message Count',
                          'Conversation'
                        ];
                        
                        // Fetch conversation details for all rooms
                        const conversationDetails: ConversationWithDetail[] = await Promise.all(
                          filteredConversations.map(async (conv) => {
                            try {
                              const detail = await conversationService.getConversationDetail(conv.room_id);
                              return {
                                ...conv,
                                detail
                              };
                            } catch (err: unknown) {
                              console.error(`Error fetching details for room ${conv.room_id}:`, err);
                              return {
                                ...conv,
                                detail: null
                              };
                            }
                          })
                        );
                        
                        // Create CSV rows
                        const csvRows = [
                          headers.join(','), // Header row
                          ...conversationDetails.map(conv => {
                            // Process the messages if available
                            let conversationText = '';
                            
                            if (conv.detail && conv.detail.messages) {
                              conversationText = conv.detail.messages
                                .map(msg => {
                                  // Format as: Role (Time): Content
                                  const timestamp = new Date(msg.created_at).toLocaleString();
                                  return `${msg.role.toUpperCase()} (${timestamp}): ${msg.content.replace(/"/g, '""').replace(/\n/g, ' ')}`;
                                })
                                .join('\n');
                            }
                            
                            // Format each conversation as a CSV row
                            const values = [
                              conv.room_id,
                              `"${conv.account_email.replace(/"/g, '""')}"`, // Escape quotes in email addresses
                              `"${(conv.account_name || '').replace(/"/g, '""')}"`,
                              `"${(conv.artist_name || '').replace(/"/g, '""')}"`,
                              `"${(conv.topic || '').replace(/"/g, '""')}"`,
                              conv.created_at ? new Date(conv.created_at).toISOString() : '',
                              conv.last_message_date ? new Date(conv.last_message_date).toISOString() : '',
                              // Safe access to messageCount with fallback
                              conv.messageCount || conv.detail?.messages?.length || 0,
                              `"${conversationText.replace(/"/g, '""')}"`
                            ];
                            return values.join(',');
                          })
                        ];

                        const csvContent = csvRows.join('\n');
                        
                        // Create a blob and trigger download
                        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `all-conversations-with-messages-${new Date().toISOString().split('T')[0]}.csv`;
                        
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      } catch (error: unknown) {
                        console.error("Error exporting conversations:", error);
                        alert("There was an error exporting conversations. See console for details.");
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-sm bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded-md"
                    disabled={loading}
                  >
                    {loading ? "Exporting..." : "Export All to CSV"}
                  </button>
                </div>
              </div>
              
              {/* Search and filter controls */}
              <div className="mb-4">
                <div className="relative mb-2">
                  <input
                    type="text"
                    placeholder="Search by email or artist"
                    className="w-full p-2 pr-10 border rounded-md"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <select
                    className="p-2 border rounded-md"
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    aria-label="Time filter"
                  >
                    <option>All Time</option>
                    <option>Last 30 Days</option>
                    <option>Last 7 Days</option>
                    <option>Last 90 Days</option>
                  </select>
                  
                  <div className="flex items-center">
                    <span className="mr-2 text-sm">Exclude test emails</span>
                    <Switch
                      checked={excludeTestEmails}
                      onChange={setExcludeTestEmails}
                      className={`${
                        excludeTestEmails ? 'bg-blue-600' : 'bg-gray-200'
                      } relative inline-flex h-6 w-11 items-center rounded-full`}
                    >
                      <span className="sr-only">Exclude test emails</span>
                      <span
                        className={`${
                          excludeTestEmails ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                      />
                    </Switch>
                    <button 
                      onClick={() => setShowTestEmailPopup(true)}
                      className="ml-2 p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                      title="Manage test emails"
                    >
                      <CogIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Conversation list */}
              <div className="space-y-2">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading conversations...
                  </div>
                ) : error ? (
                  <div className="text-center py-8 text-red-500">
                    {error}
                  </div>
                ) : filteredConversations.length > 0 ? (
                  filteredConversations.map((conversation) => (
                    <button
                      key={conversation.room_id}
                      className={`w-full text-left p-4 rounded-md transition-colors ${
                        selectedConversation === conversation.room_id
                          ? 'bg-blue-100'
                          : 'bg-white hover:bg-gray-100'
                      }`}
                      onClick={() => setSelectedConversation(conversation.room_id)}
                    >
                      <div className="font-medium">
                        {conversation.account_email}
                      </div>
                      <div className="text-sm text-gray-500">
                        Artist: {conversation.artist_name || conversation.artist_reference}
                      </div>
                      {conversation.topic ? (
                        <div className="text-sm text-gray-500">
                          Topic: {conversation.topic}
                        </div>
                      ) : conversation.account_name && (
                        <div className="text-sm text-gray-500">
                          Account: {conversation.account_name}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 flex justify-between mt-1">
                        <span>
                          Created: {conversation.created_at 
                            ? new Date(conversation.created_at).toLocaleString() 
                            : 'Invalid Date'}
                        </span>
                        <span>
                          Last message: {conversation.last_message_date 
                            ? new Date(conversation.last_message_date).toLocaleString() 
                            : 'Invalid Date'}
                        </span>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No conversations found
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right panel - Conversation Detail */}
          <div className="w-full lg:w-3/5 bg-white rounded-lg shadow-sm p-4 border">
            {conversationDetail ? (
              <>
                <div className="mb-4 pb-3 border-b">
                  <h2 className="text-xl font-semibold">{conversationDetail.account_email}</h2>
                  <p className="text-sm text-gray-600">
                    Artist: {conversationDetail.artist_name || conversationDetail.artist_reference}
                  </p>
                  {conversationDetail.account_name && (
                    <p className="text-sm text-gray-600 mb-1">Account: {conversationDetail.account_name}</p>
                  )}
                  {conversationDetail.topic && (
                    <p className="text-gray-600">
                      Topic: {conversationDetail.topic}
                    </p>
                  )}
                  <div className="flex justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        // Create a JSON blob
                        const jsonData = JSON.stringify(conversationDetail, null, 2);
                        const blob = new Blob([jsonData], { type: 'application/json' });
                        
                        // Create download link
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `conversation-${conversationDetail.room_id}.json`;
                        
                        // Trigger download
                        document.body.appendChild(a);
                        a.click();
                        
                        // Cleanup
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md"
                    >
                      Export JSON
                    </button>
                  </div>
                </div>
                
                <div className="overflow-y-auto max-h-[calc(100vh-250px)] space-y-4">
                  {conversationDetail.messages.map((message) => (
                    message.role === 'report' ? (
                      <div
                        key={message.id}
                        className="p-4 bg-yellow-100 border-l-4 border-yellow-400 rounded shadow-sm mb-4"
                      >
                        <div className="font-bold mb-2 text-yellow-800">Segment Report</div>
                        <div className="whitespace-pre-line text-gray-800">{message.content}</div>
                        <div className="text-xs text-gray-500 mt-2 text-right">
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                          {' '}
                          {new Date(message.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    ) : (
                      <div
                        key={message.id}
                        className={`p-3 rounded-lg max-w-[85%] ${
                          message.role === 'user'
                            ? 'bg-blue-50 ml-auto'
                            : 'bg-white border'
                        }`}
                      >
                        <div className="text-gray-800 markdown-content">
                          {message.content.includes('<') && message.content.includes('</') ? (
                            // Content appears to be HTML, render it safely
                            parse(DOMPurify.sanitize(message.content))
                          ) : (
                            // Regular text or markdown, use ReactMarkdown
                            <ReactMarkdown>{message.content}</ReactMarkdown>
                          )}
                        </div>
                        {message.reasoning && message.role === 'assistant' && (
                          <details className="mt-2 text-sm">
                            <summary className="text-xs text-blue-600 cursor-pointer hover:text-blue-800">
                              View reasoning
                            </summary>
                            <div className="mt-1 p-2 bg-gray-50 rounded border text-gray-700 whitespace-pre-wrap">
                              <ReactMarkdown>{message.reasoning}</ReactMarkdown>
                            </div>
                          </details>
                        )}
                        <p className="text-xs text-gray-500 mt-1 text-right">
                          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                          {' '}
                          {new Date(message.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    )
                  ))}
                </div>
              </>
            ) : selectedConversation ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Loading conversation...</p>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Select a conversation to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
} 