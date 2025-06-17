#!/usr/bin/env node

/**
 * Parse Telegram conversation data to identify actual errors
 * 
 * This script analyzes conversation logs to distinguish between:
 * - Regular user conversations
 * - Actual system errors that should be logged
 */

const fs = require('fs');
const path = require('path');

async function parseTelegramConversations() {
  try {
    console.log('🔍 Analyzing telegram-errors.md...');
    
    const filePath = 'telegram-errors.md';
    
    if (!fs.existsSync(filePath)) {
      console.log('❌ telegram-errors.md not found');
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    console.log(`📖 File size: ${content.length} characters`);
    
    // Parse the conversation structure
    const conversations = parseConversations(content);
    console.log(`💬 Found ${conversations.length} conversation blocks`);
    
    // Analyze each conversation for potential errors
    const analysis = analyzeConversations(conversations);
    
    console.log('\n📊 Analysis Results:');
    console.log(`- Total conversations: ${analysis.totalConversations}`);
    console.log(`- System errors found: ${analysis.systemErrors.length}`);
    console.log(`- User conversations: ${analysis.userConversations.length}`);
    console.log(`- Technical issues: ${analysis.technicalIssues.length}`);
    
    if (analysis.systemErrors.length > 0) {
      console.log('\n🚨 System Errors Found:');
      analysis.systemErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.topic} - ${error.userEmail}`);
        console.log(`   Time: ${error.timestamp}`);
        console.log(`   Issue: ${error.errorSummary}`);
      });
      
      // Convert to error log format and offer to import
      const errorLogs = convertToErrorLogFormat(analysis.systemErrors);
      await offerToImport(errorLogs);
    } else {
      console.log('\n✅ No system errors detected in the conversation data.');
      console.log('This appears to be user conversation logs, not error alerts.');
      
      console.log('\n💡 Expected error format:');
      console.log('❌ Error Alert');
      console.log('From: user@example.com');
      console.log('Room ID: room-123-456');
      console.log('Time: 2025-06-01T10:00:00.000Z');
      console.log('');
      console.log('Error Message:');
      console.log('Error executing tool get_spotify_top_tracks: API request failed');
      console.log('');
      console.log('Error Type: AI_ToolExecutionError');
    }
    
  } catch (error) {
    console.error('💥 Parsing failed:', error.message);
  }
}

function parseConversations(content) {
  const conversations = [];
  
  // Split by conversation markers
  const blocks = content.split(/🗣️ New Conversation Started|```\s*$/gm);
  
  blocks.forEach((block, index) => {
    if (block.trim().length < 50) return; // Skip short blocks
    
    const conversation = parseConversationBlock(block.trim());
    if (conversation) {
      conversations.push({ ...conversation, blockIndex: index });
    }
  });
  
  return conversations;
}

function parseConversationBlock(block) {
  try {
    // Extract metadata
    const fromMatch = block.match(/From:\s*([^\n\r]+)/);
    const chatIdMatch = block.match(/Chat ID:\s*([^\n\r]+)/);
    const topicMatch = block.match(/Topic:\s*([^\n\r]+)/);
    const timeMatch = block.match(/Time:\s*([^\n\r]+)/);
    const firstMessageMatch = block.match(/First Message:\s*([\s\S]*?)(?=convo so far|$)/);
    
    if (!fromMatch || !timeMatch) return null;
    
    return {
      userEmail: fromMatch[1].trim(),
      chatId: chatIdMatch ? chatIdMatch[1].trim() : null,
      topic: topicMatch ? topicMatch[1].trim() : 'No Topic',
      timestamp: timeMatch[1].trim(),
      firstMessage: firstMessageMatch ? firstMessageMatch[1].trim() : '',
      fullContent: block
    };
  } catch (error) {
    console.warn('⚠️  Failed to parse conversation block:', error.message);
    return null;
  }
}

function analyzeConversations(conversations) {
  const analysis = {
    totalConversations: conversations.length,
    systemErrors: [],
    userConversations: [],
    technicalIssues: []
  };
  
  conversations.forEach(conv => {
    // Check for system error indicators
    if (isSystemError(conv)) {
      analysis.systemErrors.push(conv);
    } else if (isTechnicalIssue(conv)) {
      analysis.technicalIssues.push(conv);
    } else {
      analysis.userConversations.push(conv);
    }
  });
  
  return analysis;
}

function isSystemError(conversation) {
  const errorIndicators = [
    '❌ Error Alert',
    'Error executing tool',
    'API request failed',
    'AI_ToolExecutionError',
    'ToolExecutionError',
    'ValidationError',
    'TimeoutError',
    'Error Type:',
    'Stack Trace:',
    'status 500',
    'status 502',
    'status 503'
  ];
  
  const content = conversation.fullContent.toLowerCase();
  return errorIndicators.some(indicator => 
    content.includes(indicator.toLowerCase())
  );
}

function isTechnicalIssue(conversation) {
  const technicalIndicators = [
    'not working',
    'failed',
    'error',
    'broken',
    'offline',
    'can\'t connect',
    'timeout',
    'network issue'
  ];
  
  const content = (conversation.firstMessage + ' ' + conversation.topic).toLowerCase();
  return technicalIndicators.some(indicator => 
    content.includes(indicator)
  );
}

function convertToErrorLogFormat(systemErrors) {
  return systemErrors.map(error => {
    // Convert conversation to error log format
    return `❌ Error Alert (Conversation Log)
From: ${error.userEmail}
Room ID: ${error.chatId || 'unknown-chat-id'}
Time: ${error.timestamp}

Error Message:
User conversation indicates technical issue: ${error.topic}

Error Type: ConversationError

Last Message:
${error.firstMessage}

Conversation Context:
${error.fullContent.substring(0, 500)}...`;
  });
}

async function offerToImport(errorLogs) {
  console.log('\n🤔 Would you like to import these as conversation-based errors?');
  console.log('Note: These are user conversations, not system errors.');
  
  console.log('\nTo import, run:');
  console.log('curl -X POST "http://localhost:3000/api/add-errors-manual" \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log(`  -d '{"rawErrors": ${JSON.stringify(errorLogs, null, 2)}}'`);
}

// Run if called directly
if (require.main === module) {
  parseTelegramConversations();
}

module.exports = { parseTelegramConversations }; 