import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface TelegramMessage {
  message_id: number
  date: number
  text: string
  from?: {
    username?: string
    id?: number
  }
  chat: {
    id: number | string
    type: string
    title?: string
  }
}

interface TelegramUpdate {
  message?: TelegramMessage
  channel_post?: TelegramMessage
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

    console.log('🔄 Starting Telegram sync...', { days, CHAT_ID })

    // First, get bot info to verify connection
    const botInfoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`
    const botInfoResponse = await fetch(botInfoUrl)
    const botInfo = await botInfoResponse.json()
    
    if (!botInfo.ok) {
      console.error('❌ Bot info failed:', botInfo)
      return NextResponse.json({ 
        error: `Bot authentication failed: ${botInfo.description}` 
      }, { status: 500 })
    }
    
    console.log('✅ Bot info:', botInfo.result?.username, botInfo.result?.first_name)

    // Try multiple methods to get messages
    const allMessages: TelegramMessage[] = []
    
    // Method 1: getUpdates (works for groups and some channels)
    try {
      const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=100`
      const response = await fetch(telegramUrl)
      const data = await response.json() as TelegramResponse

      if (data.ok) {
        console.log(`📨 getUpdates returned ${data.result.length} updates`)
        
        // Filter for messages from our chat
        const chatMessages = data.result
          .map(update => update.message || update.channel_post)
          .filter((message): message is TelegramMessage => 
            message !== undefined && 
            message.chat.id.toString() === CHAT_ID
          )
        
        allMessages.push(...chatMessages)
        console.log(`📝 Found ${chatMessages.length} messages from our chat`)
      } else {
        console.warn('⚠️  getUpdates failed:', data.description)
      }
    } catch (error) {
      console.warn('⚠️  getUpdates error:', error)
    }

    // Method 2: Try getChatHistory if available (doesn't work with standard bot API)
    // This is mainly for debugging - showing we've tried multiple approaches
    
    // Method 3: If no messages found, provide debugging info
    if (allMessages.length === 0) {
      console.log('🔍 Debugging: No messages found. Checking chat accessibility...')
      
      // Try to get chat info
      try {
        const chatInfoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${CHAT_ID}`
        const chatInfoResponse = await fetch(chatInfoUrl)
        const chatInfo = await chatInfoResponse.json()
        
        if (chatInfo.ok) {
          console.log('✅ Chat info:', {
            title: chatInfo.result.title,
            type: chatInfo.result.type,
            memberCount: chatInfo.result.members_count
          })
        } else {
          console.error('❌ Chat info failed:', chatInfo.description)
          return NextResponse.json({ 
            error: `Cannot access chat: ${chatInfo.description}. Make sure the bot is added to the channel with proper permissions.`,
            chatId: CHAT_ID,
            suggestion: 'Add the bot to your Telegram channel and give it admin permissions to read messages.'
          }, { status: 500 })
        }
      } catch (error) {
        console.error('❌ Chat info error:', error)
      }
    }

    // Filter messages from the last N days
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000)

    const recentMessages = allMessages.filter(message => 
      message.date >= cutoffTimestamp
    )

    console.log(`🕒 Found ${recentMessages.length} recent messages (last ${days} days)`)

    // Filter only error messages
    const errorMessages = recentMessages.filter(message => {
      const text = message.text || ''
      return text.includes('❌ Error Alert') || text.includes('Error Alert')
    })

    console.log(`🚨 Found ${errorMessages.length} error messages`)

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
        console.log(`⏭️  Skipping existing message ${message.message_id}`)
        continue // Skip if already exists
      }

      // Parse the error message
      const parsed = parseErrorMessage(message.text || '')
      
      console.log(`💾 Inserting error from ${parsed.userEmail} - ${parsed.toolName}`)
      
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
        console.error('❌ Error inserting to Supabase:', error)
      } else {
        syncedCount++
        console.log(`✅ Synced error ${message.message_id}`)
      }
    }

    const result = {
      success: true,
      syncedCount,
      skippedCount,
      totalErrorMessages: errorMessages.length,
      totalMessages: allMessages.length,
      debugging: {
        chatId: CHAT_ID,
        botUsername: botInfo.result?.username,
        recentMessagesFound: recentMessages.length,
        cutoffDate: cutoffDate.toISOString()
      }
    }

    console.log('🎉 Sync completed:', result)
    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Error syncing Telegram messages:', error)
    return NextResponse.json({ 
      error: 'Failed to sync error data',
      details: error instanceof Error ? error.message : String(error)
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