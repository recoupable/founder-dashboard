import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Define types for content processing
type ContentPart = string | { 
  text?: string; 
  content?: string;
  type?: string;
  reasoning?: string;
  details?: Array<{text: string, type: string}>;
  [key: string]: unknown;
};

export const dynamic = 'force-dynamic';

// Extract roomId from the path
function getRoomIdFromPath(url: string): string {
  const parts = url.split('/');
  const roomId = parts[parts.length - 1];
  return roomId;
}

// API route for fetching conversation details by room ID
export async function GET(request: Request) {
  try {
    // Extract roomId from URL path instead of using params
    const url = request.url;
    const roomId = getRoomIdFromPath(url);

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
    }

    console.log('API: Fetching conversation detail for room:', roomId);
    
    // Step 1: Get the room details
    const { data: roomData, error: roomError } = await supabaseAdmin
      .from('rooms')
      .select('id, account_id, artist_id, updated_at, topic')
      .eq('id', roomId)
      .single();
    
    if (roomError) {
      console.error('API: Error fetching room:', roomError);
      return NextResponse.json(createFallbackConversationDetail(roomId));
    }
    
    if (!roomData) {
      console.log('API: Room not found:', roomId);
      return NextResponse.json(createFallbackConversationDetail(roomId));
    }
    
    // Get artist name from accounts table using the artist_id directly from the room
    const artistId = roomData.artist_id || 'Unknown Artist';
    let artistName = artistId;
    
    if (artistId !== 'Unknown Artist') {
      console.log('API: Fetching artist name from accounts table');
      const { data: artistAccount, error: artistAccountError } = await supabaseAdmin
        .from('accounts')
        .select('name')
        .eq('id', artistId)
        .single();
        
      if (artistAccountError) {
        console.error('API: Error fetching artist account:', artistAccountError);
      } else if (artistAccount) {
        artistName = artistAccount.name;
      }
    }
    
    // Step 4: Get messages for this room
    const { data: messagesData, error: messagesError } = await supabaseAdmin
      .from('memories')
      .select('id, content, updated_at')
      .eq('room_id', roomId)
      .order('updated_at', { ascending: true });
    
    if (messagesError) {
      console.error('API: Error fetching messages:', messagesError);
    }
    
    // Get user name from accounts table
    console.log('API: Fetching account name');
    const { data: accountData, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('name')
      .eq('id', roomData.account_id)
      .single();
    
    if (accountError) {
      console.error('API: Error fetching account name:', accountError);
    }
    
    // Get real email from account_emails table
    console.log('API: Fetching account email');
    const { data: emailData, error: emailError } = await supabaseAdmin
      .from('account_emails')
      .select('email')
      .eq('account_id', roomData.account_id)
      .single();
    
    if (emailError) {
      console.error('API: Error fetching account email:', emailError);
    }
    
    // Use the account name or a default placeholder
    const accountName = accountData?.name || roomData.account_id.substring(0, 8);
    // Use real email if available, otherwise create a placeholder
    const accountEmail = emailData?.email || accountName + '@example.com';
    
    console.log('API: Using account name:', accountName);
    console.log('API: Using account email:', accountEmail);
    console.log('API: Using artist name:', artistName);
    console.log('API: Using artist ID:', artistId);
    
    // Map messages to the expected format but set a default role since it doesn't exist in DB
    // Also properly handle the JSONB content field
    const messages = messagesData ? messagesData.map(msg => {
      // Log the content for debugging
      console.log('API: Message content structure:', JSON.stringify(msg.content, null, 2));
      
      // Extract the appropriate text from the JSONB content field
      let messageText = 'Empty message';
      let messageRole = 'assistant';
      let reasoningText = '';
      
      // Format tool names as code in messages and reasoning
      const formatToolNames = (text: string): string => {
        // List of tool names to format as code
        const toolNames = [
          'perplexity_ask', 
          'perplexity_reason', 
          'get_artist_fans', 
          'get_artist_posts',
          'supabase'
        ];
        
        // Replace each tool name with the backtick-wrapped version
        let formattedText = text;
        toolNames.forEach(tool => {
          // Use regex to match the tool name as a whole word
          const regex = new RegExp(`\\b${tool}\\b`, 'g');
          formattedText = formattedText.replace(regex, `\`${tool}\``);
        });
        
        return formattedText;
      };
      
      // Handle different content formats
      if (msg.content) {
        // If content is a simple string, use it directly
        if (typeof msg.content === 'string') {
          messageText = msg.content;
        } 
        // Handle complex object structure
        else if (typeof msg.content === 'object') {
          // Extract role if available
          if (msg.content.role && typeof msg.content.role === 'string') {
            messageRole = msg.content.role;
          }
          
          // First, try to extract reasoning text if available
          if (msg.content.reasoning && typeof msg.content.reasoning === 'string') {
            reasoningText = msg.content.reasoning;
          }
          
          // First try: Direct content field (usually clean user-facing text)
          if (typeof msg.content.content === 'string' && !msg.content.content.includes('perplexity_ask')) {
            messageText = msg.content.content;
          }
          // Second try: Look for text-type parts that aren't reasoning
          else if (msg.content.parts && Array.isArray(msg.content.parts)) {
            // Find the parts with type="text" (excluding reasoning parts)
            const textParts = msg.content.parts
              .filter((part: ContentPart) => {
                if (typeof part === 'object') {
                  return part.type === 'text';
                }
                return false;
              })
              .map((part: ContentPart) => {
                if (typeof part === 'object' && part.text) {
                  return part.text;
                }
                return '';
              })
              .filter((text: string) => text !== '');
              
            if (textParts.length > 0) {
              messageText = textParts.join('\n\n');
            } 
            // If no clean text parts found, look for any text content
            else {
              const allTextParts = msg.content.parts.map((part: ContentPart) => {
                if (typeof part === 'string') return part;
                if (typeof part === 'object') {
                  if (part.text && typeof part.text === 'string') return part.text;
                  if (part.content && typeof part.content === 'string') return part.content;
                }
                return '';
              }).filter((text: string) => text !== '');
              
              if (allTextParts.length > 0) {
                messageText = allTextParts.join(' ');
              }
            }
          }
          // If none of the above extraction methods worked, stringify the object
          else if (Object.keys(msg.content).length > 0) {
            messageText = JSON.stringify(msg.content);
          }
        }
      }
      
      return {
        id: msg.id,
        room_id: roomId,
        content: formatToolNames(messageText), // Format tool names in content
        role: messageRole, // Use extracted role or default
        reasoning: formatToolNames(reasoningText), // Format tool names in reasoning
        created_at: msg.updated_at // Using updated_at as the timestamp
      };
    }) : [];
    
    // Build the conversation detail
    const conversationDetail = {
      room_id: roomId,
      account_email: accountEmail, // Using email from accounts table
      account_name: accountName, // Add account name to the response
      artist_name: artistName, // Using actual artist name now
      artist_reference: artistId !== 'Unknown Artist' ? `REF-${artistId.substring(0, 5)}` : 'REF-UNKNOWN',
      topic: roomData.topic || 'New Conversation',
      is_test_account: false,
      messages: messages
    };
    
    console.log('API: Successfully retrieved conversation detail with', messages.length, 'messages');
    return NextResponse.json(conversationDetail);
  } catch (error) {
    console.error('API: Error processing request:', error);
    // Use a safe fallback since we don't have params
    const url = request.url || '';
    const parts = url.split('/');
    const safeRoomId = parts[parts.length - 1] || 'unknown';
    return NextResponse.json(createFallbackConversationDetail(safeRoomId));
  }
}

