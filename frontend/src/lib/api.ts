import axios from 'axios';
import { getSubdomain } from '../utils/subdomain';

const configuredApiBase = import.meta.env.VITE_API_URL?.trim();
if (import.meta.env.PROD && !configuredApiBase) {
  throw new Error('VITE_API_URL must be configured for production builds');
}
const API_BASE = configuredApiBase || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  // Send httpOnly cookies automatically on every request
  withCredentials: true,
});

// ── CSRF Token Management ────────────────────────────────────────────────────
// In same-origin setups: read from cookie. In cross-origin (production Vercel),
// cookies from the backend domain aren't readable by JS on the frontend domain,
// so we read the token from the /auth/csrf response body instead.
let _csrfToken: string | null = null;
let _csrfRequest: Promise<string | null> | null = null;
let _refreshRequest: Promise<void> | null = null;

function getCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function getOrFetchCsrfToken(): Promise<string | null> {
  // 1. Try in-memory cache first
  if (_csrfToken) return _csrfToken;
  // 2. Try cookie (works in same-origin dev)
  const fromCookie = getCsrfCookie();
  if (fromCookie) {
    _csrfToken = fromCookie;
    return _csrfToken;
  }
  // 3. Coalesce concurrent CSRF requests so a burst of mutations does not
  // create redundant authentication/bootstrap traffic.
  if (_csrfRequest) return _csrfRequest;
  _csrfRequest = (async () => {
  // Fetch from endpoint — retry up to 2 times on transient network failure
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await axios.get(`${API_BASE}/auth/csrf`, {
        withCredentials: true,
        timeout: 8000,
      });
      const token = res.data?.csrfToken ?? getCsrfCookie();
      if (token) {
        _csrfToken = token;
        return _csrfToken;
      }
    } catch {
      if (attempt < 2) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }
  return null;
  })();
  try {
    return await _csrfRequest;
  } finally {
    _csrfRequest = null;
  }
}

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

api.interceptors.request.use(async (config) => {
  // Attach tenant subdomain
  const subdomain = getSubdomain();
  if (subdomain) config.headers['X-Tenant-Subdomain'] = subdomain;

  // Attach CSRF token for state-changing requests
  const method = (config.method ?? '').toLowerCase();
  if (UNSAFE_METHODS.has(method)) {
    const csrfToken = await getOrFetchCsrfToken();
    if (csrfToken) config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    // 402 Payment Required — tenant subscription expired
    if (error.response?.status === 402) {
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/locked') && !currentPath.startsWith('/billing')) {
        window.location.href = '/locked';
      }
      return Promise.reject(error);
    }

    // 401 — access token expired; attempt silent refresh via httpOnly refresh cookie.
    // Skip auto-redirect on the login page itself to avoid redirect loops.
    const isLoginPage = window.location.pathname.startsWith('/login');
    if (error.response?.status === 401 && !originalRequest._retry && !isLoginPage) {
      originalRequest._retry = true;
      try {
        if (!_refreshRequest) {
          _refreshRequest = axios
            .post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true })
            .then(() => undefined)
            .finally(() => {
              _refreshRequest = null;
            });
        }
        await _refreshRequest;
        // New access_token cookie is now set; retry the original request.
        return api(originalRequest);
        _csrfToken = null; // Clear stale CSRF token on session expiry
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
