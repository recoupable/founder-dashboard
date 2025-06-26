import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface ErrorLog {
  id: string
  user_email?: string
  room_id?: string
  error_timestamp: string
  error_message: string
  error_type: string
  tool_name?: string
  last_message?: string
  stack_trace?: string
  created_at: string
}

interface ErrorReport {
  date: string
  totalMessages: number
  totalErrors: number
  errorRate: number
  errorBreakdown: Record<string, number>
  rawMessages: ErrorLog[]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Calculate time range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Query error logs from Supabase
    const { data: errorLogs, error } = await supabase
      .from('error_logs')
      .select('*')
      .gte('error_timestamp', startDate.toISOString())
      .order('error_timestamp', { ascending: false })

    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }

    // Generate error breakdown by tool
    const errorBreakdown: Record<string, number> = {}
    
    errorLogs?.forEach(log => {
      const toolName = log.tool_name || 'Unknown'
      errorBreakdown[toolName] = (errorBreakdown[toolName] || 0) + 1
    })

    const errorReport: ErrorReport = {
      date: new Date().toISOString().split('T')[0],
      totalMessages: 0, // Not tracking messages anymore
      totalErrors: errorLogs?.length || 0,
      errorRate: 0, // No longer calculating error rate since we're not tracking total messages
      errorBreakdown,
      rawMessages: errorLogs || []
    }
    
    return NextResponse.json(errorReport)
    
  } catch (error) {
    console.error('Error fetching error logs:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch error data' 
    }, { status: 500 })
  }
} 