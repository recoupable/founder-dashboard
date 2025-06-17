import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface DirectErrorLog {
  userEmail: string
  roomId: string
  errorMessage: string
  errorType: string
  toolName?: string
  lastMessage?: string
  stackTrace?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: Request) {
  try {
    const errorData: DirectErrorLog = await request.json()

    // Validate required fields
    if (!errorData.userEmail || !errorData.roomId || !errorData.errorMessage) {
      return NextResponse.json({ 
        error: 'Missing required fields: userEmail, roomId, errorMessage' 
      }, { status: 400 })
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Generate a unique identifier for this error
    const errorId = Date.now() + Math.random().toString(36).substr(2, 9)

    console.log(`🚨 Direct error log: ${errorData.userEmail} - ${errorData.toolName || 'Unknown'}`)
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from('error_logs')
      .insert({
        raw_message: formatErrorMessage(errorData),
        telegram_message_id: parseInt(errorId.replace(/\D/g, '').slice(0, 10)), // Convert to numeric ID
        user_email: errorData.userEmail,
        room_id: errorData.roomId,
        error_timestamp: new Date().toISOString(),
        error_message: errorData.errorMessage,
        error_type: errorData.errorType,
        tool_name: errorData.toolName || extractToolName(errorData.errorMessage),
        last_message: errorData.lastMessage,
        stack_trace: errorData.stackTrace
      })
      .select()

    if (error) {
      console.error('❌ Error inserting direct log to Supabase:', error)
      return NextResponse.json({ 
        error: 'Failed to log error to database',
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Successfully logged error directly to database')

    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
      errorId: data[0].id,
      loggedAt: data[0].created_at
    })

  } catch (error) {
    console.error('❌ Direct error logging failed:', error)
    return NextResponse.json({ 
      error: 'Failed to process error log',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

function formatErrorMessage(errorData: DirectErrorLog): string {
  const timestamp = new Date().toISOString()
  
  return `❌ Error Alert (Direct Log)
From: ${errorData.userEmail}
Room ID: ${errorData.roomId}
Time: ${timestamp}

Error Message:
${errorData.errorMessage}

Error Type: ${errorData.errorType}

${errorData.stackTrace ? `Stack Trace:
\`\`\`
${errorData.stackTrace}
\`\`\`` : ''}

${errorData.lastMessage ? `Last Message:
${errorData.lastMessage}` : ''}

${errorData.metadata ? `Metadata:
${JSON.stringify(errorData.metadata, null, 2)}` : ''}`
}

function extractToolName(errorText: string): string | null {
  // Look for "Error executing tool X" pattern
  const toolExecutionMatch = errorText.match(/Error executing tool\s+([a-zA-Z_]+)/i)
  if (toolExecutionMatch) {
    return toolExecutionMatch[1]
  }
  
  // Look for "Invalid arguments for tool X" pattern 
  const invalidArgsMatch = errorText.match(/Invalid arguments for tool\s+([a-zA-Z_]+)/i)
  if (invalidArgsMatch) {
    return invalidArgsMatch[1]
  }
  
  // Look for specific known tools in the error text
  if (errorText.includes('send_email')) return 'send_email'
  if (errorText.includes('artist_deep_research')) return 'artist_deep_research' 
  if (errorText.includes('artist_research')) return 'artist_research'
  if (errorText.includes('get_spotify_artist_top_tracks')) return 'get_spotify_artist_top_tracks'
  if (errorText.includes('get_spotify_top_tracks')) return 'get_spotify_top_tracks'
  if (errorText.includes('deep_research')) return 'deep_research'
  
  return null
}

// GET endpoint to show API documentation
export async function GET() {
  return NextResponse.json({
    name: 'Direct Error Logging API',
    description: 'Log errors directly to the database without relying on Telegram',
    usage: {
      method: 'POST',
      endpoint: '/api/log-error-direct',
      required_fields: ['userEmail', 'roomId', 'errorMessage', 'errorType'],
      optional_fields: ['toolName', 'lastMessage', 'stackTrace', 'metadata'],
      example: {
        userEmail: 'user@example.com',
        roomId: 'room-123-456',
        errorMessage: 'Error executing tool get_spotify_top_tracks: API request failed with status 502',
        errorType: 'AI_ToolExecutionError',
        toolName: 'get_spotify_top_tracks',
        lastMessage: 'Can you find the top tracks?',
        stackTrace: 'Error at line 1...',
        metadata: { userId: '123', sessionId: 'abc' }
      }
    },
    benefits: [
      'No dependency on Telegram API',
      'Immediate error logging',
      'More reliable than webhook/polling',
      'Can be called from any service',
      'Structured error data'
    ]
  })
} 