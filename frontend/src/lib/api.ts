import axios from 'axios';
import { getSubdomain } from '../utils/subdomain';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
  // 3. Fetch from endpoint — works for cross-origin because endpoint returns body
  try {
    const res = await axios.get(`${API_BASE}/auth/csrf`, { withCredentials: true });
    const token = res.data?.csrfToken ?? getCsrfCookie();
    if (token) {
      _csrfToken = token;
      return _csrfToken;
    }
  } catch {
    // Non-fatal: proceed without CSRF (server will reject if required)
  }
  return null;
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

    // 401 — access token expired; attempt silent refresh via httpOnly refresh cookie
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        await axios.post(`${API_BASE}/auth/refresh`, {}, { withCredentials: true });
        // New access_token cookie is now set; retry the original request
        return api(originalRequest);
      } catch {
        _csrfToken = null; // Clear stale CSRF token on session expiry
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
