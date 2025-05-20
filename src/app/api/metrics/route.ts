import { NextResponse } from 'next/server'
import { getActiveUsersCount } from '@/lib/privy'
import { getSalesPipelineValue } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch all metrics in parallel
    const [activeUsers, pipelineValue] = await Promise.all([
      getActiveUsersCount(),
      getSalesPipelineValue(),
    ])

    return NextResponse.json({
      payingCustomers: 0,
      activeUsers,
      pipelineValue,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching metrics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
} 