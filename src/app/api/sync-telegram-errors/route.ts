import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface TelegramMessage {
  message_id: number
  date: number
  text: string
  from?: {
    username?: string
  }
  chat: {
    id: number | string
  }
}

interface TelegramUpdate {
  message?: TelegramMessage
}

interface TelegramResponse {
  ok: boolean
  result: TelegramUpdate[]
  description?: string
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

export async function POST(request: Request) {
  try {
    const { days = 7 } = await request.json()
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get Telegram credentials
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID
    
    if (!BOT_TOKEN || !CHAT_ID) {
      return NextResponse.json({ 
        error: 'Missing Telegram credentials' 
      }, { status: 500 })
    }

    // Fetch recent messages from Telegram
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`
    const response = await fetch(telegramUrl)
    const data = await response.json() as TelegramResponse

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`)
    }

    // Filter messages from the last N days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000)

    const recentMessages = data.result
      .filter((update: TelegramUpdate) => 
        update.message && 
        update.message.chat.id.toString() === CHAT_ID &&
        update.message.date >= cutoffTimestamp
      )
      .map((update: TelegramUpdate) => update.message!)
      .filter((message): message is TelegramMessage => message !== undefined)

    // Filter only error messages
    const errorMessages = recentMessages.filter(message => {
      const text = message.text || ''
      return text.includes('❌ Error Alert') || text.includes('Error Alert')
    })

    let syncedCount = 0
    let skippedCount = 0

    // Process each error message
    for (const message of errorMessages) {
      // Check if this message is already in the database
      const { data: existing } = await supabase
        .from('error_logs')
        .select('id')
        .eq('telegram_message_id', message.message_id)
        .single()

      if (existing) {
        skippedCount++
        continue // Skip if already exists
      }

      // Parse the error message
      const parsed = parseErrorMessage(message.text || '')
      
      // Insert into Supabase
      const { error } = await supabase
        .from('error_logs')
        .insert({
          raw_message: message.text,
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
        console.error('Error inserting to Supabase:', error)
      } else {
        syncedCount++
      }
    }

    return NextResponse.json({
      success: true,
      syncedCount,
      skippedCount,
      totalErrorMessages: errorMessages.length
    })

  } catch (error) {
    console.error('Error syncing Telegram messages:', error)
    return NextResponse.json({ 
      error: 'Failed to sync error data' 
    }, { status: 500 })
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
  // Extract tool names from error messages
  
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
  if (errorText.includes('get_spotify_top_tracks')) return 'get_spotify_top_tracks'
  if (errorText.includes('deep_research')) return 'deep_research'
  
  return null
} 