import { NextResponse } from 'next/server'
import { getPayingCustomersCount } from '@/lib/stripe'
import { getActiveUsersCount } from '@/lib/privy'
import { getSalesPipelineValue } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch all metrics in parallel
    const [payingCustomers, activeUsers, pipelineValue] = await Promise.all([
      getPayingCustomersCount(),
      getActiveUsersCount(),
      getSalesPipelineValue(),
    ])

    return NextResponse.json({
      payingCustomers,
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