import { useState, useEffect, useRef } from 'react';
import { Calendar, dateFnsLocalizer, type View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Link } from 'react-router-dom';
import { CreditCard, Clock, CalendarDays, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import api from '../lib/api';

const locales = { 'en-US': {} };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface BillingInfo {
  plan: string;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  isActive: boolean;
  name: string;
  daysLeft: number | null;
  isLocked: boolean;
  warningActive: boolean;
  latestSub: {
    id: number;
    plan: string;
    amount: number;
    currency: string;
    periodMonths: number;
    status: string;
    confirmedAt: string | null;
    expiresAt: string | null;
  } | null;
  history: Array<{
    id: number;
    plan: string;
    amount: number;
    periodMonths: number;
    status: string;
    confirmedAt: string | null;
    expiresAt: string | null;
    createdAt: string;
  }>;
}

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  kind: 'trial' | 'subscription' | 'past';
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // ms
}

function calcCountdown(target: Date): Countdown {
  const total = Math.max(0, target.getTime() - Date.now());
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total % 86_400_000) / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1000);
  return { total, days, hours, minutes, seconds };
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '12px 18px', minWidth: 64,
    }}>
      <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {String(value).padStart(2, '0')}
      </span>
      <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
        {label}
      </span>
    </div>
  );
}

