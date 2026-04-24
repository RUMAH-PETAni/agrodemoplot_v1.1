import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { json } from '@sveltejs/kit';
import dotenv from 'dotenv';
import type { RequestHandler } from './$types';

// Load environment variables from .env file
dotenv.config();

export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return json({ error: 'Invalid messages format' }, { status: 400 });
    }

    // Get the API key - in SvelteKit server routes, environment variables are available via process.env
    const apiKey = process.env.OPENAI_API_KEY;

    // Log environment variables for debugging (remove in production)
    console.log('Environment variables check:');
    console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
    console.log('VITE_OPENAI_API_KEY exists:', !!process.env.VITE_OPENAI_API_KEY);
    console.log('Full env object keys:', Object.keys(process.env).filter(key => key.includes('OPENAI') || key.includes('API')));

    if (!apiKey) {
      console.error('OpenAI API key is not configured');
      console.error('Available environment variables related to OpenAI:');
      console.error('process.env.OPENAI_API_KEY:', !!process.env.OPENAI_API_KEY);
      return json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    // Create OpenAI instance
    const openai = createOpenAI({
      apiKey: apiKey,
    });

    // Stream the response from OpenAI
    const result = await streamText({
      model: openai('gpt-5.4-mini'),
      system: `Anda adalah AI-Gronomist, seorang asisten agronomis berbasis AI yang membantu petani skala kecil dengan informasi tentang agroforestri, praktik pertanian berkelanjutan, manajemen lahan, dan teknik pertanian presisi. Berikan jawaban yang akurat, mudah dipahami, dan berbasis sains. Gunakan bahasa Indonesia yang sopan dan informatif.`,
      messages: messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
    });

    // Collect the full response
    let fullResponse = '';
    for await (const delta of result.textStream) {
      fullResponse += delta;
    }

    return json({
      content: fullResponse
    });
  } catch (error) {
    console.error('Error in AI chat API:', error);
    return json({ error: 'Failed to get response from AI' }, { status: 500 });
  }
};