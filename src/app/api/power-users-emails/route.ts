import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function getDateRangeForFilter(filter: string): { start: Date | null, end: Date } {
  const now = new Date();
  let start: Date | null = null;
  const end: Date = now;
  
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
  
  return { start, end };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeFilter = searchParams.get('timeFilter') || 'Last 7 Days';
    const excludeTest = searchParams.get('excludeTest') === 'true';

    console.log('Power Users Emails API: Starting with filters:', { timeFilter, excludeTest });

    const { start, end } = getDateRangeForFilter(timeFilter);

    // Get test emails if excluding test accounts
    let testEmailsList: string[] = [];
    if (excludeTest) {
      const { data: testEmailsData } = await supabaseAdmin
        .from('test_emails')
        .select('email');
      testEmailsList = testEmailsData?.map(row => row.email) || [];
    }

    // Get message counts by user
    const { data: messageData } = await supabaseAdmin.rpc('get_message_counts_by_user', { 
      start_date: start ? start.toISOString() : '1970-01-01T00:00:00.000Z', 
      end_date: end.toISOString() 
    });
    
    if (!messageData) return NextResponse.json({ emails: [] });

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

    // Get segment reports for this period and count them by user
    let reportQuery = supabaseAdmin
      .from('segment_reports')
      .select('account_email')
      .lte('updated_at', end.toISOString());

    if (start) {
      reportQuery = reportQuery.gte('updated_at', start.toISOString());
    }

    const { data: reportData } = await reportQuery;
    
    // Count reports per user
    const reportCountByUser = new Map<string, number>();
    (reportData || [])
      .filter(report => {
        if (!excludeTest) return true;
        const email = report.account_email;
        if (!email) return false;
        if (testEmailsList.includes(email)) return false;
        if (email.includes('@example.com')) return false;
        if (email.includes('+')) return false;
        return true;
      })
      .forEach(report => {
        const email = report.account_email;
        if (email) {
          reportCountByUser.set(email, (reportCountByUser.get(email) || 0) + 1);
        }
      });

    // Combine users who sent messages or created reports with their total activity
    const userActivityMap = new Map<string, number>();
    
    // Add message counts
    filteredMessageData.forEach((row: { account_email: string, message_count: number }) => {
      userActivityMap.set(row.account_email, row.message_count);
    });

    // Add report counts to existing users or create new entries
    reportCountByUser.forEach((reportCount, email) => {
      const existingActivity = userActivityMap.get(email) || 0;
      userActivityMap.set(email, existingActivity + reportCount);
    });

    // Find power users (10+ total activity: messages + reports)
    const powerUsersEmails: string[] = [];
    userActivityMap.forEach((totalActivity, email) => {
      if (totalActivity >= 10) {
        powerUsersEmails.push(email);
      }
    });

    console.log(`Power Users Emails API: Found ${powerUsersEmails.length} power users`);

    return NextResponse.json({ emails: powerUsersEmails });

  } catch (error) {
    console.error('Power Users Emails API: Error:', error);
    return NextResponse.json({ error: 'Failed to fetch power users emails', emails: [] }, { status: 500 });
  }
} 