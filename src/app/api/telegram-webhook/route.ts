import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface TelegramWebhookUpdate {
  update_id: number
  message?: {
    message_id: number
    date: number
    text: string
    chat: {
      id: number
      type: string
      title?: string
    }
    from?: {
      id: number
      username?: string
    }
  }
  channel_post?: {
    message_id: number
    date: number
    text: string
    chat: {
      id: number
      type: string
      title?: string
    }
  }
}

interface ParsedError {
  userEmail: string | null
  roomId: string | null
  errorTimestamp: Date | null
  errorMessage: string | null
  errorType: string | null
  toolName: string | null
  lastMessage: string | null
  stackTrace: string | null
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 Telegram webhook received')
    
    const update: TelegramWebhookUpdate = await request.json()
    
    // Verify this is from our target chat
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID
    if (!CHAT_ID) {
      console.log('❌ No TELEGRAM_CHAT_ID configured')
      return NextResponse.json({ ok: true }) // Always return ok to Telegram
    }

    // Handle both regular messages and channel posts
    const message = update.message || update.channel_post
    if (!message) {
      console.log('📭 No message in update')
      return NextResponse.json({ ok: true })
    }

    // Check if it's from our target chat
    if (message.chat.id.toString() !== CHAT_ID) {
      console.log(`🚫 Message from different chat: ${message.chat.id} (expected: ${CHAT_ID})`)
      return NextResponse.json({ ok: true })
    }

    const text = message.text || ''
    
    // Only process error messages
    if (!text.includes('❌ Error Alert') && !text.includes('Error Alert')) {
      console.log('📝 Message is not an error alert')
      return NextResponse.json({ ok: true })
    }

    console.log('🚨 Processing error message from webhook')

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Check if this message is already in the database
    const { data: existing } = await supabase
      .from('error_logs')
      .select('id')
      .eq('telegram_message_id', message.message_id)
      .single()

    if (existing) {
      console.log(`⏭️ Message ${message.message_id} already exists in database`)
      return NextResponse.json({ ok: true })
    }

    // Parse the error message
    const parsed = parseErrorMessage(text)
    
    console.log(`💾 Inserting error from ${parsed.userEmail} - ${parsed.toolName}`)
    
    // Insert into Supabase
    const { error } = await supabase
      .from('error_logs')
      .insert({
        raw_message: text,
        telegram_message_id: message.message_id,
        user_email: parsed.userEmail,
        room_id: parsed.roomId,
        error_timestamp: parsed.errorTimestamp,
        error_message: parsed.errorMessage,
        error_type: parsed.errorType,
        tool_name: parsed.toolName,
        last_message: parsed.lastMessage,
        stack_trace: parsed.stackTrace
      })

    if (error) {
      console.error('❌ Error inserting to Supabase:', error)
    } else {
      console.log(`✅ Successfully synced error ${message.message_id} via webhook`)
    }

    // Always return success to Telegram
    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    // Always return success even on error to prevent Telegram retries
    return NextResponse.json({ ok: true })
  }
}

function parseErrorMessage(text: string): ParsedError {
  // Extract From: email
  const emailMatch = text.match(/From:\s*([^\n\r]+)/);
  const userEmail = emailMatch ? emailMatch[1].trim().replace(/\\/g, '') : null;
  
  // Extract Room ID
  const roomMatch = text.match(/Room ID:\s*([^\n\r]+)/);
  const roomId = roomMatch ? roomMatch[1].trim().replace(/\\/g, '') : null;
  
  // Extract Time
  const timeMatch = text.match(/Time:\s*([^\n\r]+)/);
  const errorTimestamp = timeMatch ? new Date(timeMatch[1].trim().replace(/\\/g, '')) : null;
  
  // Extract Error Message
  const errorMsgMatch = text.match(/Error Message:\s*([\s\S]*?)(?=Error Type:|Stack Trace:|Last Message:|$)/);
  const errorMessage = errorMsgMatch ? errorMsgMatch[1].trim() : null;
  
  // Extract Error Type
  const errorTypeMatch = text.match(/Error Type:\s*([^\n\r]+)/);
  const errorType = errorTypeMatch ? errorTypeMatch[1].trim() : null;
  
  // Extract Last Message
  const lastMsgMatch = text.match(/Last Message:\s*([\s\S]*?)$/);
  const lastMessage = lastMsgMatch ? lastMsgMatch[1].trim() : null;
  
  // Extract Stack Trace
  const stackMatch = text.match(/Stack Trace:\s*```([\s\S]*?)```/);
  const stackTrace = stackMatch ? stackMatch[1].trim() : null;
  
  // Extract Tool Name
  const toolName = extractToolName(errorMessage || text);
  
  return {
    userEmail,
    roomId, 
    errorTimestamp,
    errorMessage,
    errorType,
    toolName,
    lastMessage,
    stackTrace
  };
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