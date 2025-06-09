import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const excludeTest = searchParams.get('excludeTest') === 'true';
    
    if (!start || !end) {
      return NextResponse.json({ error: 'start and end parameters are required' }, { status: 400 });
    }
    
    console.log('Website Visits API: Fetching visits from', start, 'to', end, 'excludeTest:', excludeTest);
    
    // Get test emails if excluding test accounts
    let testEmailsList: string[] = [];
    if (excludeTest) {
      const { data: testEmailsData } = await supabaseAdmin
        .from('test_emails')
        .select('email');
      testEmailsList = testEmailsData?.map(item => item.email) || [];
      console.log('Website Visits API: Test emails from test_emails table:', testEmailsList);
    }
    
    // Convert time period to Date objects
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    // Query page visits from database
    const { data: visitData, error } = await supabaseAdmin
      .from('page_visits')
      .select('*')
      .gte('visited_at', startDate.toISOString())
      .lte('visited_at', endDate.toISOString());
      
    if (error) {
      console.error('Website Visits API: Error querying page_visits:', error);
      // If table doesn't exist, return 0 visits for now
      if (error.code === '42P01') { // Table doesn't exist
        console.log('Website Visits API: page_visits table does not exist yet, returning 0');
        return NextResponse.json({ 
          websiteVisits: 0,
          excludeTest,
          visitList: []
        });
      }
      throw error;
    }
    
    console.log('Website Visits API: Raw visits from database:', visitData?.length || 0);
    
    // Apply test email filtering if needed
    let filteredVisits = visitData || [];
    if (excludeTest && visitData) {
      filteredVisits = visitData.filter(visit => {
        const email = visit.user_email;
        if (!email) return true; // Keep visits without emails (anonymous users)
        
        // Apply same filtering logic as other endpoints
        if (testEmailsList.includes(email)) return false;
        if (email.includes('@example.com')) return false;
        if (email.includes('+')) return false;
        return true;
      });
      
      console.log('Website Visits API: Visits after filtering test accounts:', filteredVisits.length);
    }
    
    // Count unique visitors (deduplicate by IP or session)
    const uniqueVisits = new Map();
    filteredVisits.forEach(visit => {
      const key = visit.session_id || visit.ip_address || `${visit.user_agent}-${visit.visited_at}`;
      if (!uniqueVisits.has(key)) {
        uniqueVisits.set(key, visit);
      }
    });
    
    const uniqueVisitsList = Array.from(uniqueVisits.values());
    console.log('Website Visits API: Unique visits:', uniqueVisitsList.length);
    
    // Prepare visit list for drill-down
    const visitList = uniqueVisitsList.map(visit => ({
      sessionId: visit.session_id,
      page: visit.page_path,
      referrer: visit.referrer || null,
      userAgent: visit.user_agent,
      ipAddress: visit.ip_address ? visit.ip_address.substring(0, 8) + '...' : null, // Anonymize IP
      visitedAt: visit.visited_at,
      userEmail: visit.user_email || null
    })).sort((a, b) => 
      new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
    );

    const result = {
      websiteVisits: uniqueVisitsList.length,
      excludeTest,
      visitList
    };

    console.log('Website Visits API: Final result:', {
      websiteVisits: result.websiteVisits,
      excludeTest: result.excludeTest,
      visitListLength: result.visitList.length
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('Website Visits API: Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch website visits data',
      websiteVisits: 0,
      excludeTest: false,
      visitList: []
    }, { status: 500 });
  }
}

// POST endpoint to track new page visits
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      page_path, 
      referrer, 
      user_agent, 
      session_id,
      user_email 
    } = body;
    
    if (!page_path) {
      return NextResponse.json({ error: 'page_path is required' }, { status: 400 });
    }
    
    // Get IP address from request headers
    const forwarded = request.headers.get('x-forwarded-for');
    const ip_address = forwarded ? forwarded.split(',')[0] : 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    
    // Insert page visit into database
    const { data, error } = await supabaseAdmin
      .from('page_visits')
      .insert({
        page_path,
        referrer: referrer || null,
        user_agent: user_agent || null,
        ip_address,
        session_id: session_id || null,
        user_email: user_email || null,
        visited_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('Website Visits API: Error inserting page visit:', error);
      
      // If table doesn't exist, provide helpful error
      if (error.code === '42P01') {
        return NextResponse.json({ 
          error: 'Page visits table not set up yet. Please run database migration.',
          details: 'Create page_visits table first'
        }, { status: 500 });
      }
      throw error;
    }
    
    console.log('Website Visits API: Recorded page visit:', data);
    
    return NextResponse.json({ 
      success: true, 
      visitId: data.id 
    });

  } catch (error) {
    console.error('Website Visits API: Error recording visit:', error);
    return NextResponse.json({ 
      error: 'Failed to record page visit'
    }, { status: 500 });
  }
} 