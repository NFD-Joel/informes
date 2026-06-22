// Cloudflare Worker: cross-device store for the informe "written" marks.
//
//   GET  /state  -> { slug: boolean }            (open, read-only)
//   POST /state  -> { slug, written } body        (requires Bearer WRITE_TOKEN)
//   POST /auth   -> { ok: true } / 401            (validate a PIN, no writes)
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

// True when the request carries the correct Bearer token.
function authorized(request: Request, env: Env): boolean {
  const token = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  return !!env.WRITE_TOKEN && token === env.WRITE_TOKEN;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    // Validate a PIN without touching state.
    if (url.pathname === '/auth' && request.method === 'POST') {
      return authorized(request, env)
        ? json({ ok: true })
        : json({ ok: false }, 401);
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
      if (!authorized(request, env)) {
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
