import { createClient } from '@supabase/supabase-js'

// Simple message interface to avoid external dependencies
interface SimpleMessage {
  content?: string;
  role?: string;
}

export interface ErrorContext {
  email?: string;
  roomId?: string;
  messages?: SimpleMessage[];
  path: string;
  error: SerializedError;
}

// Flexible SerializedError interface - adjust based on your actual structure
export interface SerializedError {
  message: string;
  name?: string;
  stack?: string;
  code?: string | number;
  type?: string;
  details?: Record<string, unknown>;
}

/**
 * logErrorToSupabase(context: ErrorContext): Promise<boolean>
 * Logs errors directly to Supabase error_logs table.
 * Maps ErrorContext to database schema and handles duplicate prevention.
 * Used in error handling flows to provide immediate error tracking.
 */
export async function logErrorToSupabase(context: ErrorContext): Promise<boolean> {
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase configuration missing for error logging')
      return false
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Extract the last user message for context
    const lastMessage = context.messages && context.messages.length > 0 
      ? context.messages[context.messages.length - 1]?.content || null
      : null

    // Generate a unique identifier for deduplication
    const errorFingerprint = generateErrorFingerprint(context)
    
    // Check for recent duplicate (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: existing } = await supabase
      .from('error_logs')
      .select('id')
      .eq('telegram_message_id', errorFingerprint)
      .gte('created_at', fiveMinutesAgo)
      .single()

    if (existing) {
      console.log(`⏭️ Duplicate error prevented: ${context.email} - ${extractToolName(context)}`)
      return true // Still considered success
    }

    // Format the error for storage
    const formattedMessage = formatErrorForDatabase(context)
    
    console.log(`🚨 Logging error to Supabase: ${context.email} - ${extractToolName(context)}`)
    
    // Insert into Supabase
    const { error } = await supabase
      .from('error_logs')
      .insert({
        raw_message: formattedMessage,
        telegram_message_id: errorFingerprint,
        user_email: context.email || null,
        room_id: context.roomId || null,
        error_timestamp: new Date().toISOString(),
        error_message: context.error.message,
        error_type: context.error.name || context.error.type || 'Error',
        tool_name: extractToolName(context),
        last_message: lastMessage,
        stack_trace: context.error.stack || null
      })

    if (error) {
      console.error('❌ Failed to log error to Supabase:', error)
      return false
    }

    console.log('✅ Successfully logged error to Supabase')
    return true

  } catch (err) {
    console.error('❌ Error in logErrorToSupabase:', err)
    return false
  }
}

/**
 * Enhanced error notification that logs to both Supabase and Telegram
 */
export async function logErrorWithTelegram(
  context: ErrorContext,
  sendToTelegram: (message: string) => Promise<void>
): Promise<{ supabaseSuccess: boolean; telegramSuccess: boolean }> {
  
  // Log to Supabase first (more reliable)
  const supabaseSuccess = await logErrorToSupabase(context)
  
  // Then send to Telegram
  let telegramSuccess = false
  try {
    const message = formatErrorForTelegram(context)
    await sendToTelegram(message)
    telegramSuccess = true
  } catch (err) {
    console.error('❌ Failed to send to Telegram:', err)
  }

  return { supabaseSuccess, telegramSuccess }
}

// Helper functions

function generateErrorFingerprint(context: ErrorContext): number {
  // Create a consistent fingerprint for deduplication
  const content = `${context.email}-${context.roomId}-${context.error.message}-${context.path}`
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

function extractToolName(context: ErrorContext): string | null {
  const errorText = context.error.message || ''
  const path = context.path || ''
  
  // Look for tool names in error message
  const toolPatterns = [
    /Error executing tool\s+([a-zA-Z_]+)/i,
    /Invalid arguments for tool\s+([a-zA-Z_]+)/i,
    /Tool\s+([a-zA-Z_]+)\s+failed/i,
    /([a-zA-Z_]+)\s+tool error/i,
  ]
  
  for (const pattern of toolPatterns) {
    const match = errorText.match(pattern)
    if (match) return match[1]
  }
  
  // Extract from path if it contains tool references
  if (path.includes('tool')) {
    const pathMatch = path.match(/\/([a-zA-Z_]+)/)
    if (pathMatch) return pathMatch[1]
  }
  
  // Check for specific known tools
  const knownTools = [
    'send_email', 'artist_deep_research', 'artist_research', 
    'get_spotify_top_tracks', 'get_spotify_artist_top_tracks',
    'deep_research', 'search_web', 'analyze_content'
  ]
  
  for (const tool of knownTools) {
    if (errorText.toLowerCase().includes(tool.toLowerCase())) {
      return tool
    }
  }
  
  return null
}

function formatErrorForDatabase(context: ErrorContext): string {
  const timestamp = new Date().toISOString()
  
  return `❌ Error Alert (Direct API Log)
From: ${context.email || 'Unknown'}
Room ID: ${context.roomId || 'Unknown'}
Path: ${context.path}
Time: ${timestamp}

Error Message:
${context.error.message}

Error Type: ${context.error.name || context.error.type || 'Error'}

${context.error.stack ? `Stack Trace:
\`\`\`
${context.error.stack}
\`\`\`` : ''}

${context.messages && context.messages.length > 0 ? `Last Message:
${context.messages[context.messages.length - 1]?.content || 'No content'}` : ''}`
}

function formatErrorForTelegram(context: ErrorContext): string {
  // Reuse the existing format or create a similar one
  return formatErrorForDatabase(context)
} 