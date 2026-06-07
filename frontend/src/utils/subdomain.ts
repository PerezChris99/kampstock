/**
 * Extracts the tenant subdomain from the current browser hostname.
 *
 * The authoritative way to detect subdomains is to compare the current hostname
 * against the configured root app domain (VITE_APP_DOMAIN). Anything to the
 * left of the root domain is the tenant subdomain.
 *
 * Examples with VITE_APP_DOMAIN=kampstock.app:
 *  - `acme.kampstock.app`   → 'acme'
 *  - `kampstock.app`        → null   (root domain — no subdomain)
 *  - `acme.localhost`       → 'acme' (dev fallback)
 *  - `localhost`            → null
 *
 * This approach is permanent: it works regardless of the hosting provider,
 * number of hostname parts, or Vercel project naming conventions.
 */

const ROOT_DOMAIN = (import.meta.env.VITE_APP_DOMAIN as string | undefined)
  ?.toLowerCase()
  .replace(/^https?:\/\//, '') // strip scheme if someone included it
  .replace(/\/$/, '')          // strip trailing slash
  || null;

export function getSubdomain(): string | null {
  const hostname = window.location.hostname.toLowerCase();

  // IP address — never has a meaningful subdomain
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;

  // ── Env-var driven (production & staging) ──────────────────────────────────
  // If VITE_APP_DOMAIN is configured, use it as the authoritative root.
  // Only a prefix of the form "<subdomain>.<ROOT_DOMAIN>" is a tenant.
  if (ROOT_DOMAIN) {
    const suffix = `.${ROOT_DOMAIN}`;
    if (hostname === ROOT_DOMAIN) return null;            // root domain itself
    if (hostname.endsWith(suffix)) {
      const sub = hostname.slice(0, hostname.length - suffix.length);
      // Must be a simple label (no dots), non-empty, not a reserved prefix
      const RESERVED = new Set(['www', 'api', 'mail', 'app', 'admin']);
      if (sub && !sub.includes('.') && !RESERVED.has(sub)) return sub;
    }
    // Hostname doesn't match configured domain at all (e.g. localhost in dev)
    // Fall through to the localhost heuristic below.
  }

  // ── Dev fallback: *.localhost ───────────────────────────────────────────────
  const parts = hostname.split('.');
  if (parts.length === 2 && parts[1] === 'localhost') {
    const sub = parts[0];
    return sub && sub !== 'localhost' ? sub : null;
  }

  // ── If no VITE_APP_DOMAIN is set, do NOT guess from hostname parts ──────────
  // Returning null here is safe: the X-Tenant-Subdomain header won't be sent,
  // and the backend will not attempt tenant resolution from the Host header
  // (it also guards against the same class of false positives).
  return null;
}
