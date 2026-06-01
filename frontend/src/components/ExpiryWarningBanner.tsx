import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';

interface BillingStatus {
  daysLeft: number | null;
  warningActive: boolean;
  planExpiresAt: string | null;
}

const SESSION_DISMISS_KEY = 'expiry_warning_dismissed';

export default function ExpiryWarningBanner() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    if (!isAuthenticated) return;
    // Check if dismissed this session
    if (sessionStorage.getItem(SESSION_DISMISS_KEY)) {
      setDismissed(true);
      return;
    }

    api
      .get('/billing/my')
      .then(({ data }) => {
        setStatus({
          daysLeft: data.daysLeft ?? null,
          warningActive: data.warningActive ?? false,
          planExpiresAt: data.planExpiresAt ?? null,
        });
      })
      .catch(() => {
        // Non-critical — silently ignore
      });
  }, [isAuthenticated]);

  if (!status?.warningActive || dismissed) return null;

  const { daysLeft, planExpiresAt } = status;
  const expiryStr = planExpiresAt
    ? new Date(planExpiresAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : '';

  const urgency = daysLeft === 1 ? 'danger' : 'warning';
  const colors = {
    danger: { bg: 'rgba(239,68,68,0.12)', border: '#ef4444', text: '#fca5a5', icon: '🔴' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: '#f59e0b', text: '#fcd34d', icon: '⚠️' },
  }[urgency];

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(SESSION_DISMISS_KEY, '1');
  };

  return (
    <div
      style={{
        background: colors.bg,
        borderBottom: `2px solid ${colors.border}`,
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: '16px' }}>{colors.icon}</span>
      <p style={{ margin: 0, color: colors.text, fontSize: '13px', flex: 1 }}>
        <strong>Subscription expiring soon!</strong>{' '}
        {daysLeft === 1 ? 'Expires tomorrow' : `${daysLeft} days left`}
        {expiryStr ? ` (${expiryStr})` : ''}.{' '}
        <button
          onClick={() => navigate('/billing')}
          style={{
            background: 'none',
            border: 'none',
            color: colors.text,
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: 0,
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Renew now →
        </button>
      </p>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          color: colors.text,
          cursor: 'pointer',
          fontSize: '18px',
          lineHeight: 1,
          padding: '0 4px',
          opacity: 0.7,
        }}
      >
        ×
      </button>
    </div>
  );
}
