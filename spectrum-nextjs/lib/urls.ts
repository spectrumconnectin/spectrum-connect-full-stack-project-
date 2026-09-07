/**
 * Web-address fields the user types by hand.
 *
 * The profile forms mark these inputs `type="url"`, but that only buys native
 * validation on a native form submit — and these forms save through a click
 * handler, so the browser never checks anything. "hhshshsh" saved cleanly into
 * a LinkedIn field and came back as a broken link on the public profile.
 */

/** Looks like a hostname: at least one dot, and a plausible TLD. */
const HOSTNAME = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

/**
 * Normalise what someone typed into a URL we can store, or null if it cannot
 * be read as a web address.
 *
 * Accepts a bare host ("epunmanula.com") by assuming https, since that is what
 * people type. Rejects anything with no dot at all, which is what separates a
 * real address from a handle or keyboard mash.
 */
export function normaliseUrl(raw: string): string | null {
  const value = (raw || '').trim();
  if (!value) return null;

  // Anything carrying its own scheme must carry an acceptable one. Without this
  // check "mailto:a@b.com" got https:// glued on the front and then parsed as
  // host b.com with userinfo "mailto:a" — a valid-looking URL to somewhere the
  // user never named.
  const scheme = value.match(/^([a-z][a-z0-9+.-]*):/i);
  if (scheme && !/^https?$/i.test(scheme[1])) return null;

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }

  // Only web addresses — no javascript:, mailto:, data: and friends.
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!HOSTNAME.test(parsed.hostname)) return null;
  // Embedded credentials are never something a profile link should carry, and
  // they are the classic way to make a link read as one host while going to
  // another.
  if (parsed.username || parsed.password) return null;

  return parsed.toString();
}

/** True when the value is non-empty and cannot be read as a web address. */
export function isInvalidUrl(raw: string): boolean {
  return Boolean((raw || '').trim()) && normaliseUrl(raw) === null;
}

/**
 * Check a set of labelled URL fields at once.
 * Returns the labels that failed, so the form can name them in one message.
 * Empty fields are fine — these are all optional.
 */
export function invalidUrlLabels(fields: Record<string, string>): string[] {
  return Object.entries(fields)
    .filter(([, value]) => isInvalidUrl(value))
    .map(([label]) => label);
}
