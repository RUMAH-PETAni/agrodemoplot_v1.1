import OpenAI from 'openai';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

const SYSTEM_PROMPT = `Anda adalah AI-Gronomist, seorang asisten agronomis berbasis AI yang membantu petani skala kecil dengan informasi tentang agroforestri, praktik pertanian berkelanjutan, manajemen lahan, dan teknik pertanian presisi. Berikan jawaban yang akurat, mudah dipahami, dan berbasis sains. Gunakan bahasa Indonesia yang sopan dan informatif.

Aturan Penting:
- Jangan mengarang.
- Jika diagnosis tidak yakin, katakan tingkat keyakinan secara transparan.
- Selalu berikan kemungkinan penyebab alternatif.
- Prioritaskan sumber konteks yang diberikan.
- Sertakan sumber jawaban yang kredibel dan ilmiah.
- Pisahkan secara jelas antara observasi, kemungkinan diagnosis, dan tindakan yang harus diambil.`;

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return json({ error: 'Format pesan tidak valid.' }, { status: 400 });
    }

    // Try OpenAI first if configured
    if (env.OPENAI_API_KEY) {
      try {
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
        if (content) {
          return json({ content });
        }
      } catch (err: any) {
        console.warn('OpenAI failed, falling back to Gemini:', err?.message || err);
      }
    }

    // Fallback to Gemini using multiple REST configurations for maximum resilience
    const geminiKey = env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY || env.GOOGLE_GEMINI_API_KEY || env.GOOGLE_API_KEY;
    
    if (!geminiKey) {
      console.error('CRITICAL: OpenAI maupun Gemini API key tidak terkonfigurasi.');
      return json({ error: 'Kunci API OpenAI & Gemini tidak ditemukan. Harap konfigurasi API key di .env Anda.' }, { status: 500 });
    }

    const configs = [
      {
        url: `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        sys: true
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        sys: true
      },
      {
        url: `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${geminiKey}`,
        sys: false
      },
      {
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiKey}`,
        sys: false
      }
    ];

    let lastError = '';
    for (const config of configs) {
      try {
        const body: any = {};
        if (config.sys) {
          body.contents = messages.map((msg: any) => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }],
          }));
          body.systemInstruction = {
            parts: [{ text: SYSTEM_PROMPT }]
          };
        } else {
          body.contents = [
            {
              role: 'user',
              parts: [{ text: `INSTRUKSI SISTEM: ${SYSTEM_PROMPT}\n\nHarap jawab pesan berikutnya dengan mematuhi instruksi sistem di atas.` }]
            },
            ...messages.map((msg: any) => ({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }],
            }))
          ];
        }

        const geminiResponse = await fetch(config.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!geminiResponse.ok) {
          const errData = await geminiResponse.json().catch(() => ({}));
          const errMsg = errData?.error?.message || `HTTP ${geminiResponse.status}`;
          throw new Error(errMsg);
        }

        const geminiData = await geminiResponse.json();
        const geminiContent = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

        if (geminiContent) {
          return json({ content: geminiContent });
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        console.warn(`Gemini configuration failed (${config.url}):`, lastError);
      }
    }

    // If all Gemini configurations fail, try OpenRouter fallback system with free models
    if (env.OPENROUTER_API_KEY) {
      console.warn(`Gemini failed. Initiating OpenRouter fallback...`);
      const openrouterModels = [
        "openai/gpt-oss-120b:free",
        "deepseek/deepseek-v4-flash:free",
        "google/gemma-3-27b-it:free"
      ];
      
      for (const model of openrouterModels) {
        try {
          const openrouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://agrodemoplot.id",
              "X-Title": "Agrodemoplot AI-Gronomis"
            },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...messages.map((msg: any) => ({
                  role: msg.role === 'assistant' ? 'assistant' : 'user',
                  content: msg.content
                }))
              ]
            })
          });

          if (!openrouterResponse.ok) {
            const errData = await openrouterResponse.json().catch(() => ({}));
            const errMsg = errData?.error?.message || `HTTP ${openrouterResponse.status}`;
            throw new Error(errMsg);
          }

          const openrouterData = await openrouterResponse.json();
          const openrouterContent = openrouterData?.choices?.[0]?.message?.content ?? '';
          if (openrouterContent) {
            console.log(`OpenRouter fallback succeeded using model: ${model}`);
            return json({ content: openrouterContent });
          }
        } catch (err: any) {
          lastError = err?.message || String(err);
          console.warn(`OpenRouter fallback model ${model} failed:`, lastError);
        }
      }
    }

    throw new Error(`Semua sistem kecerdasan buatan (OpenAI, Gemini, OpenRouter) sedang tidak dapat dijangkau. Error terakhir: ${lastError}`);
  } catch (error: any) {
    const message = error?.message ?? String(error);
    console.error('Error in AI chat API:', message);
    return json({ error: message }, { status: 500 });
  }
};