import { useState, useEffect } from 'react';
import api from '../lib/api';

const PLANS = [
  {
    key: 'starter',
    label: 'Starter',
    price: 50_000,
    period: '/month',
    features: ['Up to 2 users', '500 products', 'Basic reports', '1 stock location'],
    color: '#84cc16',
  },
  {
    key: 'professional',
    label: 'Professional',
    price: 150_000,
    period: '/month',
    features: ['Up to 10 users', 'Unlimited products', 'Full reports', 'Multi-location stock', 'Customer credit management'],
    color: '#f59e0b',
    popular: true,
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    price: 400_000,
    period: '/month',
    features: ['Unlimited users', 'Everything in Pro', 'Priority support', 'Custom subdomain', 'Audit logs'],
    color: '#8b5cf6',
  },
];

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: '#22c55e',
  PENDING: '#f59e0b',
  FAILED: '#ef4444',
  CANCELLED: '#71717a',
};

function fmt(n: number) {
  return `UGX ${n.toLocaleString()}`;
}

interface BillingInfo {
  plan: string;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  isActive: boolean;
  name: string;
  prices: Record<string, number>;
  history: Array<{
    id: number;
    plan: string;
    amount: number;
    currency: string;
    periodMonths: number;
    status: string;
    merchantRef: string;
    confirmedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
  }>;
}

