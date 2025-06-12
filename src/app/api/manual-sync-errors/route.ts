import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { days = 7 } = await request.json()
    
    // Call our sync endpoint
    const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/sync-telegram-errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ days }),
    })

    const syncResult = await syncResponse.json()

    if (!syncResponse.ok) {
      throw new Error(`Sync failed: ${syncResult.error}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Manual sync completed successfully',
      ...syncResult
    })

  } catch (error) {
    console.error('Manual sync failed:', error)
    return NextResponse.json({ 
      error: 'Manual sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 