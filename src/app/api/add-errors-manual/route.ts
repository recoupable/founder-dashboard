import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const { rawErrors } = await request.json()
    
    if (!rawErrors || !Array.isArray(rawErrors)) {
      return NextResponse.json({ 
        error: 'Please provide an array of raw error messages' 
      }, { status: 400 })
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let insertedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    // Process each raw error message
    for (let i = 0; i < rawErrors.length; i++) {
      const rawMessage = rawErrors[i]
      
      try {
        // Parse the error message
        const parsed = parseErrorMessage(rawMessage)
        
        // Generate a fake telegram message ID based on content hash
        const fakeMessageId = generateMessageId(rawMessage)
        
        // Check if this message already exists (based on content similarity)
        const { data: existing } = await supabase
          .from('error_logs')
          .select('id')
          .eq('telegram_message_id', fakeMessageId)
          .single()

        if (existing) {
          skippedCount++
          continue // Skip if already exists
        }

        // Insert into Supabase
        const { error } = await supabase
          .from('error_logs')
          .insert({
            raw_message: rawMessage,
            telegram_message_id: fakeMessageId,
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
          errors.push(`Error ${i + 1}: ${error.message}`)
        } else {
          insertedCount++
        }
      } catch (parseError) {
        errors.push(`Error ${i + 1}: Failed to parse - ${parseError}`)
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount,
      skippedCount,
      totalProvided: rawErrors.length,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Error adding manual errors:', error)
    return NextResponse.json({ 
      error: 'Failed to add error data' 
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
  
  // Check for rate limit errors
  if (errorText.includes('rate limit') || errorText.includes('200,000 input tokens per minute')) {
    return 'rate_limiting'
  }
  
  // Check for JavaScript object errors  
  if (errorText.includes('[object Object]')) {
    return 'javascript_error'
  }
  
  // Look for specific known tools in the error text
  if (errorText.includes('send_email')) return 'send_email'
  if (errorText.includes('artist_deep_research')) return 'artist_deep_research' 
  if (errorText.includes('artist_research')) return 'artist_research'
  if (errorText.includes('get_spotify_top_tracks')) return 'get_spotify_top_tracks'
  if (errorText.includes('deep_research')) return 'deep_research'
  
  return null
}

function generateMessageId(text: string): number {
  // Generate a consistent fake message ID based on content hash
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
} 