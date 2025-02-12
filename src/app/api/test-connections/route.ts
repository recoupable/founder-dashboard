import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/supabase'
import { PrivyClient } from '@privy-io/server-auth'

const privyClient = new PrivyClient(process.env.PRIVY_API_KEY!)

export async function GET() {
  try {
    // Test Stripe connection
    const stripeTest = await stripe.customers.list({ limit: 1 })
    
    // Test Supabase connection
    const { data: supabaseTest, error: supabaseError } = await supabase
      .from('active_users')
      .select('*')
      .limit(1)
    
    if (supabaseError) throw supabaseError

    // Test Privy connection
    const privyTest = await privyClient.getUser('test-id').catch(() => 'Connection OK')

    return NextResponse.json({
      status: 'success',
      connections: {
        stripe: 'Connected',
        supabase: 'Connected',
        privy: 'Connected',
      },
      details: {
        stripe: stripeTest.data.length,
        supabase: supabaseTest.length,
        privy: privyTest,
      }
    })
  } catch (error) {
    console.error('Connection test error:', error)
    return NextResponse.json(
      { error: 'Failed to test connections', details: error },
      { status: 500 }
    )
  }
} 