import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface HistoricalErrorImport {
  source: 'telegram' | 'manual' | 'csv'
  errors: string[]
  dateRange?: {
    start: string
    end: string
  }
  overwriteDuplicates?: boolean
}

interface ParsedHistoricalError {
  userEmail: string | null
  roomId: string | null
  errorTimestamp: Date | null
  errorMessage: string | null
  errorType: string | null
  toolName: string | null
  lastMessage: string | null
  stackTrace: string | null
  originalText: string
}

interface ImportedErrorRecord {
  id?: string
  user_email: string | null
  room_id: string | null
  error_timestamp: string
  error_message: string | null
  error_type: string | null
  tool_name: string | null
  last_message: string | null
  stack_trace: string | null
  action?: string
}

export async function POST(request: Request) {
  try {
    const importData: HistoricalErrorImport = await request.json()

    if (!importData.errors || !Array.isArray(importData.errors)) {
      return NextResponse.json({ 
        error: 'Please provide an array of error messages in the "errors" field' 
      }, { status: 400 })
    }

    console.log(`📥 Starting historical import of ${importData.errors.length} errors`)

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseKey)

    let insertedCount = 0
    let skippedCount = 0
    let errorCount = 0
    const processingErrors: string[] = []
    const importedErrors: ImportedErrorRecord[] = []

    // Process each error with enhanced parsing
    for (let i = 0; i < importData.errors.length; i++) {
      const rawError = importData.errors[i]
      
      try {
        console.log(`📝 Processing error ${i + 1}/${importData.errors.length}`)
        
        // Enhanced parsing for historical errors
        const parsed = parseHistoricalError(rawError)
        
        if (!parsed.userEmail && !parsed.roomId) {
          processingErrors.push(`Error ${i + 1}: Could not parse essential fields (email/roomId)`)
          errorCount++
          continue
        }

        // Generate deterministic ID for deduplication
        const errorHash = generateErrorHash(parsed)
        
        // Check for existing error by hash or telegram ID
        const { data: existing } = await supabase
          .from('error_logs')
          .select('id, telegram_message_id')
          .or(`telegram_message_id.eq.${errorHash},raw_message.eq."${rawError.replace(/"/g, '\\"')}"`)
          .single()

        if (existing && !importData.overwriteDuplicates) {
          skippedCount++
          console.log(`⏭️  Skipping duplicate error ${i + 1}`)
          continue
        }

        // Insert into Supabase
        const insertData = {
          raw_message: rawError,
          telegram_message_id: errorHash,
          user_email: parsed.userEmail,
          room_id: parsed.roomId,
          error_timestamp: parsed.errorTimestamp?.toISOString() || new Date().toISOString(),
          error_message: parsed.errorMessage,
          error_type: parsed.errorType,
          tool_name: parsed.toolName,
          last_message: parsed.lastMessage,
          stack_trace: parsed.stackTrace
        }

        if (existing && importData.overwriteDuplicates) {
          // Update existing
          const { error } = await supabase
            .from('error_logs')
            .update(insertData)
            .eq('id', existing.id)
          
          if (error) {
            processingErrors.push(`Error ${i + 1}: Update failed - ${error.message}`)
            errorCount++
          } else {
            insertedCount++
            importedErrors.push({ ...insertData, action: 'updated' })
          }
        } else {
          // Insert new
          const { data, error } = await supabase
            .from('error_logs')
            .insert(insertData)
            .select()

          if (error) {
            processingErrors.push(`Error ${i + 1}: Insert failed - ${error.message}`)
            errorCount++
          } else {
            insertedCount++
            importedErrors.push({ ...data[0], action: 'inserted' })
          }
        }

      } catch (parseError) {
        processingErrors.push(`Error ${i + 1}: Parsing failed - ${parseError}`)
        errorCount++
      }
    }

    // Generate summary
    const summary = {
      success: true,
      totalProvided: importData.errors.length,
      insertedCount,
      skippedCount,
      errorCount,
      source: importData.source || 'unknown',
      dateRange: importData.dateRange,
      processingTime: Date.now(),
      statistics: {
        toolBreakdown: getToolBreakdown(importedErrors),
        dateRange: getDateRange(importedErrors),
        userBreakdown: getUserBreakdown(importedErrors)
      }
    }

    console.log(`✅ Historical import completed:`, summary)

    return NextResponse.json({
      ...summary,
      errors: processingErrors.length > 0 ? processingErrors : undefined,
      sampleImported: importedErrors.slice(0, 3) // Show first 3 for verification
    })

  } catch (error) {
    console.error('❌ Historical import failed:', error)
    return NextResponse.json({ 
      error: 'Failed to import historical errors',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

function parseHistoricalError(text: string): ParsedHistoricalError {
  // Enhanced parsing for various error formats
  
  // Extract From: email (multiple patterns)
  const emailMatches = [
    text.match(/From:\s*([^\n\r]+)/),
    text.match(/User:\s*([^\n\r]+)/),
    text.match(/Email:\s*([^\n\r]+)/),
    text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/), // Any email pattern
  ]
  const userEmail = emailMatches.find(m => m)?.[1]?.trim().replace(/\\/g, '') || null
  
  // Extract Room ID (multiple patterns)
  const roomMatches = [
    text.match(/Room ID:\s*([^\n\r]+)/),
    text.match(/Room:\s*([^\n\r]+)/),
    text.match(/ID:\s*([a-f0-9\-]{10,})/i), // UUID pattern
  ]
  const roomId = roomMatches.find(m => m)?.[1]?.trim().replace(/\\/g, '') || null
  
  // Extract Time (multiple formats)
  const timeMatches = [
    text.match(/Time:\s*([^\n\r]+)/),
    text.match(/Timestamp:\s*([^\n\r]+)/),
    text.match(/Date:\s*([^\n\r]+)/),
    text.match(/(202[0-9]-[0-1][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9])/), // ISO date
  ]
  const timeStr = timeMatches.find(m => m)?.[1]?.trim().replace(/\\/g, '')
  const errorTimestamp = timeStr ? new Date(timeStr) : null
  
  // Extract Error Message
  const errorMsgMatches = [
    text.match(/Error Message:\s*([\s\S]*?)(?=Error Type:|Stack Trace:|Last Message:|$)/),
    text.match(/Error:\s*([\s\S]*?)(?=Type:|Stack|Last|$)/),
    text.match(/Message:\s*([\s\S]*?)(?=Type:|Stack|Last|$)/),
  ]
  const errorMessage = errorMsgMatches.find(m => m)?.[1]?.trim() || null
  
  // Extract Error Type
  const errorTypeMatches = [
    text.match(/Error Type:\s*([^\n\r]+)/),
    text.match(/Type:\s*([^\n\r]+)/),
    text.match(/(AI_\w+Error|ToolExecutionError|ValidationError|TimeoutError)/),
  ]
  const errorType = errorTypeMatches.find(m => m)?.[1]?.trim() || 'UnknownError'
  
  // Extract Last Message
  const lastMsgMatches = [
    text.match(/Last Message:\s*([\s\S]*?)$/),
    text.match(/User Message:\s*([\s\S]*?)$/),
    text.match(/Query:\s*([\s\S]*?)$/),
  ]
  const lastMessage = lastMsgMatches.find(m => m)?.[1]?.trim() || null
  
  // Extract Stack Trace
  const stackMatches = [
    text.match(/Stack Trace:\s*```([\s\S]*?)```/),
    text.match(/Stack:\s*```([\s\S]*?)```/),
    text.match(/```([\s\S]*?AI_\w+Error[\s\S]*?)```/),
  ]
  const stackTrace = stackMatches.find(m => m)?.[1]?.trim() || null
  
  // Extract Tool Name
  const toolName = extractEnhancedToolName(errorMessage || text)
  
  return {
    userEmail,
    roomId, 
    errorTimestamp,
    errorMessage,
    errorType,
    toolName,
    lastMessage,
    stackTrace,
    originalText: text
  }
}

function extractEnhancedToolName(errorText: string): string | null {
  // Enhanced tool name extraction with more patterns
  const patterns = [
    /Error executing tool\s+([a-zA-Z_0-9]+)/i,
    /Invalid arguments for tool\s+([a-zA-Z_0-9]+)/i,
    /Tool\s+([a-zA-Z_0-9]+)\s+failed/i,
    /([a-zA-Z_0-9]+):\s*API request failed/i,
  ]
  
  for (const pattern of patterns) {
    const match = errorText.match(pattern)
    if (match) return match[1]
  }
  
  // Known tool keywords
  const toolKeywords = [
    'send_email', 'artist_deep_research', 'artist_research',
    'get_spotify_artist_top_tracks', 'get_spotify_top_tracks',
    'deep_research', 'search_artists', 'analyze_data'
  ]
  
  for (const tool of toolKeywords) {
    if (errorText.toLowerCase().includes(tool.toLowerCase())) {
      return tool
    }
  }
  
  return null
}

function generateErrorHash(parsed: ParsedHistoricalError): number {
  // Generate a hash for deduplication
  const hashStr = `${parsed.userEmail}-${parsed.roomId}-${parsed.errorMessage}-${parsed.errorTimestamp}`
  let hash = 0
  for (let i = 0; i < hashStr.length; i++) {
    const char = hashStr.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

function getToolBreakdown(errors: ImportedErrorRecord[]): Record<string, number> {
  const breakdown: Record<string, number> = {}
  errors.forEach(error => {
    const tool = error.tool_name || 'Unknown'
    breakdown[tool] = (breakdown[tool] || 0) + 1
  })
  return breakdown
}

function getDateRange(errors: ImportedErrorRecord[]): { earliest: string | null, latest: string | null } {
  if (errors.length === 0) return { earliest: null, latest: null }
  
  const dates = errors
    .map(e => e.error_timestamp)
    .filter(d => d)
    .sort()
  
  return {
    earliest: dates[0] || null,
    latest: dates[dates.length - 1] || null
  }
}

function getUserBreakdown(errors: ImportedErrorRecord[]): Record<string, number> {
  const breakdown: Record<string, number> = {}
  errors.forEach(error => {
    const user = error.user_email || 'Unknown'
    breakdown[user] = (breakdown[user] || 0) + 1
  })
  return breakdown
}

// GET endpoint for documentation
export async function GET() {
  return NextResponse.json({
    name: 'Historical Error Import API',
    description: 'Import large volumes of historical errors with enhanced parsing and deduplication',
    usage: {
      method: 'POST',
      endpoint: '/api/import-historical-errors',
      body: {
        source: '"telegram" | "manual" | "csv"',
        errors: ['array of error message strings'],
        dateRange: { start: 'ISO date', end: 'ISO date' },
        overwriteDuplicates: 'boolean (default: false)'
      }
    },
    features: [
      'Enhanced parsing for multiple error formats',
      'Intelligent deduplication',
      'Batch processing with progress logging',
      'Statistics and breakdown analysis',
      'Error validation and reporting'
    ],
    example: {
      source: 'telegram',
      errors: ['❌ Error Alert\nFrom: user@example.com\n...'],
      dateRange: { start: '2025-05-01', end: '2025-06-01' },
      overwriteDuplicates: false
    }
  })
} 