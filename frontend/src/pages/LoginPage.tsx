import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useTenantBranding } from '../hooks/useTenantBranding';

const APP_MODE = import.meta.env.VITE_APP_MODE || 'multi';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();
  const { tenant: tenantBranding } = useTenantBranding();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { username, password });
      setAuth(data.user);
      navigate('/');
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 429) {
        setError('Too many login attempts. Please wait a few minutes before trying again.');
      } else if (status === 401 || status === 400) {
        setError('Invalid username or password. Please check your credentials.');
      } else if (status === 403) {
        setError('Your account has been locked. Please contact your administrator.');
      } else {
        setError('Unable to connect to the server. Please try again shortly.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      {/* ── Left brand panel (desktop only) ── */}
      <div className="auth-brand-panel">
        <div className="auth-brand-blobs">
          <div className="auth-brand-blob auth-brand-blob-1" />
          <div className="auth-brand-blob auth-brand-blob-2" />
          <div className="auth-brand-blob auth-brand-blob-3" />
        </div>
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              width="48"
              height="48"
            >
              <rect width="40" height="40" rx="10" fill="url(#bpLogoGrad)" />
              <path d="M8 28L14 16L20 22L26 12L32 28H8Z" fill="white" opacity="0.95" />
              <defs>
                <linearGradient id="bpLogoGrad" x1="0" y1="0" x2="40" y2="40">
                  <stop offset="0%" stopColor="#84cc16" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>
            <span className="auth-brand-name">KampStock</span>
          </div>
          <h2 className="auth-brand-headline">
            Run your business
            <br />
            smarter, faster.
          </h2>
          <p className="auth-brand-subtext">
            The all-in-one POS &amp; inventory platform built for Ugandan wholesale and retail
            businesses.
          </p>
          <ul className="auth-brand-features">
            {[
              'Real-time stock tracking',
              'Multi-location support',
              'Offline-first POS',
              'Automated reports & P&L',
            ].map((f) => (
              <li key={f}>
                <span className="auth-brand-check">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="auth-brand-badge">Trusted by 200+ shops across Uganda</div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          {/* Mobile logo */}
          <div className="auth-mobile-logo">
            <svg
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              width="36"
              height="36"
            >
              <rect width="40" height="40" rx="10" fill="url(#mobLogoGrad)" />
              <path d="M8 28L14 16L20 22L26 12L32 28H8Z" fill="white" opacity="0.95" />
              <defs>
                <linearGradient id="mobLogoGrad" x1="0" y1="0" x2="40" y2="40">
                  <stop offset="0%" stopColor="#84cc16" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
            </svg>
            <span>KampStock</span>
          </div>

          <div className="auth-form-heading">
            <h1>{tenantBranding ? tenantBranding.name : 'Welcome back'}</h1>
            <p>
              {tenantBranding
                ? 'Powered by KampStock'
                : APP_MODE === 'single'
                  ? 'Shop owner access'
                  : 'Sign in to your account'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {APP_MODE !== 'single' && (
              <div className="auth-field">
                <label className="auth-label" htmlFor="login-username">
                  Username
                </label>
                <div className="auth-input-wrap">
                  <span className="auth-input-icon">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <input
                    id="login-username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="auth-input"
                    placeholder="Enter your username"
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>
            )}

            <div className="auth-field">
              <label className="auth-label" htmlFor="login-password">
                {APP_MODE === 'single' ? 'Owner Password' : 'Password'}
              </label>
              <div className="auth-input-wrap">
                <span className="auth-input-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="auth-input"
                  placeholder="Enter password"
                  required
                  autoFocus={APP_MODE === 'single'}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="auth-pw-toggle"
                  onClick={() => setShowPw((v) => !v)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPw ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-error" role="alert">
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="auth-btn-primary">
              {loading ? (
                <span className="auth-btn-loading">
                  <span className="auth-spinner" />
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {APP_MODE !== 'single' && (
            <p className="auth-switch-link">
              New business? <Link to="/register">Create a free account</Link>
            </p>
          )}

          <div className="auth-footer">
            <span>KampStock v2.0</span>
            <span className="auth-footer-dot">·</span>
            <a href="https://perezchris.netlify.app" target="_blank" rel="noopener noreferrer">
              Designed by Perez Chris
            </a>
            <span className="auth-footer-dot">·</span>
            <Link to="/about">About</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
