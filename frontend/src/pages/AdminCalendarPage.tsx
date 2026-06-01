import { useState, useEffect } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import api from '../lib/api';

const locales = { 'en-US': {} };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  plan: string;
  isActive: boolean;
  planExpiresAt: string | null;
  trialEndsAt: string | null;
  createdAt: string;
  subscriptions?: Array<{
    id: number;
    status: string;
    confirmedAt: string | null;
    expiresAt: string | null;
    plan: string;
    amount: number;
    periodMonths: number;
  }>;
}

interface CalEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  tenant: Tenant;
  type: 'active' | 'expiring' | 'expired' | 'trial';
}

function daysUntil(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function getColor(tenant: Tenant): { color: string; type: CalEvent['type'] } {
  const now = new Date();

  if (tenant.trialEndsAt) {
    const t = new Date(tenant.trialEndsAt);
    if (t > now) return { color: '#22d3ee', type: 'trial' };
  }

  if (!tenant.planExpiresAt) return { color: '#64748b', type: 'active' };

  const exp = new Date(tenant.planExpiresAt);
  const days = daysUntil(exp);

  if (days < 0) return { color: '#ef4444', type: 'expired' };
  if (days <= 7) return { color: '#f59e0b', type: 'expiring' };
  return { color: '#22c55e', type: 'active' };
}

function ModalOverlay({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const { color } = getColor(tenant);
  const now = new Date();
  const expiry = tenant.planExpiresAt ? new Date(tenant.planExpiresAt) : null;
  const trial = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) : null;
  const daysLeft = expiry ? daysUntil(expiry) : trial ? daysUntil(trial) : null;

  const handleToggle = async () => {
    try {
      await api.patch(`/super-admin/tenants/${tenant.id}/toggle`);
      onClose();
    } catch {
      alert('Failed to toggle tenant status.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#1e293b', border: `1px solid ${color}44`,
          borderRadius: '16px', padding: '28px', width: '100%', maxWidth: '440px',
          boxShadow: `0 0 40px ${color}22`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ color: '#f1f5f9', fontSize: '18px', fontWeight: 700, margin: 0 }}>{tenant.name}</h2>
            <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>@{tenant.subdomain}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Plan', value: tenant.plan.charAt(0).toUpperCase() + tenant.plan.slice(1) },
            { label: 'Status', value: tenant.isActive ? '● Active' : '● Suspended', valueColor: tenant.isActive ? '#22c55e' : '#ef4444' },
            {
              label: expiry ? 'Expires' : trial ? 'Trial ends' : 'Plan',
              value: expiry
                ? expiry.toLocaleDateString()
                : trial
                ? trial.toLocaleDateString()
                : 'No expiry set',
            },
            {
              label: 'Days left',
              value: daysLeft === null ? '—' : daysLeft < 0 ? `${Math.abs(daysLeft)}d expired` : `${daysLeft}d`,
              valueColor: daysLeft !== null && daysLeft < 0 ? '#ef4444' : daysLeft !== null && daysLeft <= 7 ? '#f59e0b' : '#22c55e',
            },
          ].map(({ label, value, valueColor }) => (
            <div key={label} style={{ background: '#0f172a', borderRadius: '8px', padding: '10px 14px' }}>
              <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{label}</div>
              <div style={{ color: valueColor ?? '#e2e8f0', fontSize: '14px', fontWeight: 600 }}>{value}</div>
            </div>
          ))}
        </div>

        {tenant.subscriptions && tenant.subscriptions.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#64748b', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Recent Subscriptions</div>
            {tenant.subscriptions.slice(0, 3).map((sub) => (
              <div key={sub.id} style={{ background: '#0f172a', borderRadius: '8px', padding: '8px 12px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600, textTransform: 'capitalize' }}>{sub.plan}</span>
                  <span style={{ color: '#64748b', fontSize: '12px', marginLeft: '8px' }}>{sub.periodMonths}mo</span>
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
                  background: sub.status === 'COMPLETED' ? 'rgba(34,197,94,0.15)' : sub.status === 'PENDING' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                  color: sub.status === 'COMPLETED' ? '#86efac' : sub.status === 'PENDING' ? '#fcd34d' : '#fca5a5',
                }}>{sub.status}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={handleToggle}
            style={{
              flex: 1, padding: '11px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
              background: tenant.isActive ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
              color: tenant.isActive ? '#f87171' : '#86efac',
            }}
          >
            {tenant.isActive ? 'Suspend' : 'Unsuspend'}
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, padding: '11px', borderRadius: '8px', border: '1px solid #334155', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCalendarPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [view, setView] = useState<View>('month');
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    api
      .get('/super-admin/tenants')
      .then(({ data }) => setTenants(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const events: CalEvent[] = [];
  tenants.forEach((t) => {
    const { color, type } = getColor(t);

    // Subscription expiry event
    if (t.planExpiresAt) {
      const exp = new Date(t.planExpiresAt);
      events.push({
        id: `exp-${t.id}`,
        title: `📅 ${t.name} — expires`,
        start: exp,
        end: new Date(exp.getTime() + 60 * 60 * 1000), // 1-hour block
        color,
        tenant: t,
        type,
      });
    }

    // Trial end event
    if (t.trialEndsAt) {
      const trial = new Date(t.trialEndsAt);
      events.push({
        id: `trial-${t.id}`,
        title: `🎉 ${t.name} — trial ends`,
        start: trial,
        end: new Date(trial.getTime() + 60 * 60 * 1000),
        color: '#22d3ee',
        tenant: t,
        type: 'trial',
      });
    }
  });

  const legend = [
    { color: '#22c55e', label: 'Active (>7 days)' },
    { color: '#f59e0b', label: 'Expiring soon (≤7 days)' },
    { color: '#ef4444', label: 'Expired' },
    { color: '#22d3ee', label: 'Trial' },
    { color: '#64748b', label: 'No expiry set' },
  ];

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {selectedTenant && (
        <ModalOverlay tenant={selectedTenant} onClose={() => setSelectedTenant(null)} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, margin: 0 }}>Subscription Calendar</h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
            {tenants.length} tenants — click any event for details
          </p>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {legend.map((l) => (
            <div key={l.color} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: l.color, flexShrink: 0 }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>Loading tenant data…</div>
      ) : (
        <div
          style={{
            background: '#1e293b',
            borderRadius: '12px',
            border: '1px solid #334155',
            padding: '16px',
            // Override react-big-calendar styles for dark theme
          }}
        >
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
            style={{ height: 620 }}
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: (event as CalEvent).color,
                color: '#000',
                border: 'none',
              },
            })}
            onSelectEvent={(event) => setSelectedTenant((event as CalEvent).tenant)}
            popup
          />
        </div>
      )}
    </div>
  );
}