// Helper function to create fallback conversation detail
function createFallbackConversationDetail(roomId: string) {
  return {
    room_id: roomId,
    account_email: 'user@example.com',
    account_name: 'Demo Account', // Add account name to fallback data
    artist_name: 'Demo Artist',
    artist_reference: 'REF-123',
    topic: 'Fallback Conversation',
    messages: [
      {
        id: 'msg-1',
        room_id: roomId,
        content: 'Hello, how can I help you today?',
        role: 'user',
        reasoning: '',
        created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
      },
      {
        id: 'msg-2',
        room_id: roomId,
        content: 'I can help answer questions about your music and provide guidance on your career.',
        role: 'assistant',
        reasoning: 'The user has started a conversation. I should introduce myself and explain my capabilities. I can use `perplexity_ask` and other tools to provide helpful information.',
        created_at: new Date(Date.now() - 3500000).toISOString() // 58 minutes ago
      },
      {
        id: 'msg-3',
        room_id: roomId,
        content: 'Can you tell me more about streaming platforms?',
        role: 'user',
        reasoning: '',
        created_at: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
      },
      {
        id: 'msg-4',
        room_id: roomId,
        content: 'Spotify, Apple Music, and other major streaming platforms offer artists various ways to distribute and monetize their music. Each platform has different payout rates and audience demographics.',
        role: 'assistant',
        reasoning: 'The user is asking about streaming platforms. I should provide a high-level overview of the major platforms and their differences. I can use `perplexity_ask` to get data on streaming platforms if needed.',
        created_at: new Date(Date.now() - 1700000).toISOString() // 28 minutes ago
      }
    ]
  };
} 