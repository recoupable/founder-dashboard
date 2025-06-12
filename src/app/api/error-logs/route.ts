import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface ErrorSummary {
  totalErrors: number
  errorBreakdown: Record<string, number>
  timeRange: string
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

    const summary: ErrorSummary = {
      totalErrors: errorLogs?.length || 0,
      errorBreakdown,
      timeRange: `${days} days`
    }

    // Also return the detailed errors for user error badge functionality
    return NextResponse.json({
      ...summary,
      errors: errorLogs || []
    })
    
  } catch (error) {
    console.error('Error fetching error logs:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch error data' 
    }, { status: 500 })
  }
}

// GET detailed error logs with pagination
export async function POST(request: Request) {
  try {
    const { 
      days = 7, 
      limit = 50, 
      offset = 0,
      toolName = null,
      userEmail = null 
    } = await request.json()
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Calculate time range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    
    // Build query
    let query = supabase
      .from('error_logs')
      .select('*')
      .gte('error_timestamp', startDate.toISOString())
      .order('error_timestamp', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add filters
    if (toolName) {
      query = query.eq('tool_name', toolName)
    }
    
    if (userEmail) {
      query = query.eq('user_email', userEmail)
    }

    const { data: errorLogs, error } = await query

    if (error) {
      throw new Error(`Supabase error: ${error.message}`)
    }

    return NextResponse.json({
      errors: errorLogs || [],
      total: errorLogs?.length || 0,
      limit,
      offset
    })
    
  } catch (error) {
    console.error('Error fetching detailed error logs:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch detailed error data' 
    }, { status: 500 })
  }
} 