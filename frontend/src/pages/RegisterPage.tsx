import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail Shop' },
  { value: 'wholesale', label: 'Wholesale / Distribution' },
  { value: 'pharmacy', label: 'Pharmacy / Medical' },
  { value: 'restaurant', label: 'Restaurant / Food & Beverage' },
  { value: 'electronics', label: 'Electronics Store' },
  { value: 'hardware', label: 'Hardware / Building Materials' },
  { value: 'clothing', label: 'Clothing / Apparel' },
  { value: 'supermarket', label: 'Supermarket / Grocery' },
  { value: 'agriculture', label: 'Agriculture / Farm Supply' },
  { value: 'other', label: 'Other' },
] as const;

interface RegisterForm {
  name: string;
  subdomain: string;
  ownerEmail: string;
  ownerPhone: string;
  businessType: string;
  adminName: string;
  adminUsername: string;
  adminPassword: string;
  plan: 'starter' | 'professional' | 'enterprise';
}

const PLANS = [
  { value: 'starter', label: 'Starter', desc: 'Up to 2 users · 500 products · 30-day trial' },
  { value: 'professional', label: 'Professional', desc: 'Up to 10 users · Unlimited products · Full reports' },
  { value: 'enterprise', label: 'Enterprise', desc: 'Unlimited users · Multi-location · Priority support' },
] as const;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterForm>({
    name: '',
    subdomain: '',
    ownerEmail: '',
    ownerPhone: '',
    businessType: 'retail',
    adminName: '',
    adminUsername: '',
    adminPassword: '',
    plan: 'starter',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ tenantName: string; subdomain: string; username: string } | null>(null);
  const [showPw, setShowPw] = useState(false);

  const set = (field: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: val };
      // Auto-generate subdomain from business name
      if (field === 'name') {
        next.subdomain = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        name: form.name,
        subdomain: form.subdomain,
        adminName: form.adminName,
        adminUsername: form.adminUsername,
        adminPassword: form.adminPassword,
        plan: form.plan,
        businessType: form.businessType,
        ...(form.ownerEmail && { ownerEmail: form.ownerEmail }),
        ...(form.ownerPhone && { ownerPhone: form.ownerPhone }),
      };
      const { data } = await api.post('/tenants/register', payload);
      setSuccess({
        tenantName: data.tenant.name,
        subdomain: data.tenant.subdomain,
        username: data.admin.username,
      });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (Array.isArray(msg)) {
        setError(msg[0]);
      } else if (typeof msg === 'string') {
        setError(msg);
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="ks-login-bg">
        <div className="ks-blob ks-blob-1" />
        <div className="ks-blob ks-blob-2" />
        <div className="ks-blob ks-blob-3" />
        <div className="ks-card-glow-wrapper">
          <div className="ks-card-glow-ring" />
          <div className="ks-card" style={{ textAlign: 'center' }}>
            <div className="ks-card-header">
              <div className="ks-logo-icon" style={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" width="24" height="24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="ks-card-title" style={{ fontSize: '1.4rem' }}>You're all set!</h1>
              <p className="ks-card-subtitle">
                <strong>{success.tenantName}</strong> has been registered successfully.
              </p>
            </div>
            <div style={{ margin: '1.5rem 0', padding: '1rem', background: 'rgba(132,204,22,0.08)', borderRadius: '10px', border: '1px solid rgba(132,204,22,0.25)', fontSize: '0.875rem', color: '#d4d4d8', lineHeight: 1.7 }}>
              <div>Subdomain: <code style={{ color: '#84cc16' }}>{success.subdomain}</code></div>
              <div>Admin username: <code style={{ color: '#84cc16' }}>{success.username}</code></div>
              <div style={{ marginTop: '0.5rem', color: '#a1a1aa', fontSize: '0.8rem' }}>Your 30-day trial has started.</div>
            </div>
            <button className="ks-btn" onClick={() => navigate('/login')}>
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ks-login-bg">
      <div className="ks-blob ks-blob-1" />
      <div className="ks-blob ks-blob-2" />
      <div className="ks-blob ks-blob-3" />

      <div className="ks-card-glow-wrapper">
        <div className="ks-card-glow-ring" />
        <div className="ks-card" style={{ maxWidth: '480px' }}>
          {/* Logo */}
          <div className="ks-card-header">
            <div className="ks-logo-icon">
              <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
                <rect width="40" height="40" rx="10" fill="url(#logoGradReg)" />
                <path d="M8 28L14 16L20 22L26 12L32 28H8Z" fill="white" opacity="0.9" />
                <defs>
                  <linearGradient id="logoGradReg" x1="0" y1="0" x2="40" y2="40">
                    <stop offset="0%" stopColor="#84cc16" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 className="ks-card-title">Start your free trial</h1>
            <p className="ks-card-subtitle">Register your business on KampStock</p>
          </div>

          <form onSubmit={handleSubmit} className="ks-form">
            {/* Business Info */}
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: '#71717a', textTransform: 'uppercase', margin: '0 0 0.75rem' }}>Business</p>

            <div className="ks-input-group">
              <label className="ks-label">Business Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                className="ks-input"
                placeholder="e.g. Kato General Store"
                value={form.name}
                onChange={set('name')}
                required
                minLength={2}
                maxLength={100}
                autoFocus
              />
            </div>

            <div className="ks-input-group">
              <label className="ks-label">Subdomain <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="ks-input"
                  placeholder="kato-store"
                  value={form.subdomain}
                  onChange={set('subdomain')}
                  required
                  minLength={2}
                  maxLength={30}
                  style={{ paddingRight: '7rem' }}
                />
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#71717a', pointerEvents: 'none' }}>
                  .kampstock.com
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="ks-input-group" style={{ margin: 0 }}>
                <label className="ks-label">Email (optional)</label>
                <input className="ks-input" type="email" placeholder="owner@email.com" value={form.ownerEmail} onChange={set('ownerEmail')} />
              </div>
              <div className="ks-input-group" style={{ margin: 0 }}>
                <label className="ks-label">Phone (optional)</label>
                <input className="ks-input" type="tel" placeholder="+256 7XX XXX XXX" value={form.ownerPhone} onChange={set('ownerPhone')} />
              </div>
            </div>

            <div className="ks-input-group">
              <label className="ks-label">Nature of Business <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                className="ks-input"
                value={form.businessType}
                onChange={set('businessType')}
                required
                style={{ cursor: 'pointer' }}
              >
                {BUSINESS_TYPES.map((bt) => (
                  <option key={bt.value} value={bt.value}>{bt.label}</option>
                ))}
              </select>
            </div>

            {/* Plan selection */}
            <div className="ks-input-group" style={{ marginTop: '1rem' }}>
              <label className="ks-label">Plan</label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {PLANS.map((p) => (
                  <label
                    key={p.value}
                    style={{
                      flex: '1 1 120px',
                      padding: '0.6rem 0.75rem',
                      border: `1.5px solid ${form.plan === p.value ? '#84cc16' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: form.plan === p.value ? 'rgba(132,204,22,0.08)' : 'rgba(255,255,255,0.03)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input type="radio" name="plan" value={p.value} checked={form.plan === p.value} onChange={set('plan')} style={{ display: 'none' }} />
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: form.plan === p.value ? '#84cc16' : '#e4e4e7' }}>{p.label}</div>
                    <div style={{ fontSize: '0.68rem', color: '#71717a', marginTop: '0.2rem', lineHeight: 1.4 }}>{p.desc}</div>
                  </label>
                ))}
              </div>
            </div>

            {/* Admin Account */}
            <p style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', color: '#71717a', textTransform: 'uppercase', margin: '1.25rem 0 0.75rem' }}>Admin Account</p>

            <div className="ks-input-group">
              <label className="ks-label">Full Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input className="ks-input" placeholder="e.g. John Kato" value={form.adminName} onChange={set('adminName')} required minLength={2} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="ks-input-group" style={{ margin: 0 }}>
                <label className="ks-label">Username <span style={{ color: '#ef4444' }}>*</span></label>
                <input className="ks-input" placeholder="jkato" value={form.adminUsername} onChange={set('adminUsername')} required minLength={3} autoComplete="username" />
              </div>
              <div className="ks-input-group" style={{ margin: 0, position: 'relative' }}>
                <label className="ks-label">Password <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="ks-input"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min. 8 characters"
                    value={form.adminPassword}
                    onChange={set('adminPassword')}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    style={{ paddingRight: '2.5rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#71717a', padding: 0 }}
                    tabIndex={-1}
                  >
                    {showPw ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="ks-error-msg" style={{ marginTop: '1rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {error}
              </div>
            )}

            <button className="ks-btn" type="submit" disabled={loading} style={{ marginTop: '1.25rem' }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <svg className="ks-spinner" viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" strokeDasharray="40" strokeDashoffset="10" /></svg>
                  Creating your account…
                </span>
              ) : 'Create Account — Free 30-day Trial'}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: '#71717a', marginTop: '1rem' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#84cc16', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
