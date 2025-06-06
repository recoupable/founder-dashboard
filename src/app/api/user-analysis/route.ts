import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { conversationService } from '@/lib/conversationService';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  console.log('Starting user analysis endpoint');
  
  try {
    // Check environment variables
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'OpenAI API key not configured',
        analysis: null
      }, { status: 500 });
    }
    
    const body = await request.json();
    const { userEmail } = body;
    
    if (!userEmail) {
      return NextResponse.json({
        error: 'User email is required',
        analysis: null
      }, { status: 400 });
    }

    console.log(`Analyzing user: ${userEmail}`);

    // Fetch all conversations for this user
    console.log('Fetching conversations for user...');
    const conversationList = await conversationService.getConversationList({
      excludeTestEmails: false, // Include all conversations for this user
      timeFilter: 'All Time',
      limit: 100, // Get more conversations for this user
      userFilter: userEmail // Filter by this user's email
    });

    if (!conversationList.conversations || conversationList.conversations.length === 0) {
      // If no conversations found through the conversation service,
      // provide a basic analysis based on available information
      const basicAnalysis = {
        user_profile: "Active User",
        engagement_level: "medium",
        primary_use_cases: ["Platform engagement"],
        strengths: ["Shows consistent platform usage"],
        pain_points: ["Limited conversation data available for detailed analysis"],
        satisfaction_level: "medium", 
        ai_performance: "medium",
        recommendations: ["Encourage more detailed conversation interactions"],
        user_journey_stage: "exploring",
        key_insights: ["User has activity but limited conversation data available"],
        conversation_themes: ["General platform usage"],
        growth_opportunities: ["Increase conversation depth and frequency"]
      };

      return NextResponse.json({
        success: true,
        user_email: userEmail,
        analysis: basicAnalysis,
        metadata: {
          conversations_analyzed: 0,
          total_messages: 0,
          analysis_timestamp: new Date().toISOString(),
          tokens_used: 0,
          note: "Basic analysis provided due to conversation fetching limitations"
        }
      });
    }

    console.log(`Found ${conversationList.conversations.length} conversations for ${userEmail}`);

    // Fetch detailed conversations
    const userConversations = [];
    for (const conv of conversationList.conversations) {
      try {
        const detail = await conversationService.getConversationDetail(conv.room_id);
        if (detail && detail.messages && detail.messages.length > 0) {
          userConversations.push(detail);
        }
      } catch (error) {
        console.warn(`Failed to fetch details for conversation ${conv.room_id}:`, error);
      }
    }

    console.log(`Successfully fetched details for ${userConversations.length} conversations`);

    if (userConversations.length === 0) {
      return NextResponse.json({
        error: 'No conversation details could be fetched',
        analysis: null
      });
    }

    // Prepare conversation data for OpenAI analysis
    const conversationSummaries = userConversations.map(conv => {
      const messages = conv.messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n');
      
      return {
        room_id: conv.room_id,
        artist: conv.artist_name,
        topic: conv.topic || 'No topic',
        message_count: conv.messages.length,
        messages: messages.substring(0, 2000) // Limit length to avoid token limits
      };
    });

    // Create analysis prompt
    const analysisPrompt = `
Analyze this user's conversation patterns and provide insights:

User: ${userEmail}
Total Conversations: ${userConversations.length}

Conversations:
${conversationSummaries.map((conv, idx) => `
Conversation ${idx + 1}:
- Artist: ${conv.artist}
- Topic: ${conv.topic}
- Messages: ${conv.message_count}
- Content: ${conv.messages}
---`).join('\n')}

Provide a comprehensive user analysis. Focus on deep, specific, and actionable insights. Go beyond generic observations. Return ONLY valid JSON with no other text:
{
  "user_profile": "What specific type of user is this based on their language and topics? (e.g., 'Independent Artist/Label Marketer', 'Music Producer for sync licensing', 'A&R Coordinator scouting talent')",
  "engagement_level": "high|medium|low - justify why",
  "primary_use_cases": ["List the specific, observed tasks the user is trying to accomplish. e.g., 'Developing growth and marketing strategies', 'Requesting audience and fan-segment analyses'"],
  "strengths": ["What are they successfully doing? Be specific. e.g., 'Effectively using the AI for creative brainstorming', 'Successfully analyzing fan data reports'"],
  "pain_points": ["What are their specific struggles? Find the root cause. e.g., 'User has created multiple artists with the same name, indicating confusion in the artist management workflow.' instead of 'Duplicate artist creation'"],
  "satisfaction_level": "high|medium|low - based on their language, frustration signals, and success rates",
  "ai_performance": "How well is the AI *actually* serving this user's specific needs? high|medium|low",
  "top_recommendations": ["Actionable steps for the *product team* to take. e.g., 'Introduce a persistent dashboard that shows already-created artists to avoid duplicate creation requests', 'Enable one-click export of reports as PDF'"],
  "user_journey_stage": "onboarding|exploring|power_user|expert",
  "key_insights": ["3-5 most important, non-obvious takeaways about this user's behavior and goals. e.g., 'User is managing or marketing for multiple Latin hip-hop artists', 'Primary interest lies in audience growth and segmentation rather than creative production'"],
  "conversation_themes": ["What are the recurring high-level themes or topics in their conversations?"],
  "growth_opportunities": ["What specific features would unlock more value for this user? e.g., 'Could benefit from a report comparison feature', 'Might upgrade for team collaboration tools'"]
}

Focus on:
- Root cause analysis of user behavior. Why are they doing what they're doing?
- Identifying specific user goals and whether they are being met.
- Actionable recommendations for product improvement, not for the user.
- Moving from generic descriptions to specific, evidence-backed insights.
- For example, instead of 'user is engaged', specify 'user is highly engaged in brainstorming marketing ideas, sending an average of 15 messages per session on this topic'.
`;

    console.log('Sending analysis to OpenAI o3...');
    const response = await openai.chat.completions.create({
      model: "o3",
      messages: [{ role: "user", content: analysisPrompt }],
      // Note: o3 only supports default temperature (1)
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content || '{}');
    
    console.log('User analysis completed successfully');

    return NextResponse.json({
      success: true,
      user_email: userEmail,
      analysis,
      metadata: {
        conversations_analyzed: userConversations.length,
        total_messages: userConversations.reduce((sum, conv) => sum + conv.messages.length, 0),
        analysis_timestamp: new Date().toISOString(),
        tokens_used: response.usage?.total_tokens || 0
      }
    });

  } catch (error: unknown) {
    console.error('Error in user analysis API:', error);
    
    let errorDetails = 'Unknown error';
    if (error instanceof Error) {
      errorDetails = `${error.name}: ${error.message}`;
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json({
      error: 'Failed to analyze user',
      details: errorDetails,
      analysis: null
    }, { status: 500 });
  }
} 