import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔄 API: Fetching all account emails with pagination...');

    let allEmails: { account_id: string; email: string }[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    // Fetch all records using pagination
    while (hasMore) {
      const { data, error } = await supabaseAdmin
        .from('account_emails')
        .select('account_id, email')
        .order('email')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) {
        console.error('❌ Error fetching account emails:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (data && data.length > 0) {
        allEmails = [...allEmails, ...data];
        console.log(`📄 Page ${page + 1}: Fetched ${data.length} emails (total so far: ${allEmails.length})`);
        
        // Check if we got a full page (if less than pageSize, we're done)
        hasMore = data.length === pageSize;
        page++;
      } else {
        hasMore = false;
      }

      // Safety break after reasonable number of pages
      if (page > 50) {
        console.log('⚠️ Breaking after 50 pages (50,000 records)');
        break;
      }
    }

    console.log(`✅ API: Fetched ${allEmails.length} total account emails using pagination`);
    return NextResponse.json(allEmails);

  } catch (err) {
    console.error('❌ Exception in all-account-emails API:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 