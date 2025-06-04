import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const excludeTest = searchParams.get('excludeTest') === 'true';

    console.log('PMF Survey Ready Users API: Starting with filters:', { excludeTest });

    // Fixed 14-day window for PMF survey criteria
    const now = new Date();
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get test emails if excluding test accounts
    let testEmailsList: string[] = [];
    if (excludeTest) {
      const { data: testEmailsData } = await supabaseAdmin
        .from('test_emails')
        .select('email');
      testEmailsList = testEmailsData?.map(row => row.email) || [];
    }

    // Get all rooms by user (for session count)
    const { data: roomsData } = await supabaseAdmin
      .from('rooms')
      .select('id, account_id, updated_at');

    if (!roomsData) return NextResponse.json({ users: [] });

    // Get account emails
    const accountIds = [...new Set(roomsData.map(room => room.account_id))];
    const { data: emailsData } = await supabaseAdmin
      .from('account_emails')
      .select('account_id, email')
      .in('account_id', accountIds);

    // Get distinct active days per user
    const { data: messageHistory } = await supabaseAdmin
      .from('memories')
      .select('room_id, updated_at')
      .gte('updated_at', thirtyDaysAgo.toISOString())
      .lte('updated_at', now.toISOString());

    // Count rooms per user (all-time usage)
    const roomCountByUser = new Map<string, number>();
    roomsData.forEach(room => {
      const email = emailsData?.find(e => e.account_id === room.account_id)?.email;
      if (email) {
        roomCountByUser.set(email, (roomCountByUser.get(email) || 0) + 1);
      }
    });

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

    // Get segment reports per user
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

    // Find PMF Survey Ready users: total sessions >= 2 AND recent activity
    const pmfSurveyReadyUsers: string[] = [];
    
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
      
      // Sessions = max(distinct active days, active room count) + report count
      const totalSessions = Math.max(activeDays, roomCount) + reportCount;

      // Check criteria: 2+ sessions AND recent activity
      if (totalSessions >= 2 && recentActiveUsers.has(email)) {
        pmfSurveyReadyUsers.push(email);
      }
    }

    console.log(`PMF Survey Ready Users API: Found ${pmfSurveyReadyUsers.length} users`);

    return NextResponse.json({ users: pmfSurveyReadyUsers });

  } catch (error) {
    console.error('PMF Survey Ready Users API: Error:', error);
    return NextResponse.json({ error: 'Failed to fetch PMF survey ready users', users: [] }, { status: 500 });
  }
} 