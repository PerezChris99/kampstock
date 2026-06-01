import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function LockedPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/billing/unlock', { code: code.trim().toLowerCase() });
      setSuccess(true);
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid or already-used unlock code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '16px',
          padding: '48px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
        }}
      >
        {/* Lock icon */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)',
              border: '2px solid rgba(239,68,68,0.4)',
              fontSize: '32px',
            }}
          >
            🔒
          </div>
        </div>

        <h1
          style={{
            color: '#f1f5f9',
            fontSize: '24px',
            fontWeight: 700,
            textAlign: 'center',
            margin: '0 0 8px',
          }}
        >
          Subscription Expired
        </h1>
        <p
          style={{
            color: '#94a3b8',
            textAlign: 'center',
            fontSize: '14px',
            margin: '0 0 32px',
            lineHeight: 1.6,
          }}
        >
          Your KampStock subscription has expired. Renew your plan on the billing page and enter the
          unlock code you receive after payment to restore access.
        </p>

        {success ? (
          <div
            style={{
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.4)',
              borderRadius: '8px',
              padding: '16px',
              color: '#86efac',
              textAlign: 'center',
              fontSize: '14px',
            }}
          >
            ✅ Unlock successful! Redirecting…
          </div>
        ) : (
          <form onSubmit={handleUnlock}>
            <label
              style={{
                display: 'block',
                color: '#cbd5e1',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '8px',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Unlock Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter your 32-character unlock code"
              autoComplete="off"
              spellCheck={false}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: '#0f172a',
                border: `1px solid ${error ? '#ef4444' : '#334155'}`,
                borderRadius: '8px',
                color: '#f1f5f9',
                fontSize: '14px',
                padding: '12px 16px',
                outline: 'none',
                marginBottom: '8px',
                fontFamily: 'monospace',
                letterSpacing: '0.05em',
              }}
            />
            {error && (
              <p style={{ color: '#f87171', fontSize: '13px', margin: '0 0 12px' }}>{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || code.trim().length < 8}
              style={{
                width: '100%',
                padding: '13px',
                background: loading ? '#475569' : '#6366f1',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '15px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '4px',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Verifying…' : 'Unlock Access'}
            </button>
          </form>
        )}

        <div
          style={{
            marginTop: '28px',
            paddingTop: '24px',
            borderTop: '1px solid #334155',
            display: 'flex',
            gap: '12px',
            flexDirection: 'column',
          }}
        >
          <a
            href="/billing"
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '12px',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: '8px',
              color: '#a5b4fc',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            💳 Renew on Billing Page
          </a>
          <a
            href="/login"
            style={{
              display: 'block',
              textAlign: 'center',
              color: '#64748b',
              textDecoration: 'none',
              fontSize: '13px',
            }}
          >
            Switch account
          </a>
        </div>
      </div>
    </div>
  );
}
