import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    // Check if this is coming from a valid cron source
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Call our sync endpoint
    const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sync-telegram-errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ days: 1 }), // Only sync last 24 hours for efficiency
    })

    const syncResult = await syncResponse.json()

    if (!syncResponse.ok) {
      throw new Error(`Sync failed: ${syncResult.error}`)
    }

    console.log('✅ Cron sync completed:', syncResult)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...syncResult
    })

  } catch (error) {
    console.error('❌ Cron sync failed:', error)
    return NextResponse.json({ 
      error: 'Cron sync failed',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Also allow POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
} 