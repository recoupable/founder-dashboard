import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    
    if (!BOT_TOKEN) {
      return NextResponse.json({ error: 'Missing TELEGRAM_BOT_TOKEN' }, { status: 500 })
    }

    // Get recent updates to see all available chats
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`
    const response = await fetch(telegramUrl)
    const data = await response.json()

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`)
    }

    // Extract unique chats and their info
    const chats = new Map()
    data.result.forEach((update: { message?: { chat: { id: number | string, type: string, title?: string, first_name?: string, username?: string }, text?: string } }) => {
      if (update.message) {
        const chat = update.message.chat
        chats.set(chat.id, {
          id: chat.id,
          type: chat.type,
          title: chat.title || chat.first_name || 'Unknown',
          username: chat.username || null,
          recentMessage: update.message.text?.substring(0, 100) + '...'
        })
      }
    })

    return NextResponse.json({
      currentChatId: process.env.TELEGRAM_CHAT_ID,
      availableChats: Array.from(chats.values()),
      totalUpdates: data.result.length,
      instruction: "Look for your Recoup error channel in the availableChats list and use that ID in TELEGRAM_CHAT_ID"
    })
    
  } catch (error) {
    console.error('Error debugging Telegram:', error)
    return NextResponse.json({ error: 'Failed to debug Telegram' }, { status: 500 })
  }
} 