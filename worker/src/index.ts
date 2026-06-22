// Cloudflare Worker: cross-device store for the informe "written" marks.
//
//   GET  /state  -> { slug: boolean }            (open, read-only)
//   POST /state  -> { slug, written } body        (requires Bearer WRITE_TOKEN)
//
// State is a single JSON blob in Workers KV under the key "marks".

export interface Env {
  MARKS: KVNamespace;
  WRITE_TOKEN: string;
}

const KEY = 'marks';
const ALLOW_ORIGIN = 'https://informes.xaytag.com';

function cors(extra: Record<string, string> = {}): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    ...extra,
  };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: cors({ 'Content-Type': 'application/json' }),
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    if (url.pathname !== '/state') {
      return json({ error: 'not found' }, 404);
    }

    if (request.method === 'GET') {
      const stored = (await env.MARKS.get(KEY)) ?? '{}';
      return new Response(stored, {
        headers: cors({ 'Content-Type': 'application/json' }),
      });
    }

    if (request.method === 'POST') {
      const auth = request.headers.get('Authorization') ?? '';
      const token = auth.replace(/^Bearer\s+/i, '');
      if (!env.WRITE_TOKEN || token !== env.WRITE_TOKEN) {
        return json({ error: 'unauthorized' }, 401);
      }

      let payload: { slug?: unknown; written?: unknown };
      try {
        payload = await request.json();
      } catch {
        return json({ error: 'bad json' }, 400);
      }

      const slug = payload.slug;
      const written = payload.written;
      if (typeof slug !== 'string' || typeof written !== 'boolean') {
        return json({ error: 'expected { slug: string, written: boolean }' }, 400);
      }

      const marks = JSON.parse((await env.MARKS.get(KEY)) ?? '{}') as Record<string, boolean>;
      if (written) {
        marks[slug] = true;
      } else {
        delete marks[slug];
      }
      await env.MARKS.put(KEY, JSON.stringify(marks));
      return json(marks);
    }

    return json({ error: 'method not allowed' }, 405);
  },
};
