import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { extractDomain } from '@/lib/userOrgMatcher';

export async function POST() {
  try {
    console.log('🔄 API: Starting user-company sync...');

    // 1. Get all sales pipeline customers with domains and company info
    const { data: customers, error: customersError } = await supabaseAdmin
      .from('sales_pipeline_customers')
      .select('domain, name, contact_email')
      .not('domain', 'is', null)
      .not('name', 'is', null);

    if (customersError) {
      console.error('❌ Error fetching customers:', customersError);
      return NextResponse.json({ error: customersError.message }, { status: 500 });
    }

    // 2. Get all user profiles 
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('admin_user_profiles')
      .select('id, email, company');

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    // 3. Create domain to company mapping
    const domainToCompany = new Map<string, string>();
    customers.forEach(customer => {
      if (customer.domain && customer.name) {
        domainToCompany.set(customer.domain, customer.name);
      }
    });

    console.log(`📊 Found ${domainToCompany.size} domain-company mappings`);

    // 4. Update user profiles that match domains and don't have companies
    const updates = [];
    let syncCount = 0;

    for (const profile of profiles) {
      // Skip if profile already has a company
      if (profile.company) continue;

      // Extract domain from user email
      const userDomain = extractDomain(profile.email);
      if (!userDomain) continue;

      // Check if we have a company for this domain
      const companyName = domainToCompany.get(userDomain);
      if (!companyName) continue;

      // Update the profile
      const { error: updateError } = await supabaseAdmin
        .from('admin_user_profiles')
        .update({ 
          company: companyName,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error(`❌ Error updating profile ${profile.email}:`, updateError);
      } else {
        console.log(`✅ Synced ${profile.email} → ${companyName}`);
        syncCount++;
        updates.push({
          email: profile.email,
          company: companyName,
          domain: userDomain
        });
      }
    }

    console.log(`🎉 Sync complete! Updated ${syncCount} user profiles`);

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${syncCount} user profiles with company data`,
      details: {
        totalCustomers: customers.length,
        totalProfiles: profiles.length,
        domainsFound: domainToCompany.size,
        profilesUpdated: syncCount,
        updates: updates
      }
    });

  } catch (error) {
    console.error('❌ API: Exception in sync-user-companies:', error);
    return NextResponse.json({ error: 'Failed to sync user companies' }, { status: 500 });
  }
} 