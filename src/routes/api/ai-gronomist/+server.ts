import OpenAI from 'openai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const SYSTEM_PROMPT = `Anda adalah AI-Gronomist, seorang asisten agronomis berbasis AI yang membantu petani skala kecil dengan informasi tentang agroforestri, praktik pertanian berkelanjutan, manajemen lahan, dan teknik pertanian presisi. Berikan jawaban yang akurat, mudah dipahami, dan berbasis sains. Gunakan bahasa Indonesia yang sopan dan informatif.`;

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return json({ error: 'Format pesan tidak valid.' }, { status: 400 });
    }

    if (!env.OPENAI_API_KEY) {
      console.error('CRITICAL: OPENAI_API_KEY tidak dikonfigurasi.');
      return json({ error: 'OpenAI API key tidak dikonfigurasi.' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages.map((msg: any) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content as string,
        })),
      ],
    });

    const content = completion.choices[0]?.message?.content ?? '';

    if (!content) {
      console.error('OpenAI returned empty content.');
      return json({ error: 'AI tidak menghasilkan respons. Coba lagi.' }, { status: 500 });
    }

    return json({ content });
  } catch (error: any) {
    const message = error?.message ?? String(error);
    console.error('Error in AI chat API:', message);
    return json({ error: message }, { status: 500 });
  }
};