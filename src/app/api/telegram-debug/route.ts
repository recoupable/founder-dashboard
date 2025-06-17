import { NextResponse } from 'next/server'

interface TelegramUpdate {
  message?: {
    chat: {
      id: number | string
      type: string
      title?: string
      first_name?: string
      username?: string
    }
    text?: string
  }
  channel_post?: {
    chat: {
      id: number | string
      type: string
      title?: string
      first_name?: string
      username?: string
    }
    text?: string
  }
}

export async function GET() {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID
    
    if (!BOT_TOKEN) {
      return NextResponse.json({ error: 'Missing TELEGRAM_BOT_TOKEN' }, { status: 500 })
    }

    // Get bot info
    const botInfoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getMe`
    const botInfoResponse = await fetch(botInfoUrl)
    const botInfo = await botInfoResponse.json()

    if (!botInfo.ok) {
      return NextResponse.json({ 
        error: 'Bot authentication failed',
        details: botInfo.description 
      }, { status: 500 })
    }

    // Get recent updates to see all available chats
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=100`
    const response = await fetch(telegramUrl)
    const data = await response.json()

    if (!data.ok) {
      return NextResponse.json({ 
        error: 'Failed to get updates',
        details: data.description 
      }, { status: 500 })
    }

    // Extract unique chats and their info
    const chats = new Map()
    const messageTypes = new Map()
    let totalUpdates = 0

    data.result.forEach((update: TelegramUpdate) => {
      totalUpdates++
      
      // Handle both regular messages and channel posts
      const message = update.message || update.channel_post
      
      if (message) {
        const chat = message.chat
        const updateType = update.message ? 'message' : 'channel_post'
        
        chats.set(chat.id, {
          id: chat.id,
          type: chat.type,
          title: chat.title || chat.first_name || chat.username || 'Unknown',
          username: chat.username || null,
          recentMessage: message.text?.substring(0, 100) + '...',
          updateType,
          isErrorMessage: message.text?.includes('❌ Error Alert') || false
        })
        
        messageTypes.set(updateType, (messageTypes.get(updateType) || 0) + 1)
      }
    })

    // Try to get specific chat info if CHAT_ID is set
    let targetChatInfo = null
    if (CHAT_ID) {
      try {
        const chatInfoUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=${CHAT_ID}`
        const chatInfoResponse = await fetch(chatInfoUrl)
        const chatInfo = await chatInfoResponse.json()
        
        if (chatInfo.ok) {
          targetChatInfo = {
            id: chatInfo.result.id,
            title: chatInfo.result.title,
            type: chatInfo.result.type,
            username: chatInfo.result.username,
            description: chatInfo.result.description,
            memberCount: chatInfo.result.members_count,
            permissions: chatInfo.result.permissions
          }
        } else {
          targetChatInfo = {
            error: chatInfo.description,
            suggestion: 'Bot might not be added to this chat or lacks permissions'
          }
        }
      } catch (error) {
        targetChatInfo = {
          error: 'Failed to get chat info',
          details: error instanceof Error ? error.message : String(error)
        }
      }
    }

    // Analyze the situation
    const analysis = {
      botWorking: botInfo.ok,
      updatesReceived: totalUpdates,
      chatsFound: chats.size,
      targetChatConfigured: !!CHAT_ID,
      targetChatAccessible: targetChatInfo && !targetChatInfo.error,
      messageTypesFound: Object.fromEntries(messageTypes),
      errorMessagesFound: Array.from(chats.values()).filter(c => c.isErrorMessage).length
    }

    // Provide recommendations
    const recommendations = []
    
    if (!CHAT_ID) {
      recommendations.push('Set TELEGRAM_CHAT_ID environment variable with your error channel ID')
    }
    
    if (totalUpdates === 0) {
      recommendations.push('No updates received. Bot might not be added to any chats or no recent activity')
    }
    
    if (targetChatInfo?.error) {
      recommendations.push(`Cannot access target chat: ${targetChatInfo.error}`)
      recommendations.push('Add the bot to your Telegram channel with admin permissions')
    }
    
    if (analysis.errorMessagesFound === 0 && totalUpdates > 0) {
      recommendations.push('No error messages found in recent updates. Check if errors are being sent to the correct chat')
    }

    return NextResponse.json({
      bot: {
        id: botInfo.result.id,
        username: botInfo.result.username,
        firstName: botInfo.result.first_name,
        canJoinGroups: botInfo.result.can_join_groups,
        canReadAllGroupMessages: botInfo.result.can_read_all_group_messages,
        supportsInlineQueries: botInfo.result.supports_inline_queries
      },
      configuration: {
        currentChatId: CHAT_ID,
        targetChatInfo
      },
      updates: {
        total: totalUpdates,
        messageTypes: Object.fromEntries(messageTypes),
        availableChats: Array.from(chats.values())
      },
      analysis,
      recommendations,
      troubleshooting: {
        commonIssues: [
          'Bot not added to the channel',
          'Bot lacks admin permissions in the channel',
          'Wrong CHAT_ID configured',
          'Channel is private and bot needs to be explicitly added',
          'Using getUpdates with channels (use webhooks instead for better reliability)'
        ],
        solutions: [
          '1. Add your bot to the Telegram channel',
          '2. Give the bot admin permissions',
          '3. Use the correct chat ID from availableChats list',
          '4. Consider using webhooks instead of polling',
          '5. For channels, make sure the bot can read messages'
        ]
      }
    })
    
  } catch (error) {
    console.error('Error debugging Telegram:', error)
    return NextResponse.json({ 
      error: 'Failed to debug Telegram',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 