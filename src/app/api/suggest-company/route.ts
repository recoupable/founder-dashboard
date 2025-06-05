import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractDomain } from '@/lib/userOrgMatcher';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 });
    }
    
    console.log('🔍 API: Looking for company suggestion for email:', email);
    
    // Extract domain from email
    const domain = extractDomain(email);
    if (!domain) {
      return NextResponse.json({ 
        suggestion: null, 
        reason: 'Personal email domain - no company suggestion available' 
      });
    }
    
    // Look for matching company in sales pipeline
    const { data: customers, error } = await supabaseAdmin
      .from('sales_pipeline_customers')
      .select('name, domain, contact_email')
      .eq('domain', domain)
      .not('name', 'is', null)
      .limit(1);
    
    if (error) {
      console.error('❌ Error fetching company suggestion:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    if (customers && customers.length > 0) {
      const company = customers[0];
      console.log(`✅ Found company suggestion: ${company.name} for domain ${domain}`);
      
      return NextResponse.json({
        suggestion: {
          company: company.name,
          domain: domain,
          source: 'sales_dashboard',
          confidence: 'high'
        }
      });
    }
    
    // No exact match found
    console.log(`ℹ️ No company found for domain: ${domain}`);
    return NextResponse.json({ 
      suggestion: null, 
      reason: `No company found for domain '${domain}' in sales dashboard` 
    });
    
  } catch (error) {
    console.error('❌ API: Exception in suggest-company:', error);
    return NextResponse.json({ error: 'Failed to get company suggestion' }, { status: 500 });
  }
} 