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
// Read the csrf_token from the cookie (set by the backend CsrfMiddleware).
// The cookie is NOT httpOnly so JS can read it.
function getCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

const UNSAFE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

api.interceptors.request.use(async (config) => {
  // Attach tenant subdomain
  const subdomain = getSubdomain();
  if (subdomain) config.headers['X-Tenant-Subdomain'] = subdomain;

  // Attach CSRF token for state-changing requests
  const method = (config.method ?? '').toLowerCase();
  if (UNSAFE_METHODS.has(method)) {
    let csrfToken = getCsrfCookie();
    if (!csrfToken) {
      // Fetch CSRF token if cookie not yet set
      try {
        await axios.get(`${API_BASE}/auth/csrf`, { withCredentials: true });
        csrfToken = getCsrfCookie();
      } catch {
        // Proceed without — server will reject if token required
      }
    }
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
        await axios.post(
          `${API_BASE}/auth/refresh`,
          {},
          { withCredentials: true },
        );
        // New access_token cookie is now set; retry the original request
        return api(originalRequest);
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
