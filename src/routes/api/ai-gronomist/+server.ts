import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return json({ error: 'Invalid messages format' }, { status: 400 });
    }

    if (!env.OPENAI_API_KEY) {
      console.error('CRITICAL: OpenAI API key is not configured in environment variables');
      return json({ error: 'OpenAI API key is not configured' }, { status: 500 });
    }

    // Create OpenAI instance
    const openai = createOpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    // Stream the response from OpenAI
    const result = await streamText({
      model: openai('gpt-4o-mini'),
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
  } catch (error: any) {
    console.error('Error in AI chat API:', error);
    return json({ error: error.message || 'Failed to get response from AI' }, { status: 500 });
  }
};