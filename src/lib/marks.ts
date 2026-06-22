// Client helpers for the cross-device "written" marks.
//
// State lives in a Cloudflare Worker backed by Workers KV. Reads are open so
// every device shows the current state instantly; writes require a PIN (equal
// to the Worker's WRITE_TOKEN secret), entered once per browser via the styled
// modal in ./pin and then cached in localStorage — never committed to the repo.

import { WORKER_URL } from './config';
import { ensurePin, clearPin, openPinModal } from './pin';

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

/**
 * Persist a single mark. Prompts for the PIN via the modal if needed. Returns
 * true on success. On a rejected PIN the cached value is cleared and the modal
 * re-opens so the user can retry.
 */
export async function setMark(slug: string, written: boolean): Promise<boolean> {
  let pin = await ensurePin();
  if (!pin) return false;

  const post = (token: string) =>
    fetch(`${WORKER_URL}/state`, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ slug, written }),
    });

  try {
    let res = await post(pin);

    if (res.status === 401) {
      // Stale PIN — clear it, re-prompt, and try once more.
      clearPin();
      pin = await openPinModal({ message: 'Your PIN is no longer valid.' });
      if (!pin) return false;
      res = await post(pin);
    }

    return res.ok;
  } catch {
    return false;
  }
}
