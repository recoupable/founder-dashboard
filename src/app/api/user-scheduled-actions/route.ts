import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const start_date = searchParams.get('start_date');
  const end_date = searchParams.get('end_date');

  if (!email) {
    return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
  }

  const supabase = supabaseAdmin;

  try {
    // First, get the account_id for this email or wallet
    // Try email lookup first
    let accountId: string | null = null;
    
    const { data: emailData } = await supabase
      .from('account_emails')
      .select('account_id')
      .eq('email', email)
      .maybeSingle();

    if (emailData && emailData.account_id) {
      accountId = emailData.account_id;
    } else {
      // If no email found, try wallet lookup
      const { data: walletData } = await supabase
        .from('account_wallets')
        .select('account_id')
        .eq('wallet', email)
        .maybeSingle();
      
      if (walletData?.account_id) {
        accountId = walletData.account_id;
      }
    }

    if (!accountId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Build the query for scheduled actions - first get raw data to debug
    let query = supabase
      .from('scheduled_actions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    // Apply date filters if provided
    if (start_date) {
      query = query.gte('created_at', start_date);
    }
    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    const { data: scheduledActions, error: actionsError } = await query;

    if (actionsError) {
      return NextResponse.json({ error: actionsError.message }, { status: 500 });
    }

    // Debug logging
    console.log('Raw scheduled actions data:', JSON.stringify(scheduledActions?.[0], null, 2));

    // Get artist names for all artist_account_ids
    const artistAccountIds = [...new Set((scheduledActions || [])
      .map((action: Record<string, unknown>) => action.artist_account_id as string)
      .filter(Boolean)
    )];

    let artistNames: Record<string, string> = {};
    if (artistAccountIds.length > 0) {
      const { data: artistData } = await supabase
        .from('accounts')
        .select('id, name')
        .in('id', artistAccountIds);
      
      if (artistData) {
        artistNames = Object.fromEntries(
          artistData.map((artist: Record<string, unknown>) => [artist.id as string, artist.name as string])
        );
      }
    }

    console.log('Artist names lookup:', artistNames);

    // Format the scheduled actions for display
    const formattedActions = (scheduledActions || []).map((action: Record<string, unknown>) => ({
      id: action.id,
      created_at: action.created_at,
      enabled: action.enabled,
      last_run: action.last_run,
      next_run: action.next_run,
      title: action.title || 'Untitled Action',
      prompt: action.prompt || '',
      schedule: action.schedule || '',
      artist_account_id: action.artist_account_id,
      artist_name: artistNames[action.artist_account_id as string] || action.artist_account_id as string || 'Unknown Artist',
      action_type: action.action_type || 'Unknown',
      action_data: action.action_data || {},
      description: action.description || action.title || 'Scheduled action'
    }));

    return NextResponse.json({
      user_email: email,
      total_count: formattedActions.length,
      scheduled_actions: formattedActions
    });

  } catch (error) {
    console.error('Error fetching user scheduled actions:', error);
    return NextResponse.json({ error: 'Failed to fetch scheduled actions' }, { status: 500 });
  }
} 