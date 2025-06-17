import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get recent error logs to see if webhook is working
    const { data: recentErrors, error } = await supabase
      .from('error_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.error('Error fetching recent errors:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch recent errors',
        details: error.message 
      }, { status: 500 })
    }

    // Check webhook configuration
    const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
    
    let webhookInfo = null
    if (BOT_TOKEN) {
      try {
        const getWebhookUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
        const response = await fetch(getWebhookUrl)
        const webhookData = await response.json()
        
        if (webhookData.ok) {
          webhookInfo = webhookData.result
        }
      } catch (err) {
        console.error('Failed to get webhook info:', err)
      }
    }

    return NextResponse.json({
      status: 'Webhook Debug Info',
      timestamp: new Date().toISOString(),
      webhook: {
        configured: !!webhookInfo?.url,
        url: webhookInfo?.url,
        pendingUpdates: webhookInfo?.pending_update_count,
        lastErrorDate: webhookInfo?.last_error_date,
        lastErrorMessage: webhookInfo?.last_error_message,
        allowedUpdates: webhookInfo?.allowed_updates
      },
      recentErrors: {
        count: recentErrors?.length || 0,
        latest: recentErrors?.[0] ? {
          id: recentErrors[0].id,
          userEmail: recentErrors[0].user_email,
          errorType: recentErrors[0].error_type,
          toolName: recentErrors[0].tool_name,
          createdAt: recentErrors[0].created_at,
          telegramMessageId: recentErrors[0].telegram_message_id
        } : null,
        allRecent: recentErrors?.map(error => ({
          id: error.id,
          userEmail: error.user_email,
          errorType: error.error_type,
          toolName: error.tool_name,
          createdAt: error.created_at,
          telegramMessageId: error.telegram_message_id
        }))
      },
      testInstructions: [
        'Send any message to your Telegram error channel',
        'Send a fake error message with "❌ Error Alert" to test full flow',
        'Check this endpoint again to see if new errors appeared',
        'Webhook will now log ALL messages, not just errors'
      ]
    })

  } catch (error) {
    console.error('Webhook debug error:', error)
    return NextResponse.json({ 
      error: 'Failed to get debug info',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 