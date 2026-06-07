/**
 * Extracts the tenant subdomain from the current browser hostname.
 *
 * Rules:
 *  - `acme.kampstock.com`   → 'acme'
 *  - `acme.localhost`       → 'acme'
 *  - `kampstock.com`        → null
 *  - `www.kampstock.com`    → null
 *  - `localhost`            → null
 *  - `127.0.0.1`           → null
 */
export function getSubdomain(): string | null {
  const hostname = window.location.hostname.toLowerCase();

  // IP address — no subdomain
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;

  const parts = hostname.split('.');

  // Must have at least 3 parts for a real subdomain
  if (parts.length < 2) return null;

  // Special case: *.localhost (2 parts, e.g. acme.localhost)
  if (parts.length === 2 && parts[1] === 'localhost') {
    const sub = parts[0];
    return sub && sub !== 'localhost' ? sub : null;
  }

  // Standard domain with subdomain (3+ parts)
  if (parts.length >= 3) {
    const sub = parts[0];
    // Skip generic prefixes AND the known Vercel app hostnames for this deployment
    // so that kampstock-avmu.vercel.app and kampstock-pzmh.vercel.app are never
    // mistaken for tenant subdomains.
    const SKIP = new Set([
      'www', 'api', 'mail', 'app',
      'kampstock-avmu',  // production frontend on Vercel
      'kampstock-pzmh',  // production backend on Vercel
    ]);
    return sub && !SKIP.has(sub) ? sub : null;
  }

  return null;
}
