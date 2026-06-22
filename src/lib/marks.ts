// Client helpers for the cross-device "written" marks.
//
// State lives in a Cloudflare Worker backed by Workers KV. Reads are open so
// every device shows the current state instantly; writes require a PIN (equal
// to the Worker's WRITE_TOKEN secret) which the user enters once per browser
// and which is then cached in localStorage — it is never committed to the repo.

// Base URL of the deployed Worker (set after `wrangler deploy`).
export const WORKER_URL = 'https://informe-marks.xaytag.workers.dev';

const PIN_KEY = 'informe-pin';

export type Marks = Record<string, boolean>;

/** Fetch the full { slug: written } map. Returns {} on any failure. */
export async function getMarks(): Promise<Marks> {
  try {
    const res = await fetch(`${WORKER_URL}/state`, { mode: 'cors' });
    if (!res.ok) return {};
    return (await res.json()) as Marks;
  } catch {
    return {};
  }
}

function getPin(): string | null {
  return localStorage.getItem(PIN_KEY);
}

/**
 * Persist a single mark. Prompts for the PIN if needed. Returns true on
 * success. On a rejected PIN the cached value is cleared so the next attempt
 * re-prompts.
 */
export async function setMark(slug: string, written: boolean): Promise<boolean> {
  let pin = getPin();
  if (!pin) {
    pin = window.prompt('PIN zum Abhaken eingeben:');
    if (!pin) return false;
  }

  try {
    const res = await fetch(`${WORKER_URL}/state`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pin}`,
      },
      body: JSON.stringify({ slug, written }),
    });

    if (res.status === 401) {
      localStorage.removeItem(PIN_KEY);
      window.alert('Falscher PIN.');
      return false;
    }
    if (!res.ok) return false;

    localStorage.setItem(PIN_KEY, pin);
    return true;
  } catch {
    return false;
  }
}
