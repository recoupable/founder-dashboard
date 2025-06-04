'use client';

import React, { useState, useEffect } from 'react';
import 'chartjs-adapter-date-fns'; // Import the date adapter for side effects
import { conversationService } from '@/lib/conversationService';
import type { ConversationListItem, ConversationDetail, ConversationFilters } from '@/lib/conversationService';
import ReactMarkdown from 'react-markdown';
import { MagnifyingGlassIcon, CogIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import { createClient } from '@supabase/supabase-js';
import { Line } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  TimeScale,
  TimeSeriesScale
} from 'chart.js';
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  ChartTooltip, 
  Legend, 
  annotationPlugin,
  TimeScale,
  TimeSeriesScale
);

// Define types for chart annotations and chart data
interface ChartAnnotation {
  id: number; 
  event_date: string; // ISO string from timestamptz or YYYY-MM-DD from DATE
  event_description: string;
  chart_type: string;
  created_at: string;
}

interface ChartDatasetDataPoint {
  x: string; // ISO date string for the time scale
  y: number;
}

interface ChartDataset {
  label: string;
  data: ChartDatasetDataPoint[];
  borderColor: string;
  backgroundColor: string;
  // tension?: number; // Example: if you use line tension
}

// Interface for the dataset structure coming from the API before transformation
interface ApiChartDataset {
  label: string;
  borderColor: string;
  backgroundColor: string;
  data: number[]; // This is the original data structure from the API
}

interface MyChartData {
  // labels: string[]; // May not be strictly needed if time scale auto-generates from data
  rawDates: string[]; // Still useful for mapping, or could be part of datasets
  datasets: ChartDataset[];
  annotations: ChartAnnotation[];
}

// Custom Switch component with proper TypeScript types
interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  children?: React.ReactNode;
}

// Custom Tooltip component
interface CustomTooltipProps {
  content: string;
  children: React.ReactNode;
}

function CustomTooltip({ content, children }: CustomTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-80 z-50">
          <div className="bg-gray-900 text-white text-sm rounded-lg p-3 shadow-lg">
            <div className="whitespace-pre-line">{content}</div>
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      )}
    </div>
  );
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

// Move this helper outside the component to avoid linter dependency warnings
function getDateRangeForFilter(filter: string): { start: string | null, end: string | null } {
  const now = new Date();
  let start: Date | null = null;
  const end: Date | null = now;
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
  return {
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null
  };
}

