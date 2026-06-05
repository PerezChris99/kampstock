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
  {
    value: 'starter',
    label: 'Starter',
    desc: 'Up to 2 users Â· 500 products Â· 30-day trial',
    icon: 'ðŸš€',
  },
  {
    value: 'professional',
    label: 'Professional',
    desc: 'Up to 10 users Â· Unlimited products Â· Full reports',
    icon: 'âš¡',
  },
  {
    value: 'enterprise',
    label: 'Enterprise',
    desc: 'Unlimited users Â· Multi-location Â· Priority support',
    icon: 'ðŸ¢',
  },
] as const;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterForm>({
    name: '', subdomain: '', ownerEmail: '', ownerPhone: '',
    businessType: 'retail', adminName: '', adminUsername: '',
    adminPassword: '', plan: 'starter',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ tenantName: string; subdomain: string; username: string } | null>(null);
  const [showPw, setShowPw] = useState(false);

  const set = (field: keyof RegisterForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const val = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [field]: val };
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
        name: form.name, subdomain: form.subdomain, adminName: form.adminName,
        adminUsername: form.adminUsername, adminPassword: form.adminPassword,
        plan: form.plan, businessType: form.businessType,
        ...(form.ownerEmail && { ownerEmail: form.ownerEmail }),
        ...(form.ownerPhone && { ownerPhone: form.ownerPhone }),
      };
      const { data } = await api.post('/tenants/register', payload);
      setSuccess({ tenantName: data.tenant.name, subdomain: data.tenant.subdomain, username: data.admin.username });
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      if (Array.isArray(msg)) setError(msg[0]);
      else if (typeof msg === 'string') setError(msg);
      else setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-shell">
        <div className="auth-brand-panel">
          <div className="auth-brand-blobs">
            <div className="auth-brand-blob auth-brand-blob-1" />
            <div className="auth-brand-blob auth-brand-blob-2" />
          </div>
          <div className="auth-brand-content">
            <div className="auth-brand-logo">
              <svg viewBox="0 0 40 40" fill="none" width="48" height="48">
                <rect width="40" height="40" rx="10" fill="url(#sucLogoG)" />
                <path d="M8 28L14 16L20 22L26 12L32 28H8Z" fill="white" opacity="0.95" />
                <defs><linearGradient id="sucLogoG" x1="0" y1="0" x2="40" y2="40">
                  <stop offset="0%" stopColor="#84cc16" /><stop offset="100%" stopColor="#ef4444" />
                </linearGradient></defs>
              </svg>
              <span className="auth-brand-name">KampStock</span>
            </div>
            <h2 className="auth-brand-headline">You're all set!</h2>
            <p className="auth-brand-subtext">Your business is ready. Log in and start managing your inventory.</p>
          </div>
        </div>
        <div className="auth-form-panel">
          <div className="auth-form-inner" style={{ maxWidth: '480px' }}>
            <div className="auth-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" width="28" height="28"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div className="auth-form-heading">
              <h1>Account Created!</h1>
              <p><strong>{success.tenantName}</strong> is now on KampStock</p>
            </div>
            <div className="auth-success-details">
              <div className="auth-success-row"><span>Subdomain</span><code>{success.subdomain}.kampstock.com</code></div>
              <div className="auth-success-row"><span>Admin username</span><code>{success.username}</code></div>
              <div className="auth-success-row"><span>Trial</span><code>30 days free â€” starts now</code></div>
            </div>
            <button className="auth-btn-primary" onClick={() => navigate('/login')}>Go to Login â†’</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      {/* â”€â”€ Left brand panel â”€â”€ */}
      <div className="auth-brand-panel">
        <div className="auth-brand-blobs">
          <div className="auth-brand-blob auth-brand-blob-1" />
          <div className="auth-brand-blob auth-brand-blob-2" />
          <div className="auth-brand-blob auth-brand-blob-3" />
        </div>
        <div className="auth-brand-content">
          <div className="auth-brand-logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="48" height="48">
              <rect width="40" height="40" rx="10" fill="url(#regBpLogoG)" />
              <path d="M8 28L14 16L20 22L26 12L32 28H8Z" fill="white" opacity="0.95" />
              <defs><linearGradient id="regBpLogoG" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#84cc16" /><stop offset="50%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#ef4444" />
              </linearGradient></defs>
            </svg>
            <span className="auth-brand-name">KampStock</span>
          </div>
          <h2 className="auth-brand-headline">Start your 30-day<br />free trial today.</h2>
          <p className="auth-brand-subtext">No credit card required. Full access to all features during your trial period.</p>
          <ul className="auth-brand-features">
            {['Setup in under 2 minutes', 'Import your product catalog', 'Invite your team instantly', 'Cancel anytime, no lock-in'].map((f) => (
              <li key={f}>
                <span className="auth-brand-check">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                {f}
              </li>
            ))}
          </ul>
          <div className="auth-brand-badge">Trusted by 200+ shops across Uganda</div>
        </div>
      </div>

      {/* â”€â”€ Right form panel â”€â”€ */}
      <div className="auth-form-panel auth-form-panel--register">
        <div className="auth-form-inner auth-form-inner--wide">
          {/* Mobile logo */}
          <div className="auth-mobile-logo">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="36" height="36">
              <rect width="40" height="40" rx="10" fill="url(#regMobLogoG)" />
              <path d="M8 28L14 16L20 22L26 12L32 28H8Z" fill="white" opacity="0.95" />
              <defs><linearGradient id="regMobLogoG" x1="0" y1="0" x2="40" y2="40">
                <stop offset="0%" stopColor="#84cc16" /><stop offset="50%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#ef4444" />
              </linearGradient></defs>
            </svg>
            <span>KampStock</span>
          </div>

          <div className="auth-form-heading">
            <h1>Create your account</h1>
            <p>Register your business and start your free 30-day trial</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form auth-form--register" noValidate>
            {/* â”€â”€ Section: Business Info â”€â”€ */}
            <div className="auth-section-label">Business Information</div>

            <div className="auth-grid-2">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-biz-name">Business Name <span className="auth-required">*</span></label>
                <input id="reg-biz-name" className="auth-input auth-input--plain" placeholder="e.g. Kato General Store"
                  value={form.name} onChange={set('name')} required minLength={2} maxLength={100} autoFocus />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-subdomain">Subdomain <span className="auth-required">*</span></label>
                <div className="auth-subdomain-wrap">
                  <input id="reg-subdomain" className="auth-input auth-input--plain auth-input--subdomain"
                    placeholder="kato-store" value={form.subdomain} onChange={set('subdomain')} required minLength={2} maxLength={30} />
                  <span className="auth-subdomain-suffix">.kampstock.com</span>
                </div>
              </div>
            </div>

            <div className="auth-grid-3">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-biz-type">Nature of Business <span className="auth-required">*</span></label>
                <select id="reg-biz-type" className="auth-input auth-input--plain" value={form.businessType} onChange={set('businessType')} required>
                  {BUSINESS_TYPES.map((bt) => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
                </select>
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-email">Email <span className="auth-optional">(optional)</span></label>
                <input id="reg-email" className="auth-input auth-input--plain" type="email" placeholder="owner@email.com"
                  value={form.ownerEmail} onChange={set('ownerEmail')} />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-phone">Phone <span className="auth-optional">(optional)</span></label>
                <input id="reg-phone" className="auth-input auth-input--plain" type="tel" placeholder="+256 7XX XXX XXX"
                  value={form.ownerPhone} onChange={set('ownerPhone')} />
              </div>
            </div>

            {/* â”€â”€ Section: Plan â”€â”€ */}
            <div className="auth-section-label" style={{ marginTop: '0.5rem' }}>Choose a Plan</div>
            <div className="auth-plan-grid">
              {PLANS.map((p) => (
                <label key={p.value} className={`auth-plan-card${form.plan === p.value ? ' auth-plan-card--active' : ''}`}>
                  <input type="radio" name="plan" value={p.value} checked={form.plan === p.value} onChange={set('plan')} style={{ display: 'none' }} />
                  <span className="auth-plan-icon">{p.icon}</span>
                  <span className="auth-plan-name">{p.label}</span>
                  <span className="auth-plan-desc">{p.desc}</span>
                </label>
              ))}
            </div>

            {/* â”€â”€ Section: Admin Account â”€â”€ */}
            <div className="auth-section-label" style={{ marginTop: '0.5rem' }}>Admin Account</div>

            <div className="auth-grid-3">
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-admin-name">Full Name <span className="auth-required">*</span></label>
                <input id="reg-admin-name" className="auth-input auth-input--plain" placeholder="e.g. John Kato"
                  value={form.adminName} onChange={set('adminName')} required minLength={2} />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-admin-user">Username <span className="auth-required">*</span></label>
                <input id="reg-admin-user" className="auth-input auth-input--plain" placeholder="jkato"
                  value={form.adminUsername} onChange={set('adminUsername')} required minLength={3} autoComplete="username" />
              </div>
              <div className="auth-field">
                <label className="auth-label" htmlFor="reg-admin-pass">Password <span className="auth-required">*</span></label>
                <div className="auth-input-wrap">
                  <input id="reg-admin-pass" className="auth-input auth-input--plain"
                    type={showPw ? 'text' : 'password'} placeholder="Min. 8 characters"
                    value={form.adminPassword} onChange={set('adminPassword')} required minLength={8} autoComplete="new-password" />
                  <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(!showPw)} tabIndex={-1} aria-label="Toggle password">
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
              <div className="auth-error" role="alert">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                {error}
              </div>
            )}

            <button className="auth-btn-primary" type="submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading ? (
                <span className="auth-btn-loading"><span className="auth-spinner" />Creating your accountâ€¦</span>
              ) : 'Create Account â€” Free 30-day Trial â†’'}
            </button>

            <p className="auth-switch-link">
              Already have an account? <Link to="/login">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
