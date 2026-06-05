import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';
import { useTenantBranding } from '../hooks/useTenantBranding';

// Mode: 'single' = shop owner only (simplified), 'multi' = full role-based login
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
    <div className="ks-login-bg">
      <div className="ks-blob ks-blob-1" />
      <div className="ks-blob ks-blob-2" />
      <div className="ks-blob ks-blob-3" />

      <div className="ks-card-glow-wrapper">
        <div className="ks-card-glow-ring" />
        <div className="ks-card">
          {/* Logo */}
          <div className="ks-card-header">
            <div className="ks-logo-icon">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
                <rect width="40" height="40" rx="10" fill="url(#logoGrad)" />
                <path d="M8 28L14 16L20 22L26 12L32 28H8Z" fill="white" opacity="0.9" />
                <defs>
                  <linearGradient id="logoGrad" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#84cc16" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            {tenantBranding ? (
              <>
                <h1 className="ks-card-title">{tenantBranding.name}</h1>
                <p className="ks-card-subtitle">Powered by KampStock</p>
              </>
            ) : (
              <>
                <h1 className="ks-card-title">KampStock</h1>
                <p className="ks-card-subtitle">
                  {APP_MODE === 'single' ? 'Shop Owner Access' : 'Wholesale & Retail Management'}
                </p>
              </>
            )}
            {APP_MODE === 'single' && (
              <div className="ks-single-mode-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                Single User Mode
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="ks-form">
            {APP_MODE !== 'single' && (
              <div className="ks-field">
                <label className="ks-label">Username</label>
                <div className="ks-input-wrap">
                  <span className="ks-input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="ks-input"
                    placeholder="Enter your username"
                    required
                    autoFocus
                    autoComplete="username"
                  />
                </div>
              </div>
            )}

            <div className="ks-field">
              <label className="ks-label">
                {APP_MODE === 'single' ? 'Owner Password' : 'Password'}
              </label>
              <div className="ks-input-wrap">
                <span className="ks-input-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </span>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ks-input"
                  placeholder="Enter password"
                  required
                  autoFocus={APP_MODE === 'single'}
                  autoComplete="current-password"
                />
                <button type="button" className="ks-pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                  {showPw ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="ks-error-box">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="ks-btn-submit">
              {loading ? (
                <span className="ks-spinner-wrap">
                  <span className="ks-spinner" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {APP_MODE !== 'single' && (
            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#71717a', margin: '0.25rem 0 0.75rem' }}>
              New business?{' '}
              <Link to="/register" style={{ color: '#84cc16', textDecoration: 'none', fontWeight: 600 }}>Create a free account</Link>
            </p>
          )}

          <div className="ks-footer-hint">
            <span className="ks-footer-brand">KampStock v2.0</span>
            <span className="ks-footer-sep">·</span>
            <a
              href="https://perezchris.netlify.app"
              target="_blank"
              rel="noopener noreferrer"
              className="ks-footer-link"
            >
              Designed by Perez Chris
            </a>
            <span className="ks-footer-sep">·</span>
            <Link to="/about" className="ks-footer-link">About</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

