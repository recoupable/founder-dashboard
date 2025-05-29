import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { event_date, event_description, chart_type } = body;

    if (!event_date || !event_description) {
      return NextResponse.json({ error: 'event_date and event_description are required' }, { status: 400 });
    }

    // Validate event_date format (optional, but good practice)
    // For example, ensure it's a valid date string if you expect YYYY-MM-DD
    if (Number.isNaN(new Date(event_date).getTime())) {
        return NextResponse.json({ error: 'Invalid event_date format' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('founder_dashboard_chart_annotations')
      .insert([{ 
        event_date, 
        event_description,
        // Use provided chart_type or default if your table has a default
        chart_type: chart_type || 'messages_reports_over_time' 
      }])
      .select();

    if (error) {
      console.error('Error creating chart annotation:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Annotation created successfully', data: data?.[0] }, { status: 201 });
  } catch (e: unknown) {
    console.error('Error processing POST request for chart annotation:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: Request) {
  try {
    // Later, you might want to add filters, e.g., by chart_type or date range from URL query params
    // const url = new URL(request.url);
    // const chartTypeQuery = url.searchParams.get('chart_type');

    const { data, error } = await supabaseAdmin
      .from('founder_dashboard_chart_annotations')
      .select('*')
      .order('event_date', { ascending: true }); // Order by date

    if (error) {
      console.error('Error fetching chart annotations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (e: unknown) {
    console.error('Error processing GET request for chart annotations:', e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to process request', details: errorMessage }, { status: 500 });
  }
} 