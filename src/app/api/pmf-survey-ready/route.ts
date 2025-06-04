import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeTest = searchParams.get('excludeTest') === 'true';

    console.log('PMF Survey Ready API: Starting with filters:', { excludeTest });

    // Fixed 14-day window for PMF survey criteria (regardless of dashboard time filter)
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get test emails if excluding test accounts
    let testEmailsList: string[] = [];
    if (excludeTest) {
      const { data: testEmailsData } = await supabaseAdmin
        .from('test_emails')
        .select('email');
      testEmailsList = testEmailsData?.map(row => row.email) || [];
    }

    // Get PMF survey ready users for current period
    const getCurrentPeriodData = async () => {
      // Get all rooms by user (for session count)
      const { data: roomsData } = await supabaseAdmin
        .from('rooms')
        .select('id, account_id, updated_at');

      if (!roomsData) return { pmfSurveyReady: 0 };

      // Get account emails
      const accountIds = [...new Set(roomsData.map(room => room.account_id))];
      const { data: emailsData } = await supabaseAdmin
        .from('account_emails')
        .select('account_id, email')
        .in('account_id', accountIds);

      // Count rooms per user
      const roomCountByUser = new Map<string, number>();
      roomsData.forEach(room => {
        const email = emailsData?.find(e => e.account_id === room.account_id)?.email;
        if (email) {
          roomCountByUser.set(email, (roomCountByUser.get(email) || 0) + 1);
        }
      });

      // Get users with recent activity (last 14 days)
      const { data: recentMessages } = await supabaseAdmin.rpc('get_message_counts_by_user', { 
        start_date: fourteenDaysAgo.toISOString(), 
        end_date: now.toISOString() 
      });

      const recentMessageUsers = new Set((recentMessages || []).map((row: { account_email: string }) => row.account_email));

      // Get users with recent segment reports
      const { data: recentReports } = await supabaseAdmin
        .from('segment_reports')
        .select('account_email')
        .gte('updated_at', fourteenDaysAgo.toISOString())
        .lte('updated_at', now.toISOString());

      const recentReportUsers = new Set((recentReports || []).map(report => report.account_email));

      // Combine recent activity users
      const recentActiveUsers = new Set([...recentMessageUsers, ...recentReportUsers]);

      // Get distinct active days per user (we'll need to query messages table directly for this)
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { data: messageHistory } = await supabaseAdmin
        .from('memories')
        .select('room_id, updated_at')
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .lte('updated_at', now.toISOString());

      // Map room_id to email for message history
      const roomToEmailMap = new Map<string, string>();
      roomsData.forEach(room => {
        const email = emailsData?.find(e => e.account_id === room.account_id)?.email;
        if (email) {
          roomToEmailMap.set(room.id, email);
        }
      });

      // Count distinct active days per user
      const activeDaysByUser = new Map<string, Set<string>>();
      (messageHistory || []).forEach(message => {
        const email = roomToEmailMap.get(message.room_id);
        if (email) {
          const messageDate = new Date(message.updated_at).toDateString();
          
          if (!activeDaysByUser.has(email)) {
            activeDaysByUser.set(email, new Set<string>());
          }
          activeDaysByUser.get(email)!.add(messageDate);
        }
      });

      // Convert sets to counts
      const activeDaysCountByUser = new Map<string, number>();
      activeDaysByUser.forEach((daysSet, email) => {
        activeDaysCountByUser.set(email, daysSet.size);
      });

      // Get all-time segment reports per user
      const { data: allTimeReports } = await supabaseAdmin
        .from('segment_reports')
        .select('account_email')
        .gte('updated_at', thirtyDaysAgo.toISOString())
        .lte('updated_at', now.toISOString());

      const reportCountByUser = new Map<string, number>();
      (allTimeReports || []).forEach(report => {
        if (report.account_email) {
          reportCountByUser.set(report.account_email, (reportCountByUser.get(report.account_email) || 0) + 1);
        }
      });

      // Count PMF Survey Ready users: total sessions >= 2 AND recent activity
      let pmfSurveyReady = 0;
      
      // Get all unique users
      const allUsers = new Set([
        ...roomCountByUser.keys(),
        ...activeDaysCountByUser.keys(),
        ...reportCountByUser.keys()
      ]);

      for (const email of allUsers) {
        // Filter out test emails if needed
        if (excludeTest) {
          if (!email) continue;
          if (testEmailsList.includes(email)) continue;
          if (email.includes('@example.com')) continue;
          if (email.includes('+')) continue;
        }

        // Calculate total usage sessions
        const roomCount = roomCountByUser.get(email) || 0;
        const activeDays = activeDaysCountByUser.get(email) || 0;
        const reportCount = reportCountByUser.get(email) || 0;
        
        // Sessions = max(distinct active days, room count) + report count
        const totalSessions = Math.max(activeDays, roomCount) + reportCount;

        // Check criteria: 2+ sessions AND recent activity
        if (totalSessions >= 2 && recentActiveUsers.has(email)) {
          pmfSurveyReady++;
        }
      }

      return { pmfSurveyReady };
    };

    // Get previous period data for comparison (previous 14 days)
    const getPreviousPeriodData = async () => {
      const prevEnd = new Date(fourteenDaysAgo.getTime());
      const prevStart = new Date(fourteenDaysAgo.getTime() - 14 * 24 * 60 * 60 * 1000);
      const prevThirtyDaysAgo = new Date(prevEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get all rooms by user (for session count) - all time since sessions are cumulative
      const { data: roomsData } = await supabaseAdmin
        .from('rooms')
        .select('id, account_id, updated_at')
        .lte('updated_at', prevEnd.toISOString()); // Only count rooms that existed by the previous period

      if (!roomsData) return { pmfSurveyReady: 0 };

      // Get account emails
      const accountIds = [...new Set(roomsData.map(room => room.account_id))];
      const { data: emailsData } = await supabaseAdmin
        .from('account_emails')
        .select('account_id, email')
        .in('account_id', accountIds);

      // Count rooms per user
      const roomCountByUser = new Map<string, number>();
      roomsData.forEach(room => {
        const email = emailsData?.find(e => e.account_id === room.account_id)?.email;
        if (email) {
          roomCountByUser.set(email, (roomCountByUser.get(email) || 0) + 1);
        }
      });

      // Get users with activity in previous 14-day window
      const { data: prevMessages } = await supabaseAdmin.rpc('get_message_counts_by_user', { 
        start_date: prevStart.toISOString(), 
        end_date: prevEnd.toISOString() 
      });

      const prevMessageUsers = new Set((prevMessages || []).map((row: { account_email: string }) => row.account_email));

      // Get users with segment reports in previous window
      const { data: prevReports } = await supabaseAdmin
        .from('segment_reports')
        .select('account_email')
        .gte('updated_at', prevStart.toISOString())
        .lte('updated_at', prevEnd.toISOString());

      const prevReportUsers = new Set((prevReports || []).map(report => report.account_email));

      // Combine previous active users
      const prevActiveUsers = new Set([...prevMessageUsers, ...prevReportUsers]);

      // Get distinct active days per user (30 days from previous period end)
      const { data: messageHistory } = await supabaseAdmin
        .from('memories')
        .select('room_id, updated_at')
        .gte('updated_at', prevThirtyDaysAgo.toISOString())
        .lte('updated_at', prevEnd.toISOString());

      // Map room_id to email for message history
      const roomToEmailMap = new Map<string, string>();
      roomsData.forEach(room => {
        const email = emailsData?.find(e => e.account_id === room.account_id)?.email;
        if (email) {
          roomToEmailMap.set(room.id, email);
        }
      });

      // Count distinct active days per user
      const activeDaysByUser = new Map<string, Set<string>>();
      (messageHistory || []).forEach(message => {
        const email = roomToEmailMap.get(message.room_id);
        if (email) {
          const messageDate = new Date(message.updated_at).toDateString();
          
          if (!activeDaysByUser.has(email)) {
            activeDaysByUser.set(email, new Set<string>());
          }
          activeDaysByUser.get(email)!.add(messageDate);
        }
      });

      // Convert sets to counts
      const activeDaysCountByUser = new Map<string, number>();
      activeDaysByUser.forEach((daysSet, email) => {
        activeDaysCountByUser.set(email, daysSet.size);
      });

      // Get segment reports per user in previous period
      const { data: allTimeReports } = await supabaseAdmin
        .from('segment_reports')
        .select('account_email')
        .gte('updated_at', prevThirtyDaysAgo.toISOString())
        .lte('updated_at', prevEnd.toISOString());

      const reportCountByUser = new Map<string, number>();
      (allTimeReports || []).forEach(report => {
        if (report.account_email) {
          reportCountByUser.set(report.account_email, (reportCountByUser.get(report.account_email) || 0) + 1);
        }
      });

      // Count PMF Survey Ready users in previous period
      let pmfSurveyReady = 0;
      
      // Get all unique users
      const allUsers = new Set([
        ...roomCountByUser.keys(),
        ...activeDaysCountByUser.keys(),
        ...reportCountByUser.keys()
      ]);

      for (const email of allUsers) {
        // Filter out test emails if needed
        if (excludeTest) {
          if (!email) continue;
          if (testEmailsList.includes(email)) continue;
          if (email.includes('@example.com')) continue;
          if (email.includes('+')) continue;
        }

        // Calculate total usage sessions
        const roomCount = roomCountByUser.get(email) || 0;
        const activeDays = activeDaysCountByUser.get(email) || 0;
        const reportCount = reportCountByUser.get(email) || 0;
        
        // Sessions = max(distinct active days, room count) + report count
        const totalSessions = Math.max(activeDays, roomCount) + reportCount;

        // Check criteria: 2+ sessions AND activity in previous window
        if (totalSessions >= 2 && prevActiveUsers.has(email)) {
          pmfSurveyReady++;
        }
      }

      return { pmfSurveyReady };
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getCurrentPeriodData(),
      getPreviousPeriodData()
    ]);

    // Calculate percentage change
    let percentChange = 0;
    let changeDirection: 'up' | 'down' | 'neutral' = 'neutral';

    if (previousPeriod.pmfSurveyReady > 0) {
      percentChange = Math.round(((currentPeriod.pmfSurveyReady - previousPeriod.pmfSurveyReady) / previousPeriod.pmfSurveyReady) * 100);
      changeDirection = percentChange > 0 ? 'up' : percentChange < 0 ? 'down' : 'neutral';
    } else if (currentPeriod.pmfSurveyReady > 0) {
      percentChange = 100;
      changeDirection = 'up';
    }

    const result = {
      pmfSurveyReady: currentPeriod.pmfSurveyReady,
      previousPmfSurveyReady: previousPeriod.pmfSurveyReady,
      percentChange: Math.abs(percentChange),
      changeDirection,
      excludeTest
    };

    console.log('PMF Survey Ready API: Result:', result);

    return NextResponse.json(result);

  } catch (error) {
    console.error('PMF Survey Ready API: Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch PMF survey ready data',
      pmfSurveyReady: 0,
      previousPmfSurveyReady: 0,
      percentChange: 0,
      changeDirection: 'neutral' 
    }, { status: 500 });
  }
} 