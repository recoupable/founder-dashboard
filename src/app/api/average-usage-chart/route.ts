import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Robust outlier handling using median + IQR filtering
function calculateRobustAverage(messagesPerUser: number[]) {
  if (messagesPerUser.length === 0) return 0;
  
  const sorted = [...messagesPerUser].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  const iqr = q3 - q1;
  
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const filtered = sorted.filter(val => val >= lowerBound && val <= upperBound);
  
  if (filtered.length === 0) return sorted[Math.floor(sorted.length / 2)];
  
  const medianIndex = Math.floor(filtered.length / 2);
  return filtered.length % 2 === 0 
    ? (filtered[medianIndex - 1] + filtered[medianIndex]) / 2
    : filtered[medianIndex];
}

function generateIntervals(timeFilter: string) {
  const now = new Date();
  const intervals: { start: Date; end: Date; label: string }[] = [];

  switch (timeFilter) {
    case 'Last 24 Hours':
      // Generate 24 hourly intervals
      for (let i = 23; i >= 0; i--) {
        const end = new Date(now);
        end.setHours(now.getHours() - i, 59, 59, 999);
        const start = new Date(end);
        start.setHours(end.getHours(), 0, 0, 0);
        
        intervals.push({
          start,
          end,
          label: start.getHours().toString().padStart(2, '0') + ':00'
        });
      }
      break;

    case 'Last 7 Days':
      // Generate 7 daily intervals
      for (let i = 6; i >= 0; i--) {
        const end = new Date(now);
        end.setDate(now.getDate() - i);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setHours(0, 0, 0, 0);
        
        intervals.push({
          start,
          end,
          label: start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        });
      }
      break;

    case 'Last 30 Days':
      // Generate 30 daily intervals
      for (let i = 29; i >= 0; i--) {
        const end = new Date(now);
        end.setDate(now.getDate() - i);
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setHours(0, 0, 0, 0);
        
        intervals.push({
          start,
          end,
          label: start.getDate().toString()
        });
      }
      break;

    case 'Last 3 Months':
      // Generate 13 weekly intervals
      for (let i = 12; i >= 0; i--) {
        const end = new Date(now);
        end.setDate(now.getDate() - (i * 7));
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        intervals.push({
          start,
          end,
          label: 'Week of ' + start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
      }
      break;

    case 'Last 12 Months':
      // Generate 12 monthly intervals
      for (let i = 11; i >= 0; i--) {
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1, 0, 0, 0, 0);
        
        intervals.push({
          start,
          end,
          label: start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        });
      }
      break;

    default:
      return intervals;
  }

  return intervals;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') || 'Last 7 Days';
    const excludeTest = searchParams.get('excludeTest') === 'true';

    console.log('Average Usage Chart API: Starting with filters:', { timeFilter, excludeTest });

    // Get test emails if excluding test accounts
    let testEmailsList: string[] = [];

    if (excludeTest) {
      const { data: testEmailsData } = await supabaseAdmin
        .from('test_emails')
        .select('email');
      testEmailsList = testEmailsData?.map(row => row.email) || [];
    }

    const intervals = generateIntervals(timeFilter);

    // Calculate average usage for each interval
    const data = await Promise.all(intervals.map(async (interval) => {
      // Get message counts by user for this interval
      const { data: messageData } = await supabaseAdmin.rpc('get_message_counts_by_user', { 
        start_date: interval.start.toISOString(), 
        end_date: interval.end.toISOString() 
      });

      if (!messageData) return 0;

      // Filter out test emails if needed
      const filteredMessageData = excludeTest 
        ? messageData.filter((row: { account_email: string }) => {
            const email = row.account_email;
            if (!email) return false;
            if (testEmailsList.includes(email)) return false;
            if (email.includes('@example.com')) return false;
            if (email.includes('+')) return false;
            return true;
          })
        : messageData;

      // Get segment report users for this interval
      const { data: reportData } = await supabaseAdmin
        .from('segment_reports')
        .select('account_email')
        .gte('updated_at', interval.start.toISOString())
        .lte('updated_at', interval.end.toISOString());

      const reportUsers = new Set((reportData || [])
        .filter(report => {
          if (!excludeTest) return true;
          const email = report.account_email;
          if (!email) return false;
          if (testEmailsList.includes(email)) return false;
          if (email.includes('@example.com')) return false;
          if (email.includes('+')) return false;
          return true;
        })
        .map(report => report.account_email));

      // Combine users who sent messages or created reports
      const messageUserMap = new Map();
      filteredMessageData.forEach((row: { account_email: string, message_count: number }) => {
        messageUserMap.set(row.account_email, row.message_count);
      });

      // Add report users who may not have sent messages
      reportUsers.forEach(email => {
        if (!messageUserMap.has(email)) {
          messageUserMap.set(email, 0);
        }
      });

      const messagesPerUser = Array.from(messageUserMap.values()) as number[];

      if (messagesPerUser.length === 0) return 0;

      // Calculate robust average (median with outlier filtering)
      const averageUsage = calculateRobustAverage(messagesPerUser);
      return Math.round(averageUsage * 100) / 100;
    }));

    const labels = intervals.map(interval => interval.label);

    console.log('Average Usage Chart API: Generated', data.length, 'data points');

    return NextResponse.json({
      labels,
      data
    });

  } catch (error) {
    console.error('Average Usage Chart API: Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch average usage chart data',
      labels: [],
      data: []
    }, { status: 500 });
  }
} 