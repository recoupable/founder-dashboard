import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    
    if (!BOT_TOKEN) {
      return NextResponse.json({ 
        error: 'Missing TELEGRAM_BOT_TOKEN environment variable' 
      }, { status: 500 })
    }

    const { webhookUrl } = await request.json()
    
    if (!webhookUrl) {
      return NextResponse.json({ 
        error: 'Please provide webhookUrl in the request body' 
      }, { status: 400 })
    }

    // Validate webhook URL
    try {
      new URL(webhookUrl)
    } catch {
      return NextResponse.json({ 
        error: 'Invalid webhook URL provided' 
      }, { status: 400 })
    }

    console.log('🔗 Setting up Telegram webhook:', webhookUrl)

    // Set the webhook
    const setWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`
    const webhookResponse = await fetch(setWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ['message', 'channel_post'], // Only receive messages and channel posts
        drop_pending_updates: true // Clear any pending updates
      })
    })

    const webhookResult = await webhookResponse.json()

    if (!webhookResult.ok) {
      console.error('❌ Failed to set webhook:', webhookResult)
      return NextResponse.json({ 
        error: `Failed to set webhook: ${webhookResult.description}`,
        details: webhookResult
      }, { status: 500 })
    }

    console.log('✅ Webhook set successfully')

    // Get webhook info to confirm
    const getWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    const infoResponse = await fetch(getWebhookUrl)
    const webhookInfo = await infoResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Telegram webhook configured successfully',
      webhook: {
        url: webhookInfo.result?.url,
        hasCustomCertificate: webhookInfo.result?.has_custom_certificate,
        pendingUpdateCount: webhookInfo.result?.pending_update_count,
        lastErrorDate: webhookInfo.result?.last_error_date,
        lastErrorMessage: webhookInfo.result?.last_error_message,
        maxConnections: webhookInfo.result?.max_connections,
        allowedUpdates: webhookInfo.result?.allowed_updates
      }
    })

  } catch (error) {
    console.error('❌ Error setting up webhook:', error)
    return NextResponse.json({ 
      error: 'Failed to setup webhook',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// GET endpoint to check current webhook status
export async function GET() {
  try {
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    
    if (!BOT_TOKEN) {
      return NextResponse.json({ 
        error: 'Missing TELEGRAM_BOT_TOKEN environment variable' 
      }, { status: 500 })
    }

    const getWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    const response = await fetch(getWebhookUrl)
    const webhookInfo = await response.json()

    if (!webhookInfo.ok) {
      return NextResponse.json({ 
        error: 'Failed to get webhook info',
        details: webhookInfo.description 
      }, { status: 500 })
    }

    const info = webhookInfo.result
    const isConfigured = !!info.url

    return NextResponse.json({
      configured: isConfigured,
      webhook: {
        url: info.url || null,
        hasCustomCertificate: info.has_custom_certificate,
        pendingUpdateCount: info.pending_update_count,
        lastErrorDate: info.last_error_date,
        lastErrorMessage: info.last_error_message,
        maxConnections: info.max_connections,
        allowedUpdates: info.allowed_updates
      },
      recommendations: isConfigured ? 
        ['Webhook is configured! Errors should sync automatically.'] :
        [
          'Webhook not configured. Run POST /api/setup-telegram-webhook to enable automatic sync.',
          'Use your deployed domain + /api/telegram-webhook as the webhook URL'
        ]
    })

  } catch (error) {
    console.error('❌ Error getting webhook info:', error)
    return NextResponse.json({ 
      error: 'Failed to get webhook info',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
} 