export default function ConversationsPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [excludeTestEmails, setExcludeTestEmails] = useState(true);
  const [timeFilter, setTimeFilter] = useState('Last 30 Days');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [totalUniqueUsers, setTotalUniqueUsers] = useState(0);
  const [pageSize] = useState(100); // Fixed page size
  
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
  
  // Active Users state
  const [activeUsersData, setActiveUsersData] = useState({
    activeUsers: 0,
    previousActiveUsers: 0,
    percentChange: 0,
    changeDirection: 'neutral' as 'up' | 'down' | 'neutral'
  });
  const [activeUsersLoading, setActiveUsersLoading] = useState(false);

  // Active Users Chart state
  const [activeUsersChartData, setActiveUsersChartData] = useState<{
    labels: string[];
    data: number[];
  } | null>(null);
  const [activeUsersChartLoading, setActiveUsersChartLoading] = useState(false);
  const [activeUsersChartError, setActiveUsersChartError] = useState<string | null>(null);

  // PMF Survey Ready state
  const [pmfSurveyReadyData, setPmfSurveyReadyData] = useState({
    pmfSurveyReady: 0,
    previousPmfSurveyReady: 0,
    percentChange: 0,
    changeDirection: 'neutral' as 'up' | 'down' | 'neutral'
  });
  const [pmfSurveyReadyLoading, setPmfSurveyReadyLoading] = useState(false);

  // Power Users state
  const [powerUsersData, setPowerUsersData] = useState({
    powerUsers: 0,
    previousPowerUsers: 0,
    percentChange: 0,
    changeDirection: 'neutral' as 'up' | 'down' | 'neutral'
  });
  const [powerUsersLoading, setPowerUsersLoading] = useState(false);

  // Selected metric state (simplified to 3 metrics)
  const [selectedMetric, setSelectedMetric] = useState<'activeUsers' | 'pmfSurveyReady' | 'powerUsers'>('activeUsers');

  const [messagesByUser, setMessagesByUser] = useState<Record<string, number>>({});

  // Add state for segmentReportsByUser
  const [segmentReportsByUser, setSegmentReportsByUser] = useState<Record<string, number>>({});
  
  // Add loading states for leaderboard data
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Add state for leaderboard sort
  const [leaderboardSort, setLeaderboardSort] = useState('activity');

  // Add state for user filter
  const [selectedUserFilter, setSelectedUserFilter] = useState<string | null>(null);

  // Add state for leaderboard filtering
  const [leaderboardFilter, setLeaderboardFilter] = useState<'all' | 'pmf-ready' | 'power-users'>('all');
  const [pmfSurveyReadyUsers, setPmfSurveyReadyUsers] = useState<string[]>([]);
  const [powerUsersEmails, setPowerUsersEmails] = useState<string[]>([]);
  const [leaderboardFilterLoading, setLeaderboardFilterLoading] = useState(false);

  const [showChart, setShowChart] = useState(false);
  const [chartData, setChartData] = useState<MyChartData | null>(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);

  // State for Annotation Modal
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [annotationModalDate, setAnnotationModalDate] = useState(''); // YYYY-MM-DD
  const [annotationModalDescription, setAnnotationModalDescription] = useState('');
  const [isSavingAnnotation, setIsSavingAnnotation] = useState(false);
  const [saveAnnotationError, setSaveAnnotationError] = useState<string | null>(null);
  const [refreshChartToggle, setRefreshChartToggle] = useState(false); // To trigger re-fetch

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, excludeTestEmails, timeFilter, selectedUserFilter]);

  React.useEffect(() => {
    async function fetchReports() {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) return;
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data, error } = await supabase
        .from('segment_reports')
        .select('id, account_email, created_at');
      if (!error && data) {
        // This data is not used in the current implementation
        console.log('Segment reports fetched:', data.length);
      }
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
          timeFilter,
          page: currentPage,
          limit: pageSize,
          userFilter: selectedUserFilter || undefined
        };
        
        console.log('Fetching conversations with filters:', filters);
        
        // Add event listener to capture console logs about data source
        const originalConsoleLog = console.log;
        console.log = (...args) => {
          originalConsoleLog.apply(console, args);
        };
        
        const result = await conversationService.getConversationList(filters);
        
        // Restore original console.log
        console.log = originalConsoleLog;
        
        // Update conversation counts if available in the response
        if (result.conversations) {
          setConversations(result.conversations);
        }
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
        setTotalUniqueUsers(result.totalUniqueUsers);
        
        // No longer need to set conversation counts since we use active users now
      } catch (err) {
        console.error('Failed to load conversations:', err);
        setError('Failed to load conversations. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadConversations();
  }, [searchQuery, excludeTestEmails, timeFilter, currentPage, pageSize, selectedUserFilter]);
  
  // Load conversation detail when selection changes
  useEffect(() => {
    const loadConversationDetail = async () => {
      if (!selectedConversation) {
        setConversationDetail(null);
        return;
      }
      
      try {
        const result = await conversationService.getConversationDetail(selectedConversation);
        if (result === null) {
          // Conversation was blocked (likely a test account)
          console.log('Conversation blocked or not found:', selectedConversation);
          setConversationDetail(null);
          // Clear the selection to prevent infinite loading
          setSelectedConversation(null);
        } else {
          setConversationDetail(result);
        }
      } catch (err) {
        console.error('Failed to load conversation detail:', err);
        setError('Failed to load conversation details. Please try again.');
        // Clear the selection on error
        setSelectedConversation(null);
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

  // Fetch message counts from the API when timeFilter changes
  useEffect(() => {
    setLeaderboardLoading(true);
    const { start, end } = getDateRangeForFilter(timeFilter);
    let url = '/api/conversations/message-counts';
    if (start && end) {
      url += `?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`;
    }
    fetch(url)
      .then(res => res.json())
      .then((data: { account_email: string, message_count: number }[]) => {
        const map: Record<string, number> = {};
        for (const row of data) {
          map[row.account_email] = row.message_count;
        }
        setMessagesByUser(map);
      })
      .finally(() => setLeaderboardLoading(false));
  }, [timeFilter]);

  // Fetch segment report counts from the API when timeFilter changes
  useEffect(() => {
    const { start, end } = getDateRangeForFilter(timeFilter);
    let url = '/api/conversations/leaderboard';
    if (start && end) {
      url += `?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`;
    }
    fetch(url)
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
  }, [timeFilter]);

  useEffect(() => {
    if (!showChart) return;
    setChartLoading(true);
    setChartError(null);
    fetch(`/api/chart-data?timeframe=allTimeWeekly&excludeTest=${excludeTestEmails}`)
      .then(res => res.json())
      .then(apiData => {
        console.log('[DEBUG] Chart Data from API:', apiData);

        // Use the ApiChartDataset interface for typing ds
        const transformedDatasets: ChartDataset[] = (apiData.datasets || []).map((ds: ApiChartDataset) => ({
          label: ds.label,
          borderColor: ds.borderColor,
          backgroundColor: ds.backgroundColor,
          data: (ds.data || []).map((value: number, index: number) => ({
            x: apiData.rawDates[index], 
            y: value,
          })),
        }));

        const chartDataPayload: MyChartData = {
          rawDates: apiData.rawDates || [], 
          datasets: transformedDatasets,
          annotations: apiData.annotations || [],
        };

        setChartData(chartDataPayload);
        setChartLoading(false);
      })
      .catch(err => {
        console.error('Failed to load chart data:', err);
        setChartError('Failed to load chart data');
        setChartLoading(false);
      });
  }, [showChart, excludeTestEmails, refreshChartToggle]);

  const handleSaveAnnotation = async () => {
    if (!annotationModalDate || !annotationModalDescription) {
      setSaveAnnotationError('Date and description are required.');
      return;
    }
    setIsSavingAnnotation(true);
    setSaveAnnotationError(null);
    try {
      const response = await fetch('/api/founder-dashboard-chart-annotations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_date: annotationModalDate,
          event_description: annotationModalDescription,
          chart_type: 'messages_reports_over_time' // Ensure this matches your expected chart_type
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to save annotation: ${response.status}`);
      }
      setShowAnnotationModal(false);
      setAnnotationModalDescription(''); // Clear description for next time
      setRefreshChartToggle(prev => !prev); // Trigger chart refresh
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unknown error occurred';
      setSaveAnnotationError(message);
      console.error('Failed to save annotation:', err);
    } finally {
      setIsSavingAnnotation(false);
    }
  };

  // Fetch active users data when timeFilter or excludeTestEmails changes
  useEffect(() => {
    const fetchActiveUsers = async () => {
      setActiveUsersLoading(true);
      try {
        const params = new URLSearchParams({
          timeFilter,
          excludeTest: excludeTestEmails.toString()
        });
        
        const response = await fetch(`/api/active-users?${params}`);
        const data = await response.json();
        
        if (response.ok) {
          setActiveUsersData(data);
        } else {
          console.error('Failed to fetch active users:', data.error);
        }
      } catch (error) {
        console.error('Error fetching active users:', error);
      } finally {
        setActiveUsersLoading(false);
      }
    };
    
    fetchActiveUsers();
  }, [timeFilter, excludeTestEmails]);

  // Fetch active users chart data when timeFilter or excludeTestEmails changes
  useEffect(() => {
    const fetchActiveUsersChart = async () => {
      setActiveUsersChartLoading(true);
      setActiveUsersChartError(null);
      
      try {
        const params = new URLSearchParams({
          timeFilter,
          excludeTest: excludeTestEmails.toString()
        });
        
        const response = await fetch(`/api/active-users-chart?${params}`);
        const data = await response.json();
        
        if (response.ok) {
          setActiveUsersChartData(data);
        } else {
          console.error('Failed to fetch active users chart:', data.error);
          setActiveUsersChartError('Failed to load chart data');
        }
      } catch (error) {
        console.error('Error fetching active users chart:', error);
        setActiveUsersChartError('Failed to load chart data');
      } finally {
        setActiveUsersChartLoading(false);
      }
    };
    
    fetchActiveUsersChart();
  }, [timeFilter, excludeTestEmails]);

  // Fetch PMF Survey Ready data when timeFilter or excludeTestEmails changes
  useEffect(() => {
    const fetchPmfSurveyReady = async () => {
      setPmfSurveyReadyLoading(true);
      try {
        const params = new URLSearchParams({
          timeFilter,
          excludeTest: excludeTestEmails.toString()
        });
        
        const response = await fetch(`/api/pmf-survey-ready?${params}`);
        const data = await response.json();
        
        if (response.ok) {
          setPmfSurveyReadyData(data);
        } else {
          console.error('Failed to fetch PMF Survey Ready:', data.error);
        }
      } catch (error) {
        console.error('Error fetching PMF Survey Ready:', error);
      } finally {
        setPmfSurveyReadyLoading(false);
      }
    };
    
    fetchPmfSurveyReady();
  }, [timeFilter, excludeTestEmails]);

  // Fetch power users data when timeFilter or excludeTestEmails changes
  useEffect(() => {
    const fetchPowerUsers = async () => {
      setPowerUsersLoading(true);
      try {
        const params = new URLSearchParams({
          timeFilter,
          excludeTest: excludeTestEmails.toString()
        });
        
        const response = await fetch(`/api/power-users?${params}`);
        const data = await response.json();
        
        if (response.ok) {
          setPowerUsersData(data);
        } else {
          console.error('Failed to fetch power users:', data.error);
        }
      } catch (error) {
        console.error('Error fetching power users:', error);
      } finally {
        setPowerUsersLoading(false);
      }
    };
    
    fetchPowerUsers();
  }, [timeFilter, excludeTestEmails]);

  // Fetch leaderboard filter data (PMF Survey Ready and Power Users) when timeFilter or excludeTestEmails changes
  useEffect(() => {
    const fetchLeaderboardFilterData = async () => {
      if (leaderboardFilter === 'all') return;
      
      setLeaderboardFilterLoading(true);
      try {
        const params = new URLSearchParams({
          timeFilter,
          excludeTest: excludeTestEmails.toString()
        });
        
        if (leaderboardFilter === 'pmf-ready') {
          const response = await fetch(`/api/pmf-survey-ready-users?${params}`);
          const data = await response.json();
          if (response.ok && data.users) {
            setPmfSurveyReadyUsers(data.users);
          }
        } else if (leaderboardFilter === 'power-users') {
          const response = await fetch(`/api/power-users-emails?${params}`);
          const data = await response.json();
          if (response.ok && data.emails) {
            setPowerUsersEmails(data.emails);
          }
        }
      } catch (error) {
        console.error('Error fetching leaderboard filter data:', error);
      } finally {
        setLeaderboardFilterLoading(false);
      }
    };
    
    fetchLeaderboardFilterData();
  }, [timeFilter, excludeTestEmails, leaderboardFilter]);

  return (
    <main className="p-4 sm:p-8">
      {/* Toggle button for cards/chart */}
      <div className="mb-8">
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setShowChart(s => !s)}
            className="p-2 rounded-full border hover:bg-gray-100"
            title={showChart ? 'Show summary cards' : 'Show chart'}
          >
            {showChart ? 'Cards' : 'Chart'}
          </button>
        </div>
        {showChart ? (
          <div className="bg-white rounded-2xl shadow-md p-6 max-w-4xl mx-auto">
            <div className="flex items-center mb-4 gap-4">
              <h2 className="text-2xl font-bold">Product Usage</h2>
            </div>
            {chartLoading ? (
              <div className="text-center text-gray-500 py-8">Loading chart...</div>
            ) : chartError ? (
              <div className="text-center text-red-500 py-8">{chartError}</div>
            ) : chartData ? (
              <Line
                data={{
                  datasets: chartData.datasets.filter((ds: ChartDataset) => ds.label === 'Messages Sent' || ds.label === 'Segment Reports'),
                }}
                options={{
                  responsive: true,
                  onClick: (event, elements) => {
                    if (elements.length > 0 && chartData && chartData.rawDates) {
                      const elementIndex = elements[0].index;
                      const clickedISODate = chartData.rawDates[elementIndex];
                      if (clickedISODate) {
                        // Convert ISO date string to YYYY-MM-DD for the modal
                        // The ISO string from rawDates will be like "2024-02-09T00:00:00.000Z" or similar
                        const datePart = clickedISODate.split('T')[0];
                        setAnnotationModalDate(datePart);
                        setAnnotationModalDescription(''); // Clear previous description
                        setSaveAnnotationError(null); // Clear previous error
                        setShowAnnotationModal(true);
                      }
                    }
                  },
                  plugins: {
                    legend: { display: true },
                    title: { display: false },
                    tooltip: {
                      callbacks: {
                        title: function(tooltipItems) {
                          if (tooltipItems.length > 0) {
                            const date = tooltipItems[0].parsed?.x;
                            if (date) {
                              const d = new Date(date);
                              const sunday = new Date(d);
                              sunday.setDate(d.getDate() - d.getDay());
                              return "Week of " + sunday.toLocaleDateString('default', { month: 'short', day: 'numeric', year: 'numeric' });
                            }
                          }
                          return '';
                        },
                        label: function(tooltipItem) {
                          let label = tooltipItem.dataset.label || '';
                          if (label) {
                            label += ': ';
                          }
                          if (tooltipItem.parsed.y !== null) {
                            label += tooltipItem.parsed.y;
                          }
                          if (tooltipItem.dataset.label === 'Messages Sent' || tooltipItem.dataset.label === 'Segment Reports') {
                            label += ' (weekly)';
                          }
                          return label;
                        }
                      }
                    },
                    annotation: {
                      annotations: chartData.annotations && chartData.datasets.length > 0 ? chartData.annotations.map(annotation => {
                        if (annotation.event_description) {
                            // console.log('[DEBUG] Event Description for Label:', annotation.event_description);
                            
                            let yPosition = 15; // Default yPosition, will be overwritten
                            const baseYWhenDataIsZero = 10; // Center label at Y=10 if data is at/near zero
                            const offsetFromLineForCenter = 5; // Center label 5 units above data line if data is higher

                            try {
                                const eventDateString = annotation.event_date.split('T')[0];
                                const eventDateObj = new Date(eventDateString + 'T00:00:00.000Z');

                                // Determine the start of the week (Sunday) for the event's date (UTC)
                                const eventWeekStart = new Date(eventDateObj);
                                eventWeekStart.setUTCDate(eventDateObj.getUTCDate() - eventDateObj.getUTCDay());
                                eventWeekStart.setUTCHours(0, 0, 0, 0);
                                const eventWeekStartISO = eventWeekStart.toISOString();

                                const dataPointIndex = chartData.rawDates.findIndex(rawDateISO => rawDateISO === eventWeekStartISO);

                                if (dataPointIndex !== -1) {
                                    let maxValueAtPoint = 0;
                                    const messagesDataset = chartData.datasets.find(ds => ds.label === 'Messages Sent');
                                    const reportsDataset = chartData.datasets.find(ds => ds.label === 'Segment Reports');

                                    if (messagesDataset && messagesDataset.data[dataPointIndex] && typeof messagesDataset.data[dataPointIndex].y === 'number') {
                                        maxValueAtPoint = Math.max(maxValueAtPoint, messagesDataset.data[dataPointIndex].y);
                                    }
                                    if (reportsDataset && reportsDataset.data[dataPointIndex] && typeof reportsDataset.data[dataPointIndex].y === 'number') {
                                        maxValueAtPoint = Math.max(maxValueAtPoint, reportsDataset.data[dataPointIndex].y);
                                    }

                                    if (maxValueAtPoint <= 1) { // If data is at or very near the X-axis
                                        yPosition = baseYWhenDataIsZero;
                                    } else {
                                        yPosition = maxValueAtPoint + offsetFromLineForCenter;
                                    }
                                } else {
                                    console.warn(`No matching weekly data point for event on ${eventDateString} (week start ${eventWeekStartISO}). Placing annotation at default Y.`);
                                    yPosition = baseYWhenDataIsZero; 
                                }
                            } catch (e) {
                                console.error("Error calculating yPosition for annotation:", e, annotation);
                                yPosition = baseYWhenDataIsZero; // Fallback
                            }

                            return {
                                type: 'label',
                                xValue: annotation.event_date,
                                yValue: yPosition, 
                                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                                color: 'white', // Font color for the label text
                                content: annotation.event_description,
                                font: {
                                    size: 10, // Slightly smaller font for a cleaner look
                                    weight: 'normal' as const
                                },
                                padding: { top: 3, bottom: 3, left: 5, right: 5 }, // Adjust padding around the text
                                cornerRadius: 3, // Rounded corners for the label background
                            };
                        } 
                        // This is a daily marker (no description) - rendered as a faint line
                        return {
                            type: 'line',
                            scaleID: 'x',
                            value: annotation.event_date,
                            borderColor: 'rgba(200, 200, 200, 0.3)',
                            borderWidth: 1,
                        };
                      }) : []
                    }
                  },
                  scales: {
                    x: {
                      type: 'time',
                      time: {
                        unit: 'week',
                        tooltipFormat: 'MMM d, yyyy',
                        displayFormats: {
                          week: 'MMM d',
                          day: 'MMM d'
                        }
                      },
                      grid: {
                        // drawOnChartArea: false,
                      },
                      ticks: {
                        // major: {
                        //   enabled: true
                        // },
                        // autoSkip: true,
                        // maxTicksLimit: 10
                      }
                    },
                    y: {
                      beginAtZero: true,
                      grace: '5%' // Add 5% padding to the top of the Y-axis
                    }
                  }
                }}
              />
            ) : null}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto">
            {/* Page Header with Master Time Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 sm:mb-0">User Conversations</h1>
              
              {/* Master Time Filter */}
              <div className="flex items-center gap-4">
                <label htmlFor="master-time-filter" className="font-medium text-sm text-gray-700">
                  Time Period:
                </label>
                <select
                  id="master-time-filter"
                  value={timeFilter}
                  onChange={e => setTimeFilter(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Last 24 Hours">Last 24 Hours</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                  <option value="Last 3 Months">Last 3 Months</option>
                  <option value="Last 12 Months">Last 12 Months</option>
                </select>
              </div>
            </div>

            {/* Analytics Metrics Cards (Vercel-style) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Active Users Card */}
              <CustomTooltip content="Active Users are users who have sent at least one message or created at least one segment report during the selected time period. This metric helps track overall product engagement and user activation.">
                <button
                  type="button"
                  onClick={() => setSelectedMetric('activeUsers')}
                  className={`bg-white rounded-2xl shadow-md p-6 text-left transition-all w-full ${
                    selectedMetric === 'activeUsers' ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
                    </div>
                    <div className="text-blue-600">
                      <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    </div>
                  </div>
                  
                  {activeUsersLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 w-16 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">{activeUsersData.activeUsers}</div>
                      <div className="flex items-center text-sm">
                        {activeUsersData.changeDirection === 'up' && (
                          <span className="text-green-600 font-medium">▲ {Math.abs(activeUsersData.percentChange)}%</span>
                        )}
                        {activeUsersData.changeDirection === 'down' && (
                          <span className="text-red-600 font-medium">▼ {Math.abs(activeUsersData.percentChange)}%</span>
                        )}
                        {activeUsersData.changeDirection === 'neutral' && (
                          <span className="text-gray-500 font-medium">— 0%</span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              </CustomTooltip>

              {/* Power Users Card */}
              <CustomTooltip content="Power Users are your most engaged users with 10+ total actions (messages + reports) in the selected period. These users demonstrate high product engagement through consistent usage.">
                <button
                  type="button"
                  onClick={() => setSelectedMetric('powerUsers')}
                  className={`bg-white rounded-2xl shadow-md p-6 text-left transition-all w-full ${
                    selectedMetric === 'powerUsers' ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Power Users</h3>
                    </div>
                    <div className="text-blue-600">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  </div>
                  
                  {powerUsersLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 w-16 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">{powerUsersData.powerUsers}</div>
                      <div className="flex items-center text-sm">
                        {powerUsersData.changeDirection === 'up' && (
                          <span className="text-green-600 font-medium">▲ {Math.abs(powerUsersData.percentChange)}%</span>
                        )}
                        {powerUsersData.changeDirection === 'down' && (
                          <span className="text-red-600 font-medium">▼ {Math.abs(powerUsersData.percentChange)}%</span>
                        )}
                        {powerUsersData.changeDirection === 'neutral' && (
                          <span className="text-gray-500 font-medium">— 0%</span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              </CustomTooltip>

              {/* PMF Survey Ready Card */}
              <CustomTooltip content="PMF Survey Ready users meet Sean Ellis criteria for product-market fit surveys: they have used your product at least twice (2+ conversation sessions) AND have been active in the last 14 days. When this reaches 30-50 users, you should send PMF surveys.">
                <button
                  type="button"
                  onClick={() => setSelectedMetric('pmfSurveyReady')}
                  className={`bg-white rounded-2xl shadow-md p-6 text-left transition-all w-full ${
                    selectedMetric === 'pmfSurveyReady' ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:shadow-lg'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">PMF Survey Ready</h3>
                    </div>
                    <div className="text-blue-600">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  {pmfSurveyReadyLoading ? (
                    <div className="animate-pulse">
                      <div className="h-8 w-16 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 w-24 bg-gray-200 rounded"></div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-3xl font-bold text-gray-900 mb-1">{pmfSurveyReadyData.pmfSurveyReady}</div>
                      <div className="flex items-center text-sm">
                        {pmfSurveyReadyData.changeDirection === 'up' && (
                          <span className="text-green-600 font-medium">▲ {Math.abs(pmfSurveyReadyData.percentChange)}%</span>
                        )}
                        {pmfSurveyReadyData.changeDirection === 'down' && (
                          <span className="text-red-600 font-medium">▼ {Math.abs(pmfSurveyReadyData.percentChange)}%</span>
                        )}
                        {pmfSurveyReadyData.changeDirection === 'neutral' && (
                          <span className="text-gray-500 font-medium">— 0%</span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              </CustomTooltip>
            </div>

            {/* Selected Metric Chart */}
            <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {selectedMetric === 'activeUsers' && 'Active Users Trend'}
                {selectedMetric === 'powerUsers' && 'Power Users Trend'}
                {selectedMetric === 'pmfSurveyReady' && 'PMF Survey Ready Trend'}
              </h2>
              
              {(selectedMetric === 'activeUsers' && activeUsersChartLoading) ? (
                <div className="text-center text-gray-500 py-8">Loading chart...</div>
              ) : (selectedMetric === 'activeUsers' && activeUsersChartError) ? (
                <div className="text-center text-red-500 py-8">
                  {activeUsersChartError}
                </div>
              ) : (selectedMetric === 'activeUsers' && activeUsersChartData) ? (
                <div className="h-64">
                  <Line
                    data={{
                      labels: activeUsersChartData.labels,
                      datasets: [{
                        label: 'Active Users',
                        data: activeUsersChartData.data,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.1
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        title: { display: false }
                      },
                      scales: {
                        y: { beginAtZero: true }
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  {selectedMetric !== 'activeUsers' 
                    ? `Chart data for ${selectedMetric === 'powerUsers' ? 'Power Users' : 'PMF Survey Ready'} is not yet available. Currently only Active Users chart is implemented.` 
                    : 'No chart data available'}
                </div>
              )}
            </div>

            {/* User Leaderboard Section */}
            <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">User Leaderboard</h2>
                <div className="flex items-center gap-4">
                  {/* Filter selector */}
                  <select
                    value={leaderboardFilter}
                    onChange={(e) => setLeaderboardFilter(e.target.value as 'all' | 'pmf-ready' | 'power-users')}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    title="Filter leaderboard by user segment"
                  >
                    <option value="all">All Users</option>
                    <option value="pmf-ready">PMF Survey Ready</option>
                    <option value="power-users">Power Users</option>
                  </select>
                  
                  {/* Sort selector */}
                  <select
                    value={leaderboardSort}
                    onChange={(e) => setLeaderboardSort(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    title="Sort leaderboard by messages, reports, or total activity"
                  >
                    <option value="messages">Sort by Messages</option>
                    <option value="reports">Sort by Reports</option>
                    <option value="activity">Sort by All Activity</option>
                  </select>
                </div>
              </div>

              {(leaderboardLoading || leaderboardFilterLoading) ? (
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <div key={i} className="animate-pulse flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                      </div>
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {(() => {
                    // Create combined user data
                    const userMap = new Map<string, { email: string; messages: number; reports: number; totalActivity: number }>();
                    
                    // Add message counts
                    Object.entries(messagesByUser).forEach(([email, count]) => {
                      if (!userMap.has(email)) {
                        userMap.set(email, { email, messages: 0, reports: 0, totalActivity: 0 });
                      }
                      const user = userMap.get(email)!;
                      user.messages = count;
                      user.totalActivity += count;
                    });
                    
                    // Add segment report counts
                    Object.entries(segmentReportsByUser).forEach(([email, count]) => {
                      if (!userMap.has(email)) {
                        userMap.set(email, { email, messages: 0, reports: 0, totalActivity: 0 });
                      }
                      const user = userMap.get(email)!;
                      user.reports = count;
                      user.totalActivity += count;
                    });
                    
                    // Convert to array and filter out test emails if needed
                    let users = Array.from(userMap.values());
                    
                    if (excludeTestEmails) {
                      users = users.filter(user => {
                        if (testEmails.includes(user.email)) return false;
                        if (user.email.includes('@example.com')) return false;
                        if (user.email.includes('+')) return false;
                        return true;
                      });
                    }
                    
                    // Filter by time and activity
                    users = users.filter(user => user.totalActivity > 0);
                    
                    // Apply leaderboard filter
                    if (leaderboardFilter === 'pmf-ready' && pmfSurveyReadyUsers.length > 0) {
                      users = users.filter(user => pmfSurveyReadyUsers.includes(user.email));
                    } else if (leaderboardFilter === 'power-users' && powerUsersEmails.length > 0) {
                      users = users.filter(user => powerUsersEmails.includes(user.email));
                    }
                    
                    // Sort based on selected criteria
                    if (leaderboardSort === 'messages') {
                      users.sort((a, b) => b.messages - a.messages);
                    } else if (leaderboardSort === 'reports') {
                      users.sort((a, b) => b.reports - a.reports);
                    } else {
                      users.sort((a, b) => b.totalActivity - a.totalActivity);
                    }
                    
                    // Take top 20
                    users = users.slice(0, 20);
                    
                    return users.map((user, index) => (
                      <button
                        key={user.email}
                        type="button"
                        onClick={() => setSelectedUserFilter(user.email)}
                        className={`w-full flex items-center justify-between p-4 rounded-lg transition-colors text-left ${
                          selectedUserFilter === user.email 
                            ? 'bg-blue-50 border-2 border-blue-500' 
                            : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                        title={`Click to filter conversations by ${user.email}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 truncate max-w-xs">
                              {user.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.messages} messages, {user.reports} reports
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-gray-900">
                            {leaderboardSort === 'messages' ? user.messages : leaderboardSort === 'reports' ? user.reports : user.totalActivity}
                          </div>
                          <div className="text-sm text-gray-500">
                            {leaderboardSort === 'messages' ? 'messages' : leaderboardSort === 'reports' ? 'reports' : 'total activity'}
                          </div>
                        </div>
                      </button>
                    ));
                  })()}
                  
                  {(() => {
                    // Check if we have any data to show
                    const hasMessages = Object.keys(messagesByUser).length > 0;
                    const hasReports = Object.keys(segmentReportsByUser).length > 0;
                    
                    if (!hasMessages && !hasReports) {
                      return (
                        <div className="text-center text-gray-500 py-8">
                          No user activity data available for the selected time period.
                        </div>
                      );
                    }
                    
                    return null;
                  })()}
                </div>
              )}
            </div>

            {/* Conversation Management Section */}
            <div className="bg-white rounded-2xl shadow-md p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
                <h2 className="text-xl font-semibold">Conversation Management</h2>
                
                {/* Search and Filters */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Test Email Toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={excludeTestEmails}
                      onChange={setExcludeTestEmails}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        excludeTestEmails ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          excludeTestEmails ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </Switch>
                    <span className="text-sm text-gray-700">Exclude test emails</span>
                    <button
                      type="button"
                      onClick={() => setShowTestEmailPopup(true)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="Manage test emails"
                    >
                      <CogIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* User Filter Status */}
              {selectedUserFilter && (
                <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span className="text-sm text-blue-800">
                      Filtering conversations by: <strong>{selectedUserFilter}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedUserFilter(null)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              {/* Conversation Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Total Conversations</div>
                  <div className="text-2xl font-bold text-gray-900">{totalCount.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Unique Users</div>
                  <div className="text-2xl font-bold text-gray-900">{totalUniqueUsers.toLocaleString()}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-600">Current Page</div>
                  <div className="text-2xl font-bold text-gray-900">{currentPage} of {totalPages}</div>
                </div>
              </div>

              {/* Loading State */}
              {loading && (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-4 w-1/4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
                  {error}
                </div>
              )}

              {/* Conversations List */}
              {!loading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Conversations List */}
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Recent Conversations</h3>
                    {conversations.length === 0 ? (
                      <div className="text-center text-gray-500 py-8">
                        No conversations found matching your criteria.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {conversations.map((conversation) => (
                          <div
                            key={conversation.room_id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedConversation === conversation.room_id
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedConversation(conversation.room_id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1">
                                <h4 className="font-medium text-gray-900 truncate">
                                  {conversation.topic || 'Untitled Conversation'}
                                </h4>
                                <p className="text-sm text-gray-600 truncate">
                                  {conversation.account_email}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(conversation.last_message_date).toLocaleDateString()} at{' '}
                                  {new Date(conversation.last_message_date).toLocaleTimeString()}
                                </p>
                              </div>
                              <div className="ml-4 flex-shrink-0">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {conversation.messageCount || 0} msgs
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          Previous
                        </button>
                        
                        <span className="text-sm text-gray-700">
                          Page {currentPage} of {totalPages}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Conversation Detail */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-4">Conversation Details</h3>
                    {selectedConversation ? (
                      conversationDetail ? (
                        <div className="border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto">
                          <div className="mb-4">
                            <h4 className="font-medium text-gray-900">{conversationDetail.topic || 'Untitled'}</h4>
                            <p className="text-sm text-gray-600">{conversationDetail.account_email}</p>
                            <p className="text-xs text-gray-500">
                              Started: {conversationDetail.messages.length > 0 ? 
                                new Date(conversationDetail.messages[0].created_at).toLocaleDateString() : 
                                'Unknown'}
                            </p>
                          </div>
                          
                          <div className="space-y-4">
                            {conversationDetail.messages.map((message, index) => (
                              <div
                                key={index}
                                className={`p-3 rounded-lg ${
                                  message.role === 'user'
                                    ? 'bg-blue-50 border-l-4 border-blue-400'
                                    : 'bg-gray-50 border-l-4 border-gray-400'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">
                                    {message.role === 'user' ? 'User' : 'Assistant'}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {new Date(message.created_at).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-700">
                                  {message.role === 'user' ? (
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                  ) : (
                                    <div className="prose prose-sm max-w-none">
                                      <ReactMarkdown>{message.content}</ReactMarkdown>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                          Loading conversation details...
                        </div>
                      )
                    ) : (
                      <div className="border border-gray-200 rounded-lg p-4 text-center text-gray-500">
                        Select a conversation to view details
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Test Email Management Popup */}
      {showTestEmailPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Manage Test Emails</h2>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Emails listed here will be excluded from metrics when &quot;Exclude test emails&quot; is enabled.
              </p>
              
              <div className="flex gap-2 mb-4">
                <input
                  type="email"
                  placeholder="Add test email"
                  className="flex-1 p-2 border rounded"
                  value={newTestEmail}
                  onChange={(e) => setNewTestEmail(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addTestEmail();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addTestEmail}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  disabled={!newTestEmail || isLoadingTestEmails}
                >
                  Add
                </button>
              </div>
              
              {testEmailError && (
                <div className="text-red-500 text-sm mb-2">{testEmailError}</div>
              )}
              
              <div className="space-y-2">
                {testEmails.length === 0 ? (
                  <p className="text-gray-500 text-sm">No test emails configured</p>
                ) : (
                  testEmails.map((email) => (
                    <div key={email} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">{email}</span>
                      <button
                        type="button"
                        onClick={() => removeTestEmail(email)}
                        className="text-red-500 hover:text-red-700"
                        disabled={isLoadingTestEmails}
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 mt-6">
              <button
                type="button"
                onClick={() => setShowTestEmailPopup(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Annotation Modal */}
      {showAnnotationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Add Annotation for {annotationModalDate}</h3>
            <textarea
              className="w-full p-2 border rounded mb-4 h-24"
              placeholder="Event description..."
              value={annotationModalDescription}
              onChange={(e) => setAnnotationModalDescription(e.target.value)}
            />
            {saveAnnotationError && (
              <p className="text-red-500 text-sm mb-2">{saveAnnotationError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAnnotationModal(false)}
                className="px-4 py-2 border rounded hover:bg-gray-100"
                disabled={isSavingAnnotation}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAnnotation}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isSavingAnnotation || !annotationModalDescription}
              >
                {isSavingAnnotation ? 'Saving...' : 'Save Annotation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
} 