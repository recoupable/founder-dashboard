import { NextResponse } from 'next/server'

// Test data based on the user's actual error message format
const mockErrorMessage = `❌ Error Alert
From: sam.palm@wmgl.com
Room ID: c3441758\-9506\-4207\-b052\-a5d93dc9d357
Time: 2025\-06\-11T21:07:21.321Z

Error Message:
Invalid arguments for tool send_email: Type validation failed: Value \\{"from":"Recoup Analytics <hello@recoupable\\.com>","to":"sam.palm@wmgl.com","subject":"PinkPantheress: Fastest Growing Rock Sounds (Last 7 Days)","<!DOCTYPE html>\\n<html>\\n<head>\\n<style>\\n body \\{ font-family: Arial, sans-serif; \\}\\n</head>\\n<body>\\n \\
margin: 0 auto; \\}\\n header \\{ background: linear-gradient(135deg`

const mockErrorMessage2 = `❌ Error Alert
From: patrick@methodmusic.co.uk
Room ID: 901a2b1e\-0a7\-4ef9\-900b\-ee516254dda5
Time: 2025\-06\-11T20:36:10.101Z

Error Message:
Error executing tool artist_deep_research: API request failed with status 502

Error Type: AI_ToolExecutionError

Stack Trace:
\\n\\n
AI_ToolExecutionError: Error executing tool artist_deep_research: API request failed with status 502
    at /var/task/\\.next/server/chunks/2587\\.js:6:56445
    at process.processTicksAndRejections \\(node:internal/process/task_queues:95:5\\)
\\n\\n

Last Message:
Disclosure`

function extractToolName(errorText: string): string | null {
  // Extract tool names from error messages based on actual format
  
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

export async function GET() {
  try {
    const testMessages = [mockErrorMessage, mockErrorMessage2]
    
    let totalErrors = 0
    const errorBreakdown: Record<string, number> = {}

    testMessages.forEach(text => {
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

    const result = {
      date: new Date().toISOString().split('T')[0],
      totalMessages: 0,
      totalErrors,
      errorRate: 0,
      errorBreakdown,
      testMessages: testMessages.map((msg, i) => ({
        messageIndex: i,
        extractedTool: extractToolName(msg),
        isError: msg.includes('❌ Error Alert') || msg.includes('Error Alert')
      }))
    }
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('Error testing parsing:', error)
    return NextResponse.json({ error: 'Failed to test parsing' }, { status: 500 })
  }
} 