export default function BillingPage() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [initiating, setInitiating] = useState<string | null>(null);
  const [period, setPeriod] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/billing/my');
      setInfo(data);
    } catch {
      setError('Failed to load billing info.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const subscribe = async (plan: string) => {
    setInitiating(plan);
    try {
      const { data } = await api.post('/billing/subscribe', { plan, periodMonths: period });
      // Redirect to Pesapal hosted payment page
      window.location.href = data.redirectUrl;
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(typeof msg === 'string' ? msg : 'Failed to initiate payment. Please try again.');
      setInitiating(null);
    }
  };

  const isCurrentPlan = (key: string) => info?.plan === key;

  const trialActive = info?.trialEndsAt ? new Date(info.trialEndsAt) > new Date() : false;
  const trialDaysLeft = info?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(info.trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : 0;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f4f4f5', marginBottom: '0.25rem' }}>Billing & Subscription</h1>
      <p style={{ color: '#71717a', marginBottom: '1.5rem', fontSize: '0.875rem' }}>Manage your plan and payment history</p>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', color: '#fca5a5', fontSize: '0.875rem', marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          {error}
          <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5' }}>✕</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#71717a' }}>Loading billing info…</div>
      ) : info && (
        <>
          {/* Status banner */}
          <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Current Plan</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f4f4f5', textTransform: 'capitalize' }}>{info.plan}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Status</div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: info.isActive ? '#22c55e' : '#ef4444' }}>
                {info.isActive ? '● Active' : '● Inactive'}
              </div>
            </div>
            {trialActive && (
              <div style={{ background: 'rgba(132,204,22,0.1)', border: '1px solid rgba(132,204,22,0.25)', borderRadius: 8, padding: '0.4rem 0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#84cc16', fontWeight: 600 }}>
                  🎉 Free trial — {trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left
                </span>
              </div>
            )}
            {info.planExpiresAt && (
              <div>
                <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Renews</div>
                <div style={{ fontSize: '0.875rem', color: '#a1a1aa' }}>{new Date(info.planExpiresAt).toLocaleDateString()}</div>
              </div>
            )}
          </div>

          {/* Period toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '0.875rem', color: '#a1a1aa' }}>Billing period:</span>
            {[1, 3, 6, 12].map((m) => (
              <button
                key={m}
                onClick={() => setPeriod(m)}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: 6,
                  border: `1.5px solid ${period === m ? '#84cc16' : 'rgba(255,255,255,0.1)'}`,
                  background: period === m ? 'rgba(132,204,22,0.1)' : 'transparent',
                  color: period === m ? '#84cc16' : '#a1a1aa',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                {m === 1 ? '1 month' : `${m} months`}
                {m >= 6 && <span style={{ marginLeft: '0.3rem', fontSize: '0.7rem', color: '#f59e0b' }}>-{m === 6 ? '5' : '10'}%</span>}
              </button>
            ))}
          </div>

          {/* Plan cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
            {PLANS.map((plan) => {
              const discount = period >= 12 ? 0.9 : period >= 6 ? 0.95 : 1;
              const total = Math.round(plan.price * period * discount);
              const current = isCurrentPlan(plan.key);
              return (
                <div
                  key={plan.key}
                  style={{
                    background: current ? `rgba(${plan.color === '#84cc16' ? '132,204,22' : plan.color === '#f59e0b' ? '245,158,11' : '139,92,246'},0.06)` : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${current ? plan.color : plan.popular ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    borderRadius: 12,
                    padding: '1.25rem',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  {plan.popular && !current && (
                    <div style={{ position: 'absolute', top: '-10px', right: '1rem', background: '#f59e0b', color: '#000', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 99, letterSpacing: '0.05em' }}>
                      POPULAR
                    </div>
                  )}
                  {current && (
                    <div style={{ position: 'absolute', top: '-10px', right: '1rem', background: plan.color, color: '#000', fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 99 }}>
                      CURRENT
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color: plan.color }}>{plan.label}</div>
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f4f4f5' }}>{fmt(plan.price)}</span>
                      <span style={{ fontSize: '0.75rem', color: '#71717a' }}>/month</span>
                    </div>
                    {period > 1 && (
                      <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '0.1rem' }}>
                        {fmt(total)} total for {period} months
                        {discount < 1 && <span style={{ color: '#f59e0b', marginLeft: '0.3rem' }}>(save {Math.round((1 - discount) * 100)}%)</span>}
                      </div>
                    )}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                    {plan.features.map((f) => (
                      <li key={f} style={{ fontSize: '0.8rem', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => subscribe(plan.key)}
                    disabled={!!initiating || current}
                    style={{
                      padding: '0.6rem',
                      borderRadius: 8,
                      border: 'none',
                      background: current ? 'rgba(255,255,255,0.06)' : plan.color,
                      color: current ? '#71717a' : '#000',
                      fontWeight: 700,
                      fontSize: '0.825rem',
                      cursor: current ? 'default' : 'pointer',
                      opacity: initiating && initiating !== plan.key ? 0.5 : 1,
                      transition: 'all 0.15s',
                    }}
                  >
                    {initiating === plan.key ? 'Redirecting to Pesapal…' : current ? 'Current Plan' : `Subscribe — ${fmt(total)}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Payment history */}
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#f4f4f5', marginBottom: '0.75rem' }}>Payment History</h2>
            {info.history.length === 0 ? (
              <div style={{ color: '#71717a', fontSize: '0.875rem', padding: '2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                No payments yet. Subscribe to a plan above to get started.
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['Date', 'Plan', 'Period', 'Amount', 'Status', 'Ref'].map((h) => (
                        <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', color: '#71717a', fontWeight: 600, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {info.history.map((row) => (
                      <tr key={row.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '0.65rem 1rem', color: '#a1a1aa' }}>{new Date(row.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '0.65rem 1rem', color: '#f4f4f5', textTransform: 'capitalize', fontWeight: 600 }}>{row.plan}</td>
                        <td style={{ padding: '0.65rem 1rem', color: '#a1a1aa' }}>{row.periodMonths}mo</td>
                        <td style={{ padding: '0.65rem 1rem', color: '#f4f4f5', fontWeight: 600 }}>{fmt(row.amount)}</td>
                        <td style={{ padding: '0.65rem 1rem' }}>
                          <span style={{ background: `${STATUS_COLOR[row.status] ?? '#71717a'}22`, color: STATUS_COLOR[row.status] ?? '#71717a', padding: '0.2rem 0.5rem', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700 }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 1rem', color: '#71717a', fontFamily: 'monospace', fontSize: '0.75rem' }}>{row.merchantRef}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
