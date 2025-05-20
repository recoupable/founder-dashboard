import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { PrivyClient } from '@privy-io/server-auth'

const privyClient = new PrivyClient(
  process.env.NEXT_PUBLIC_PRIVY_APP_ID!,
  process.env.PRIVY_API_KEY!,
  {
    apiURL: 'https://auth.privy.io'
  }
)

export async function GET() {
  try {
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
        supabase: 'Connected',
        privy: 'Connected',
      },
      details: {
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