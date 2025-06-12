import { NextResponse } from 'next/server'

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

interface ErrorReport {
  date: string
  totalMessages: number
  totalErrors: number
  errorRate: number
  errorBreakdown: Record<string, number>
  rawMessages: TelegramMessage[]
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '7')
    
    // You'll need to set these environment variables
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID // Your Recoup channel ID
    
    if (!BOT_TOKEN || !CHAT_ID) {
      return NextResponse.json({ 
        error: 'Missing Telegram credentials. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID' 
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

    // Parse error messages
    const errorReport = parseErrorMessages(recentMessages)
    
    return NextResponse.json(errorReport)
    
  } catch (error) {
    console.error('Error fetching Telegram messages:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch error data' 
    }, { status: 500 })
  }
}

function parseErrorMessages(messages: TelegramMessage[]): ErrorReport {
  let totalErrors = 0
  const errorBreakdown: Record<string, number> = {}

  messages.forEach(message => {
    const text = message.text || ''
    
    // Only count errors - look for the ❌ Error Alert pattern
    if (text.includes('❌ Error Alert') || text.includes('Error Alert')) {
      totalErrors++
      
      // Extract tool name for breakdown
      const toolName = extractToolName(text)
      if (toolName) {
        errorBreakdown[toolName] = (errorBreakdown[toolName] || 0) + 1
      }
    }
  })

  return {
    date: new Date().toISOString().split('T')[0],
    totalMessages: 0, // Not tracking messages anymore
    totalErrors,
    errorRate: 0, // No longer calculating error rate since we're not tracking total messages
    errorBreakdown,
    rawMessages: messages
  }
}

function extractToolName(errorText: string): string | null {
  // Extract tool names from error messages based on your actual format
  
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
  
  // Fallback to error type if no tool found
  const errorTypeMatch = errorText.match(/Error Type:\s*([^\n\r]+)/i)
  return errorTypeMatch ? errorTypeMatch[1].trim() : 'Unknown'
} 