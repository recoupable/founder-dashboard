import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    console.log('Testing o3 model...');
    
    const response = await openai.chat.completions.create({
      model: "o3",
      messages: [{ 
        role: "user", 
        content: "Hello! Can you respond with a simple JSON object containing your model name?" 
      }],
      // Note: o3 only supports default temperature (1)
      response_format: { type: "json_object" }
    });

    return NextResponse.json({
      success: true,
      model: "o3",
      response: response.choices[0].message.content,
      usage: response.usage
    });

  } catch (error: unknown) {
    console.error('o3 model test failed:', error);
    
    let errorDetails = 'Unknown error';
    if (error instanceof Error) {
      errorDetails = `${error.name}: ${error.message}`;
    }
    
    return NextResponse.json({
      success: false,
      model: "o3",
      error: errorDetails
    }, { status: 500 });
  }
} 