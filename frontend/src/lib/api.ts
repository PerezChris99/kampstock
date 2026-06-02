import axios from 'axios';
import { getSubdomain } from '../utils/subdomain';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  // Send httpOnly cookies automatically on every request
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  // Tell the backend which tenant this request belongs to
  const subdomain = getSubdomain();
  if (subdomain) config.headers['X-Tenant-Subdomain'] = subdomain;
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
        // Refresh cookie is scoped to /api/auth so it is NOT sent on this request —
        // we call the refresh endpoint explicitly with withCredentials
        await axios.post(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/auth/refresh`,
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
