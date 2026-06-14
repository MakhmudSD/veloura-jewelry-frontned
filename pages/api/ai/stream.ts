import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { api: { bodyParser: { sizeLimit: '512kb' } } };

const DEFAULT_GRAPHQL = 'http://localhost:3004/graphql';

const SYSTEM_PROMPT = `You are Veloura Assistant, an expert concierge for Veloura — a luxury jewelry e-commerce platform (veloura.uz).

Your role:
- Help customers find jewelry, understand materials, sizes, care tips, and collections
- Be warm, elegant, and concise — max 3 sentences unless the user asks for detail
- When relevant, reference products or articles from the context provided
- Never make up prices or product details not in the context
- If you don't know something, say so gracefully and suggest they contact support

Tone: Luxurious yet approachable. Think high-end boutique, not a chatbot.
Language: Match the user's language (English/Korean/Russian etc.)`.trim();

function resolveSiteOrigin(req: NextApiRequest) {
  const proto = (req.headers['x-forwarded-proto'] as string) || 'http';
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || '';
  const envOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3000';
  return (host ? `${proto}://${host}` : envOrigin).replace(/\/+$/, '');
}

function resolveGraphqlUrl() {
  return (process.env.VELOURA_GRAPHQL_URL || process.env.NEXT_PUBLIC_API_GRAPHQL_URL || DEFAULT_GRAPHQL).replace(/\/+$/, '');
}

async function fetchContext(req: NextApiRequest, question: string, siteOrigin: string, graphqlUrl: string): Promise<string> {
  const PRODUCTS_Q = `query { getProducts(input:{page:1,limit:3,search:{text:""}}) { list { productTitle productPrice productMaterial productCategory productDesc } } }`;
  try {
    const r = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: PRODUCTS_Q }),
      signal: AbortSignal.timeout(3000),
    });
    if (!r.ok) return '';
    const j = await r.json();
    const products: any[] = j?.data?.getProducts?.list || [];
    if (!products.length) return '';
    const lines = products.map((p: any) =>
      `• ${p.productTitle} — ${p.productMaterial || '?'}, ${p.productCategory || '?'}, ₩${p.productPrice}`
    );
    return `Recent Veloura products:\n${lines.join('\n')}`;
  } catch {
    return '';
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { messages } = req.body as { messages: Array<{ role: string; content: string }> };
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const send = (payload: object) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

  try {
    const openaiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!openaiKey) {
      send({ error: 'The AI assistant is not configured yet. Please contact support@veloura.com.' });
      return res.end();
    }

    // Trim history to last 6 messages to save tokens
    const recentMessages = messages.slice(-6);
    const latestUser = [...recentMessages].reverse().find((m) => m.role === 'user')?.content || '';

    // Fetch site context (non-blocking, best-effort)
    const context = await fetchContext(req, latestUser, resolveSiteOrigin(req), resolveGraphqlUrl());
    const systemContent = context ? `${SYSTEM_PROMPT}\n\n${context}` : SYSTEM_PROMPT;

    const chatMessages = [
      { role: 'system', content: systemContent },
      ...recentMessages.filter((m) => m.role === 'user' || m.role === 'assistant'),
    ];

    const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: chatMessages,
        max_tokens: 450,
        temperature: 0.7,
        stream: true,
      }),
    });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => '');
      if (upstream.status === 429) {
        const retryAfter = upstream.headers.get('retry-after') || '30';
        send({ error: `Rate limit reached — please wait ${retryAfter}s and try again.` });
      } else if (upstream.status === 401) {
        send({ error: 'AI key is invalid. Please contact support.' });
      } else {
        send({ error: `AI error (${upstream.status}). Please try again.` });
      }
      return res.end();
    }

    if (!upstream.body) {
      send({ error: 'No response stream from AI.' });
      return res.end();
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const flush = (line: string) => {
      if (!line.startsWith('data:')) return;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') {
        send({ done: true });
        return;
      }
      try {
        const evt = JSON.parse(payload);
        // Handle error events from OpenAI
        if (evt?.error) {
          send({ error: String(evt.error.message || evt.error) });
          return;
        }
        const content = evt?.choices?.[0]?.delta?.content;
        if (content) send({ delta: content });
        const finishReason = evt?.choices?.[0]?.finish_reason;
        if (finishReason === 'stop' || finishReason === 'length') send({ done: true });
      } catch { /* ignore partial JSON */ }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';
      for (const part of parts) {
        part.split('\n').forEach(flush);
      }
    }
    if (buffer) buffer.split('\n').forEach(flush);
    res.end();
  } catch (err: any) {
    send({ error: err?.message || 'Something went wrong. Please try again.' });
    res.end();
  }
}
