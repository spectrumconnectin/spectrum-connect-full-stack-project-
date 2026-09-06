/**
 * Carries a "message this creator" intent across the login/signup + onboarding
 * flow, which a visitor who isn't logged in has to pass through before they can
 * land on the messaging page. Set when they click Contact Creator while
 * logged out; consumed once, on first render of either dashboard, which is
 * the one landing point both login and onboarding-completion redirect to.
 */

const KEY = 'sc_contact_intent';
const TTL_MS = 30 * 60 * 1000; // long enough to survive signup + email verify + onboarding

export interface ContactIntent {
  userId: string;
  message: string;
}

export function setContactIntent(intent: ContactIntent): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...intent, ts: Date.now() }));
  } catch { /* storage unavailable — the redirect-to-login still works, just without resume */ }
}

/** Reads and clears the pending intent in one step, so it can only ever fire once. */
export function consumeContactIntent(): ContactIntent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    localStorage.removeItem(KEY);
    const parsed = JSON.parse(raw) as ContactIntent & { ts: number };
    if (Date.now() - parsed.ts > TTL_MS) return null;
    return { userId: parsed.userId, message: parsed.message };
  } catch {
    return null;
  }
}