export default function ManagerCalendarPage() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api.get('/billing/my')
      .then(({ data }) => setInfo(data))
      .catch(() => setError('Failed to load subscription info.'))
      .finally(() => setLoading(false));
  }, []);

  // Live countdown ticker
  useEffect(() => {
    if (!info) return;
    const target = info.planExpiresAt
      ? new Date(info.planExpiresAt)
      : info.trialEndsAt
      ? new Date(info.trialEndsAt)
      : null;

    if (!target) return;

    setCountdown(calcCountdown(target));
    timerRef.current = setInterval(() => {
      setCountdown(calcCountdown(target));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [info]);

  // Build calendar events
  const events: CalEvent[] = [];
  if (info) {
    if (info.trialEndsAt) {
      const trial = new Date(info.trialEndsAt);
      events.push({
        id: 'trial',
        title: '🎉 Trial ends',
        start: trial,
        end: new Date(trial.getTime() + 3_600_000),
        color: '#22d3ee',
        kind: 'trial',
      });
    }
    if (info.planExpiresAt) {
      const exp = new Date(info.planExpiresAt);
      const expired = exp < new Date();
      events.push({
        id: 'expiry',
        title: expired ? '❌ Subscription expired' : '📅 Subscription expires',
        start: exp,
        end: new Date(exp.getTime() + 3_600_000),
        color: expired ? '#ef4444' : (info.warningActive ? '#f59e0b' : '#22c55e'),
        kind: expired ? 'past' : 'subscription',
      });
    }
    // Add history subscription events
    (info.history ?? []).forEach((sub) => {
      if (sub.expiresAt) {
        const d = new Date(sub.expiresAt);
        events.push({
          id: `hist-${sub.id}`,
          title: `📋 ${sub.plan} plan`,
          start: d,
          end: new Date(d.getTime() + 3_600_000),
          color: sub.status === 'COMPLETED' ? '#94a3b8' : '#475569',
          kind: 'past',
        });
      }
    });
  }

  const expiryDate = info?.planExpiresAt
    ? new Date(info.planExpiresAt)
    : info?.trialEndsAt
    ? new Date(info.trialEndsAt)
    : null;

  const isExpired = expiryDate && expiryDate < new Date();
  const isTrialActive = info?.trialEndsAt && new Date(info.trialEndsAt) > new Date();

  const statusColor = info?.isLocked
    ? '#ef4444'
    : info?.warningActive
    ? '#f59e0b'
    : '#22c55e';

  const StatusIcon = info?.isLocked ? XCircle : info?.warningActive ? AlertTriangle : CheckCircle2;

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarDays size={20} color="#818cf8" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9' }}>Subscription Calendar</h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              {info?.name ?? '…'} — track your plan and renewal dates
            </p>
          </div>
        </div>
        <Link
          to="/billing"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(99,102,241,0.35)',
            background: 'rgba(99,102,241,0.1)', color: '#818cf8',
            textDecoration: 'none', fontSize: '0.8rem', fontWeight: 600,
          }}
        >
          <CreditCard size={14} />
          Manage Billing
        </Link>
      </div>

      {error && (
        <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', marginBottom: 20, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading subscription info…</div>
      ) : info && (
        <>
          {/* Status + Countdown row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>

            {/* Status card */}
            <div style={{
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${statusColor}33`,
              borderRadius: 12, padding: '20px 22px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <StatusIcon size={18} color={statusColor} />
                <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                  Subscription Status
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Plan', value: (info.plan ?? 'N/A').charAt(0).toUpperCase() + (info.plan ?? '').slice(1) },
                  {
                    label: 'Status',
                    value: info.isLocked ? 'Expired' : info.isActive ? 'Active' : 'Inactive',
                    color: statusColor,
                  },
                  {
                    label: isTrialActive ? 'Trial ends' : 'Expires',
                    value: expiryDate
                      ? isExpired
                        ? 'Expired'
                        : expiryDate.toLocaleDateString('en-UG', { day: '2-digit', month: 'short', year: 'numeric' })
                      : 'No expiry',
                    color: isExpired ? '#ef4444' : undefined,
                  },
                  {
                    label: 'Days remaining',
                    value: info.daysLeft !== null
                      ? info.daysLeft < 0
                        ? `${Math.abs(info.daysLeft)}d expired`
                        : `${info.daysLeft} day${info.daysLeft !== 1 ? 's' : ''}`
                      : 'N/A',
                    color: info.daysLeft !== null && info.daysLeft <= 0 ? '#ef4444' : info.daysLeft !== null && info.daysLeft <= 7 ? '#f59e0b' : '#22c55e',
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#0f172a', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: color ?? '#e2e8f0' }}>{value}</div>
                  </div>
                ))}
              </div>

              {isTrialActive && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(34,211,238,0.08)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8, fontSize: '0.78rem', color: '#67e8f9' }}>
                  🎉 You are on a free trial — upgrade any time from Billing
                </div>
              )}
              {info.isLocked && (
                <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, fontSize: '0.78rem', color: '#fca5a5' }}>
                  🔒 Account locked — renew your subscription to restore access
                </div>
              )}
            </div>

            {/* Countdown card */}
            {countdown !== null && expiryDate && !isExpired && (
              <div style={{
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12, padding: '20px 22px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Clock size={16} color="#818cf8" />
                  <span style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600 }}>
                    Time Until {isTrialActive ? 'Trial Ends' : 'Renewal Due'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <CountdownBlock value={countdown.days} label="Days" />
                  <CountdownBlock value={countdown.hours} label="Hours" />
                  <CountdownBlock value={countdown.minutes} label="Mins" />
                  <CountdownBlock value={countdown.seconds} label="Secs" />
                </div>
                <p style={{ margin: '14px 0 0', fontSize: '0.72rem', color: '#475569' }}>
                  {isTrialActive ? 'Trial' : 'Subscription'} expires on{' '}
                  <strong style={{ color: '#94a3b8' }}>
                    {expiryDate.toLocaleDateString('en-UG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </strong>
                </p>
              </div>
            )}

            {/* Expired state */}
            {isExpired && (
              <div style={{
                background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 12, padding: '20px 22px', display: 'flex', flexDirection: 'column', justifyContent: 'center',
              }}>
                <XCircle size={32} color="#ef4444" style={{ marginBottom: 12 }} />
                <p style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700, color: '#f87171' }}>Subscription Expired</p>
                <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#64748b' }}>
                  Your subscription expired on {expiryDate?.toLocaleDateString('en-UG', { day: 'numeric', month: 'long', year: 'numeric' })}.
                  Renew now to restore full access.
                </p>
                <Link
                  to="/billing"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '10px 16px', borderRadius: 8, background: '#ef4444',
                    color: '#fff', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700,
                  }}
                >
                  Renew Subscription
                </Link>
              </div>
            )}
          </div>

          {/* Calendar */}
          <div style={{ background: '#1e293b', borderRadius: 12, border: '1px solid #334155', padding: 16 }}>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8' }}>Your Subscription Timeline</span>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { color: '#22c55e', label: 'Active subscription' },
                  { color: '#f59e0b', label: 'Expiring soon' },
                  { color: '#ef4444', label: 'Expired' },
                  { color: '#22d3ee', label: 'Trial' },
                ].map((l) => (
                  <div key={l.color} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: '#64748b' }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: l.color }} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>
            <style>{`
              .rbc-calendar { background: transparent; color: #e2e8f0; }
              .rbc-header { background: #0f172a; border-color: #334155; color: #94a3b8; font-size: 12px; padding: 8px 0; }
              .rbc-month-view, .rbc-time-view, .rbc-agenda-view { border-color: #334155; }
              .rbc-day-bg { border-color: #334155; }
              .rbc-today { background: rgba(99,102,241,0.08); }
              .rbc-off-range-bg { background: rgba(0,0,0,0.2); }
              .rbc-date-cell { color: #94a3b8; font-size: 12px; padding: 4px 8px; }
              .rbc-date-cell.rbc-now { color: #818cf8; font-weight: 700; }
              .rbc-event { border-radius: 4px; font-size: 12px; font-weight: 600; border: none; padding: 2px 6px; }
              .rbc-event:focus { outline: none; }
              .rbc-show-more { color: #818cf8; background: transparent; font-size: 11px; }
              .rbc-toolbar { margin-bottom: 16px; }
              .rbc-toolbar button { color: #94a3b8; background: #0f172a; border-color: #334155; border-radius: 6px; padding: 6px 14px; font-size: 13px; }
              .rbc-toolbar button:hover { color: #e2e8f0; background: #1e293b; }
              .rbc-toolbar button.rbc-active { background: #6366f1; color: #fff; border-color: #6366f1; }
              .rbc-toolbar-label { color: #f1f5f9; font-weight: 700; font-size: 16px; }
              .rbc-agenda-table { border-color: #334155; }
              .rbc-agenda-table tbody > tr > td { border-color: #334155; color: #94a3b8; }
              .rbc-agenda-table thead > tr > th { border-color: #334155; color: #64748b; }
            `}</style>
            <Calendar
              localizer={localizer}
              events={events}
              view={view}
              date={date}
              onView={setView}
              onNavigate={setDate}
              style={{ height: 520 }}
              eventPropGetter={(event) => ({
                style: {
                  backgroundColor: (event as CalEvent).color,
                  color: '#fff',
                  border: 'none',
                },
              })}
              popup
            />
          </div>
        </>
      )}
    </div>
  );
}
