import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  console.log('Testing OpenAI API connection...');
  
  try {
    // Check if API key exists
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'OPENAI_API_KEY environment variable not set'
      }, { status: 500 });
    }

    console.log('API key found, length:', process.env.OPENAI_API_KEY.length);
    console.log('API key starts with:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    console.log('OpenAI client initialized, making test call...');

    // Make a simple test call
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "user",
          content: "Hello! Please respond with exactly 5 words."
        }
      ],
      temperature: 0.1,
      max_tokens: 20
    });

    const testResponse = response.choices[0]?.message?.content || 'No response';
    console.log('OpenAI test response:', testResponse);

    return NextResponse.json({
      success: true,
      message: 'OpenAI API connection successful!',
      testResponse: testResponse,
      model: response.model,
      usage: response.usage
    });

  } catch (error: unknown) {
    console.error('OpenAI test error:', error);
    
    let errorMessage = 'Unknown error';
    let errorDetails = {};
    
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Check for specific OpenAI errors
      if (error.message.includes('401')) {
        errorDetails = { type: 'authentication', suggestion: 'Check your API key' };
      } else if (error.message.includes('429')) {
        errorDetails = { type: 'rate_limit', suggestion: 'Rate limit exceeded or quota reached' };
      } else if (error.message.includes('400')) {
        errorDetails = { type: 'bad_request', suggestion: 'Invalid request format' };
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorDetails = { type: 'network', suggestion: 'Network connection issue' };
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: errorDetails
    }, { status: 500 });
  }
} 