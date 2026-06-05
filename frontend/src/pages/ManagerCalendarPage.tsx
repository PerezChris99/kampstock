import { useState, useEffect, useCallback } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import type { View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  CreditCard,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

const locales = { 'en-US': enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface SubscriptionInfo {
  name: string;
  plan: string | null;
  isActive: boolean;
  isLocked: boolean;
  warningActive: boolean;
  daysLeft: number | null;
  expiresAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
}

interface CalEvent {
  title: string;
  start: Date;
  end: Date;
  color: string;
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
  return (
    <div
      style={{
        background: '#0f172a',
        borderRadius: 10,
        padding: '12px 16px',
        minWidth: 64,
        textAlign: 'center',
        border: '1px solid #334155',
      }}
    >
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#818cf8', lineHeight: 1 }}>
        {String(value).padStart(2, '0')}
      </div>
      <div
        style={{
          fontSize: '0.65rem',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

const API = import.meta.env.VITE_API_URL ?? '';

function computeCountdown(target: Date): Countdown | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  const totalSec = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSec / 86400),
    hours: Math.floor((totalSec % 86400) / 3600),
    minutes: Math.floor((totalSec % 3600) / 60),
    seconds: totalSec % 60,
  };
}

function buildEvents(info: SubscriptionInfo): CalEvent[] {
  const events: CalEvent[] = [];
  const now = new Date();

  const expiryStr = info.trialEndsAt ?? info.expiresAt;
  if (expiryStr) {
    const expiry = new Date(expiryStr);
    const expired = expiry < now;
    const soonish = !expired && expiry.getTime() - now.getTime() < 7 * 86400 * 1000;
    events.push({
      title: info.trialEndsAt
        ? 'Trial Ends'
        : expired
          ? 'Subscription Expired'
          : soonish
            ? 'Expiring Soon'
            : 'Subscription Renewal',
      start: expiry,
      end: new Date(expiry.getTime() + 3600 * 1000),
      color: expired ? '#ef4444' : soonish ? '#f59e0b' : '#22c55e',
    });
  }

  if (info.createdAt) {
    const created = new Date(info.createdAt);
    events.push({
      title: 'Account Created',
      start: created,
      end: new Date(created.getTime() + 3600 * 1000),
      color: '#6366f1',
    });
  }

  if (info.trialEndsAt && info.expiresAt) {
    const exp = new Date(info.expiresAt);
    const expired = exp < now;
    events.push({
      title: expired ? 'Plan Expired' : 'Plan Renewal',
      start: exp,
      end: new Date(exp.getTime() + 3600 * 1000),
      color: expired ? '#ef4444' : '#22c55e',
    });
  }

  return events;
}

export default function ManagerCalendarPage() {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState<Date>(new Date());

  const fetchInfo = useCallback(async () => {
    try {
      const res = await fetch(`${API}/billing/status`, { credentials: 'include' });
      if (!res.ok) throw new Error('Unable to load subscription info');
      const data: SubscriptionInfo = await res.json();
      setInfo(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load billing info');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  // Auto-navigate calendar to the month with the nearest event
  useEffect(() => {
    if (!info) return;
    const evts = buildEvents(info);
    if (evts.length === 0) return;
    const now = new Date();
    const future = evts
      .filter((e) => e.start >= now)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
    const target =
      future.length > 0 ? future[0] : evts.sort((a, b) => b.start.getTime() - a.start.getTime())[0];
    setDate(target.start);
  }, [info]);

  // Live countdown ticker
  useEffect(() => {
    if (!info) return;
    const expiryStr = info.trialEndsAt ?? info.expiresAt;
    if (!expiryStr) return;
    const expiry = new Date(expiryStr);
    const tick = () => setCountdown(computeCountdown(expiry));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [info]);

  const events = info ? buildEvents(info) : [];
  const expiryDate = info
    ? info.trialEndsAt
      ? new Date(info.trialEndsAt)
      : info.expiresAt
        ? new Date(info.expiresAt)
        : null
    : null;
  const isExpired = expiryDate && expiryDate < new Date();
  const isTrialActive = info?.trialEndsAt && new Date(info.trialEndsAt) > new Date();
  const statusColor = info?.isLocked ? '#ef4444' : info?.warningActive ? '#f59e0b' : '#22c55e';
  const StatusIcon = info?.isLocked ? XCircle : info?.warningActive ? AlertTriangle : CheckCircle2;

  const calStyles = `
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
  `;

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '24px 16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'rgba(99,102,241,0.15)',
              border: '1px solid rgba(99,102,241,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CalendarDays size={20} color="#818cf8" />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9' }}>
              Subscription Calendar
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
              {loading ? 'Loading...' : (info?.name ?? 'Your account')} &mdash; track your plan and
              renewal dates
            </p>
          </div>
        </div>
        <Link
          to="/billing"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid rgba(99,102,241,0.35)',
            background: 'rgba(99,102,241,0.1)',
            color: '#818cf8',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          <CreditCard size={14} />
          Manage Billing
        </Link>
      </div>

      {error && (
        <div
          style={{
            background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 8,
            padding: '10px 14px',
            color: '#fcd34d',
            marginBottom: 16,
            fontSize: '0.8rem',
          }}
        >
          {error}
        </div>
      )}

      {!loading && info && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${statusColor}33`,
              borderRadius: 12,
              padding: '20px 22px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <StatusIcon size={18} color={statusColor} />
              <span
                style={{
                  fontSize: '0.7rem',
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontWeight: 600,
                }}
              >
                Subscription Status
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                {
                  label: 'Plan',
                  value: (info.plan ?? 'N/A').charAt(0).toUpperCase() + (info.plan ?? '').slice(1),
                },
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
                      : expiryDate.toLocaleDateString('en-UG', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                    : 'No expiry',
                  color: isExpired ? '#ef4444' : undefined,
                },
                {
                  label: 'Days remaining',
                  value:
                    info.daysLeft !== null
                      ? info.daysLeft < 0
                        ? `${Math.abs(info.daysLeft)}d expired`
                        : `${info.daysLeft} day${info.daysLeft !== 1 ? 's' : ''}`
                      : 'N/A',
                  color:
                    info.daysLeft !== null && info.daysLeft <= 0
                      ? '#ef4444'
                      : info.daysLeft !== null && info.daysLeft <= 7
                        ? '#f59e0b'
                        : '#22c55e',
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  style={{ background: '#0f172a', borderRadius: 8, padding: '10px 12px' }}
                >
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: color ?? '#e2e8f0' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
            {isTrialActive && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: 'rgba(34,211,238,0.08)',
                  border: '1px solid rgba(34,211,238,0.2)',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  color: '#67e8f9',
                }}
              >
                Free trial active &mdash; upgrade any time from Billing
              </div>
            )}
            {info.isLocked && (
              <div
                style={{
                  marginTop: 12,
                  padding: '8px 12px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 8,
                  fontSize: '0.78rem',
                  color: '#fca5a5',
                }}
              >
                Account locked &mdash; renew your subscription to restore access
              </div>
            )}
          </div>

          {countdown !== null && expiryDate && !isExpired ? (
            <div
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                padding: '20px 22px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Clock size={16} color="#818cf8" />
                <span
                  style={{
                    fontSize: '0.7rem',
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontWeight: 600,
                  }}
                >
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
                  {expiryDate.toLocaleDateString('en-UG', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </strong>
              </p>
            </div>
          ) : isExpired ? (
            <div
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 12,
                padding: '20px 22px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <XCircle size={32} color="#ef4444" style={{ marginBottom: 12 }} />
              <p style={{ margin: '0 0 8px', fontSize: '1rem', fontWeight: 700, color: '#f87171' }}>
                Subscription Expired
              </p>
              <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: '#64748b' }}>
                Expired{' '}
                {expiryDate?.toLocaleDateString('en-UG', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                . Renew to restore full access.
              </p>
              <Link
                to="/billing"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 8,
                  background: '#ef4444',
                  color: '#fff',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                }}
              >
                Renew Subscription
              </Link>
            </div>
          ) : null}
        </div>
      )}

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                height: 140,
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 12,
                border: '1px solid #334155',
              }}
            />
          ))}
        </div>
      )}

      <div
        style={{
          background: '#1e293b',
          borderRadius: 12,
          border: '1px solid #334155',
          padding: 16,
        }}
      >
        <div
          style={{
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#94a3b8' }}>
            Your Subscription Timeline
          </span>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { color: '#22c55e', label: 'Active' },
              { color: '#f59e0b', label: 'Expiring soon' },
              { color: '#ef4444', label: 'Expired' },
              { color: '#22d3ee', label: 'Trial' },
            ].map((l) => (
              <div
                key={l.color}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: '0.72rem',
                  color: '#64748b',
                }}
              >
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
        <style>{calStyles}</style>
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
        {!loading && events.length === 0 && (
          <p style={{ textAlign: 'center', color: '#475569', fontSize: '0.8rem', marginTop: 8 }}>
            No subscription events found.{' '}
            <Link to="/billing" style={{ color: '#818cf8' }}>
              Set up a plan
            </Link>{' '}
            to see your renewal dates here.
          </p>
        )}
      </div>
    </div>
  );
}
