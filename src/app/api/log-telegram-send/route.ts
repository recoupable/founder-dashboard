import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const { 
      message, 
      userEmail, 
      roomId, 
      errorType, 
      toolName,
      lastMessage,
      stackTrace 
    } = await request.json()

    console.log('📨 Recoup app sent message to Telegram:', { userEmail, errorType })

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Extract timestamp from message or use current time
    const timeMatch = message.match(/Time:\s*([^\n\r]+)/)
    const errorTimestamp = timeMatch ? new Date(timeMatch[1].trim()) : new Date()

    // Insert into Supabase immediately when Recoup app sends to Telegram
    const { error } = await supabase
      .from('error_logs')
      .insert({
        raw_message: message,
        telegram_message_id: null, // No Telegram message ID yet
        user_email: userEmail,
        room_id: roomId,
        error_timestamp: errorTimestamp,
        error_message: extractErrorMessage(message),
        error_type: errorType,
        tool_name: toolName,
        last_message: lastMessage,
        stack_trace: stackTrace,
        source: 'direct_from_app' // Mark as captured at source
      })

    if (error) {
      console.error('❌ Error logging to Supabase:', error)
      return NextResponse.json({ 
        error: 'Failed to log error',
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Successfully logged error from Recoup app')

    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in log-telegram-send:', error)
    return NextResponse.json({ 
      error: 'Failed to process request',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

function extractErrorMessage(text: string): string | null {
  const errorMsgMatch = text.match(/Error Message:\s*([\s\S]*?)(?=Error Type:|Stack Trace:|Last Message:|$)/)
  return errorMsgMatch ? errorMsgMatch[1].trim() : null
} 