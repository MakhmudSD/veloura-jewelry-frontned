// pages/api/ai/stream.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { api: { bodyParser: { sizeLimit: '1mb' } } };

/** ---- Local-friendly defaults (override in .env.local) ---- */
const DEFAULT_GRAPHQL = 'http://localhost:3004/graphql';

/** Build the site origin from the *request* first, fall back to env/local */
function resolveSiteOrigin(req: NextApiRequest) {
  const proto =
    (req.headers['x-forwarded-proto'] as string) ||
    (req.headers['x-forwarded-protocol'] as string) ||
    'http';
  const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || '';
  const headerOrigin = (req.headers.origin as string) || (host ? `${proto}://${host}` : '');
  const envOrigin = process.env.NEXT_PUBLIC_SITE_ORIGIN || 'http://localhost:3000';
  return (headerOrigin || envOrigin).replace(/\/+$/, '');
}

function resolveGraphqlUrl() {
  return (process.env.VELOURA_GRAPHQL_URL || DEFAULT_GRAPHQL).replace(/\/+$/, '');
}

/** ----------------------------------------------------------
 * Low-level helpers
 * --------------------------------------------------------- */
async function postGQL<T = any>(
  req: NextApiRequest,
  url: string,
  query: string,
  variables: Record<string, any>
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // Forward auth/cookies if present (useful for dev/protected fields)
  if (req.headers.authorization) headers['Authorization'] = String(req.headers.authorization);
  if (req.headers.cookie) headers['cookie'] = String(req.headers.cookie);

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) throw new Error(`GraphQL HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (json.errors?.length) {
    const first = json.errors[0];
    const err: any = new Error(json.errors.map((e: any) => e.message).join('; '));
    err.code = first?.extensions?.code;
    throw err;
  }
  return json.data as T;
}

/** Try variables with different AISearch object shapes until one works */
function buildSearchVariants(userQuestion: string) {
  return [
    { input: { page: 1, limit: 3, search: { text: userQuestion } } },
    { input: { page: 1, limit: 3, search: { query: userQuestion } } },
    { input: { page: 1, limit: 3, search: { keyword: userQuestion } } },
    { input: { page: 1, limit: 3, search: { value: userQuestion } } },
    { input: { page: 1, limit: 3, search: { q: userQuestion } } },
    { input: { page: 1, limit: 3, search: userQuestion } }, // just in case your schema allows a union-like string
    { input: { page: 1, limit: 3 } }, // no search fallback
  ];
}

async function tryQueryWithVariants<T = any>(
  req: NextApiRequest,
  url: string,
  query: string,
  userQuestion: string
) {
  const variants = buildSearchVariants(userQuestion);
  let lastErr: any;
  for (const v of variants) {
    try {
      return await postGQL<T>(req, url, query, v);
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (
        e?.code === 'BAD_USER_INPUT' ||
        /Variable "\$input" got invalid value/.test(msg) ||
        /Expected type "AISearch"/.test(msg)
      ) {
        lastErr = e;
        continue;
      }
      throw e; // other errors: stop early
    }
  }
  throw lastErr || new Error('All AISearch variable variants failed');
}

/** ----------------------------------------------------------
 * Retrieval: pull context from your local GraphQL
 * --------------------------------------------------------- */
async function retrieveSiteContext(
  req: NextApiRequest,
  userQuestion: string,
  siteOrigin: string,
  graphqlUrl: string
) {
  const pieces: string[] = [];
  const PRODUCTS_Q = `
    query GetProducts($input: ProductsInquiry!) {
      getProducts(input: $input) {
        list {
          _id
          productTitle
          productPrice
          productMaterial
          productCategory
          productDesc
          productImages
        }
        metaCounter { total }
      }
    }
  `;
  const ARTICLES_Q = `
    query GetBoardArticles($input: BoardArticlesInquiry!) {
      getBoardArticles(input: $input) {
        list {
          _id
          articleCategory
          articleTitle
          articleContent
          createdAt
        }
        metaCounter { total }
      }
    }
  `;
  const NOTICES_Q = `
    query GetNotices($input: NoticeInquiry!) {
      getNotices(input: $input) {
        list {
          _id
          noticeTitle
          noticeContent
          createdAt
        }
        metaCounter { total }
      }
    }
  `;
  const STORES_Q = `
    query GetStores($input: StoreInquiry!) {
      getStores(input: $input) {
        list {
          _id
          memberFullName
          memberNick
          memberDesc
          memberImage
        }
        metaCounter { total }
      }
    }
  `;

  try {
    const [{ getProducts }, { getBoardArticles }, { getNotices }, { getStores }] = await Promise.all([
      tryQueryWithVariants<{ getProducts: any }>(req, graphqlUrl, PRODUCTS_Q, userQuestion),
      tryQueryWithVariants<{ getBoardArticles: any }>(req, graphqlUrl, ARTICLES_Q, userQuestion),
      tryQueryWithVariants<{ getNotices: any }>(req, graphqlUrl, NOTICES_Q, userQuestion),
      tryQueryWithVariants<{ getStores: any }>(req, graphqlUrl, STORES_Q, userQuestion),
    ]);

    const products = getProducts?.list || [];
    const articles = getBoardArticles?.list || [];
    const notices = getNotices?.list || [];
    const stores = getStores?.list || [];

    if (products.length) {
      pieces.push('### Products');
      for (const p of products) {
        const url = `${siteOrigin}/product/${p._id}`;
        pieces.push(
          `- ${p.productTitle} · ${p.productMaterial || 'Material N/A'} · ${p.productCategory || 'N/A'} · ${p.productPrice}
Link: ${url}
${(p.productDesc || '').slice(0, 220)}`
        );
      }
    }

    if (articles.length) {
      pieces.push('### Articles');
      for (const a of articles) {
        const url = `${siteOrigin}/board/article/${a._id}`;
        const text = String(a.articleContent || '').replace(/<[^>]+>/g, ' ');
        pieces.push(`- ${a.articleTitle} [${a.articleCategory}] · ${url}
${text.slice(0, 300)}`);
      }
    }

    if (notices.length) {
      pieces.push('### Notices');
      for (const n of notices) {
        const url = `${siteOrigin}/notice/${n._id}`;
        const text = String(n.noticeContent || '').replace(/<[^>]+>/g, ' ');
        pieces.push(`- ${n.noticeTitle} · ${url}
${text.slice(0, 240)}`);
      }
    }

    if (stores.length) {
      pieces.push('### Stores');
      for (const s of stores) {
        const url = `${siteOrigin}/store/${s._id}`;
        pieces.push(`- ${s.memberFullName || s.memberNick || 'Store'} · ${url}
${(s.memberDesc || '').slice(0, 200)}`);
      }
    }
  } catch {
    // Retrieval is optional; if it fails we'll still answer generically
  }

  if (!pieces.length) return '';
  return `You are the Veloura site assistant (local dev).
Use the context below when relevant. If info is missing, say what you need.

${pieces.join('\n\n')}`;
}

/** ----------------------------------------------------------
 * API Route: streams model output via SSE
 * --------------------------------------------------------- */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    // CORS preflight (generous for local dev)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages } = req.body as {
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  };
  if (!messages?.length) return res.status(400).json({ error: 'messages required' });

  const SITE_ORIGIN = resolveSiteOrigin(req);
  const GRAPHQL_URL = resolveGraphqlUrl();

  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  try {
    const latestUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const siteContext = await retrieveSiteContext(req, latestUser, SITE_ORIGIN, GRAPHQL_URL);

    const openaiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY (or NEXT_PUBLIC_OPENAI_API_KEY) is missing in .env.local');
    }

    const input = siteContext ? [{ role: 'system', content: siteContext }, ...messages] : messages;

    const upstream = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        input,
        stream: true,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      throw new Error(`Upstream error: ${upstream.status} ${text}`);
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const flush = (line: string) => {
      if (!line.startsWith('data:')) return;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      try {
        const evt = JSON.parse(payload);

        if (evt?.error) {
          res.write(`data: ${JSON.stringify({ error: String(evt.error) })}\n\n`);
          return;
        }

        if (evt.type === 'response.output_text.delta' && typeof evt.delta === 'string') {
          res.write(`data: ${JSON.stringify({ delta: evt.delta })}\n\n`);
        }
        if (evt.type === 'response.completed') {
          res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        }
      } catch {
      }
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
    buffer.split('\n').forEach(flush);
    res.end();
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ error: err?.message || 'stream failed' })}\n\n`);
    res.end();
  }
}
