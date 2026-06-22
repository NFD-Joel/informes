// PIN handling for the "written" marks: storage, validation against the Worker,
// and a styled modal that replaces the native window.prompt/alert.

import { WORKER_URL } from './config';

const PIN_KEY = 'informe-pin';

export function getStoredPin(): string | null {
  return localStorage.getItem(PIN_KEY);
}

export function storePin(pin: string): void {
  localStorage.setItem(PIN_KEY, pin);
}

export function clearPin(): void {
  localStorage.removeItem(PIN_KEY);
}

/** Ask the Worker whether a PIN is valid, without writing anything. */
export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const res = await fetch(`${WORKER_URL}/auth`, {
      method: 'POST',
      mode: 'cors',
      headers: { Authorization: `Bearer ${pin}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Styled modal -----------------------------------------------------------

let stylesInjected = false;

function injectStyles(): void {
  if (stylesInjected) return;
  stylesInjected = true;
  const css = `
    .pin-backdrop {
      position: fixed; inset: 0; z-index: 100;
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(4px);
      opacity: 0; transition: opacity 0.18s ease;
    }
    .pin-backdrop.show { opacity: 1; }
    .pin-modal {
      width: 100%; max-width: 340px;
      background: var(--bg-card, #16161c);
      border: 1px solid var(--border, #26262f);
      border-radius: 16px;
      padding: 1.5rem 1.4rem 1.3rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      transform: translateY(8px) scale(0.98);
      transition: transform 0.18s ease;
      font-family: inherit;
      color: var(--text, #e6e6ea);
    }
    .pin-backdrop.show .pin-modal { transform: none; }
    .pin-modal h2 {
      margin: 0 0 0.3rem; font-size: 1.15rem; font-weight: 600;
    }
    .pin-modal p {
      margin: 0 0 1.1rem; font-size: 0.88rem; line-height: 1.4;
      color: var(--text-dim, #9a9aa6);
    }
    .pin-input {
      width: 100%; padding: 0.65rem 0.9rem;
      font: inherit; font-size: 1.1rem; letter-spacing: 0.15em; text-align: center;
      color: var(--text, #e6e6ea);
      background: var(--bg, #0d0d10);
      border: 1px solid var(--border, #26262f);
      border-radius: 10px; outline: none;
      transition: border-color 0.15s ease;
    }
    .pin-input:focus { border-color: var(--accent, #6ea8fe); }
    .pin-input.error { border-color: var(--bad, #f87171); animation: pin-shake 0.3s; }
    @keyframes pin-shake {
      0%,100%{transform:translateX(0)} 25%{transform:translateX(-5px)} 75%{transform:translateX(5px)}
    }
    .pin-msg {
      min-height: 1.1rem; margin: 0.5rem 0 0;
      font-size: 0.8rem; color: var(--bad, #f87171);
    }
    .pin-actions {
      display: flex; gap: 0.6rem; margin-top: 1.1rem;
    }
    .pin-btn {
      flex: 1; padding: 0.6rem 0.9rem;
      font: inherit; font-size: 0.9rem; font-weight: 600;
      border-radius: 10px; cursor: pointer; border: 1px solid transparent;
      transition: background 0.15s ease, border-color 0.15s ease, opacity 0.15s ease;
    }
    .pin-btn.primary { background: var(--accent, #6ea8fe); color: #07111f; }
    .pin-btn.primary:hover { opacity: 0.9; }
    .pin-btn.primary:disabled { opacity: 0.5; cursor: default; }
    .pin-btn.ghost {
      background: transparent; color: var(--text-dim, #9a9aa6);
      border-color: var(--border, #26262f);
    }
    .pin-btn.ghost:hover { color: var(--text, #e6e6ea); border-color: var(--border-hover, #3a3a48); }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

interface PinModalOptions {
  /** Shown as the subtitle. */
  message?: string;
  /** Allow dismissing without entering a PIN (Escape / backdrop / "Später"). */
  dismissible?: boolean;
}

/**
 * Show the PIN modal and resolve with a *validated* PIN, or null if dismissed.
 * The returned PIN has already been checked against the Worker and stored.
 */
export function openPinModal(opts: PinModalOptions = {}): Promise<string | null> {
  const { message = 'Einmal pro Gerät — danach gemerkt.', dismissible = true } = opts;
  injectStyles();

  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'pin-backdrop';
    backdrop.innerHTML = `
      <div class="pin-modal" role="dialog" aria-modal="true" aria-label="PIN eingeben">
        <h2>🔒 PIN eingeben</h2>
        <p>${message}</p>
        <input class="pin-input" type="password" inputmode="numeric"
               autocomplete="off" aria-label="PIN" />
        <p class="pin-msg" aria-live="polite"></p>
        <div class="pin-actions">
          ${dismissible ? '<button class="pin-btn ghost" data-act="cancel">Später</button>' : ''}
          <button class="pin-btn primary" data-act="ok" disabled>Bestätigen</button>
        </div>
      </div>`;

    const input = backdrop.querySelector<HTMLInputElement>('.pin-input')!;
    const msg = backdrop.querySelector<HTMLElement>('.pin-msg')!;
    const okBtn = backdrop.querySelector<HTMLButtonElement>('[data-act="ok"]')!;
    const cancelBtn = backdrop.querySelector<HTMLButtonElement>('[data-act="cancel"]');

    function close(result: string | null) {
      backdrop.classList.remove('show');
      setTimeout(() => backdrop.remove(), 180);
      document.removeEventListener('keydown', onKey);
      resolve(result);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && dismissible) close(null);
    }

    async function submit() {
      const pin = input.value.trim();
      if (!pin) return;
      okBtn.disabled = true;
      okBtn.textContent = 'Prüfen…';
      msg.textContent = '';
      if (await verifyPin(pin)) {
        storePin(pin);
        close(pin);
      } else {
        okBtn.disabled = false;
        okBtn.textContent = 'Bestätigen';
        input.classList.add('error');
        msg.textContent = 'Falscher PIN.';
        input.select();
      }
    }

    input.addEventListener('input', () => {
      okBtn.disabled = input.value.trim() === '';
      input.classList.remove('error');
      msg.textContent = '';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit();
    });
    okBtn.addEventListener('click', submit);
    cancelBtn?.addEventListener('click', () => close(null));
    if (dismissible) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) close(null);
      });
    }

    document.addEventListener('keydown', onKey);
    document.body.appendChild(backdrop);
    requestAnimationFrame(() => {
      backdrop.classList.add('show');
      input.focus();
    });
  });
}

/**
 * Return a valid PIN, prompting via the modal if needed. A cached PIN is
 * trusted (it was validated when stored). Resolves null if the user dismisses.
 */
export async function ensurePin(): Promise<string | null> {
  const stored = getStoredPin();
  if (stored) return stored;
  return openPinModal();
}

/**
 * Called on page load: if no PIN is stored yet, prompt for one up front so
 * marking is frictionless afterwards. Dismissible — reading never needs a PIN.
 * If a stored PIN turns out to be stale, it's cleared and re-prompted.
 */
export async function promptPinOnLoad(): Promise<void> {
  const stored = getStoredPin();
  if (stored) {
    if (!(await verifyPin(stored))) {
      clearPin();
      await openPinModal({ message: 'Dein gespeicherter PIN gilt nicht mehr.' });
    }
    return;
  }
  await openPinModal();
}
