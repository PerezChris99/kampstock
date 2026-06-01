import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  Users, Building2, ShoppingBag, TrendingUp,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Shield, AlertTriangle, CalendarDays,
} from 'lucide-react';

// ─── types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  totals: {
    tenants: number; activeTenants: number; suspendedTenants: number;
    trialTenants: number; users: number; products: number;
    sales: number; revenue: number;
  };
  recentTenants: { id: number; name: string; subdomain: string; plan: string; isActive: boolean; createdAt: string }[];
  tenantsByPlan: { plan: string; count: number }[];
}

interface TenantRow {
  id: number; name: string; subdomain: string; plan: string;
  isActive: boolean; ownerEmail: string; trialEndsAt: string | null;
  planExpiresAt: string | null; createdAt: string;
  stats: { users: number; sales: number; revenue: number };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const PLANS = ['starter', 'professional', 'enterprise'];

function fmtUGX(n: number) {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── component ────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [planEdit, setPlanEdit] = useState<Record<number, string>>({});

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['sa-dashboard'],
    queryFn: () => api.get('/super-admin/dashboard').then(r => r.data),
  });

  const { data: tenants, isLoading: tenantsLoading } = useQuery<TenantRow[]>({
    queryKey: ['sa-tenants'],
    queryFn: () => api.get('/super-admin/tenants').then(r => r.data),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => api.patch(`/super-admin/tenants/${id}/toggle`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa-tenants'] }); qc.invalidateQueries({ queryKey: ['sa-dashboard'] }); },
  });

  const planMutation = useMutation({
    mutationFn: ({ id, plan }: { id: number; plan: string }) =>
      api.patch(`/super-admin/tenants/${id}/plan`, { plan }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-tenants'] }),
  });

  const statCards = stats ? [
    { label: 'Total Tenants', value: stats.totals.tenants, sub: `${stats.totals.activeTenants} active`, icon: Building2, color: 'text-blue-500' },
    { label: 'Total Users', value: stats.totals.users, sub: 'across all tenants', icon: Users, color: 'text-green-500' },
    { label: 'Total Sales', value: stats.totals.sales.toLocaleString(), sub: 'completed orders', icon: ShoppingBag, color: 'text-amber-500' },
    { label: 'Total Revenue', value: fmtUGX(Number(stats.totals.revenue)), sub: 'all time', icon: TrendingUp, color: 'text-purple-500' },
  ] : [];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-100 rounded-xl">
          <Shield className="w-6 h-6 text-red-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super-Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Platform-wide overview and tenant management</p>
        </div>
        <button
          onClick={() => navigate('/super-admin/calendar')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition"
        >
          <CalendarDays className="w-4 h-4" />
          Subscription Calendar
        </button>
      </div>

      {/* Stat cards */}
      {statsLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statCards.map((c) => (
            <div key={c.label} className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">{c.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{c.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                </div>
                <c.icon className={`w-6 h-6 ${c.color} opacity-80`} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Plan distribution + Recent tenants */}
      {stats && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Tenants by Plan</h2>
            <div className="space-y-3">
              {stats.tenantsByPlan.map((p) => (
                <div key={p.plan} className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${PLAN_COLORS[p.plan] ?? 'bg-gray-100 text-gray-700'}`}>
                    {p.plan}
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white">{p.count}</span>
                </div>
              ))}
              {stats.tenantsByPlan.length === 0 && <p className="text-sm text-gray-400">No data yet</p>}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Recently Registered</h2>
            <div className="space-y-2">
              {stats.recentTenants.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">{t.name}</span>
                    <span className="text-gray-400 ml-1">({t.subdomain})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[t.plan] ?? ''}`}>{t.plan}</span>
                    <span className={`w-2 h-2 rounded-full ${t.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tenant table */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">All Tenants</h2>
        </div>

        {tenantsLoading ? (
          <div className="p-6 text-center text-gray-400">Loading…</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {(tenants ?? []).map((t) => (
              <div key={t.id}>
                {/* Row */}
                <div className="px-5 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  {/* Status dot */}
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.isActive ? 'bg-green-400' : 'bg-red-400'}`} />

                  {/* Name + subdomain */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.subdomain}.kampstock.com · {t.ownerEmail}</p>
                  </div>

                  {/* Plan badge */}
                  <span className={`hidden sm:inline text-xs font-medium px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${PLAN_COLORS[t.plan] ?? 'bg-gray-100 text-gray-700'}`}>
                    {t.plan}
                  </span>

                  {/* Stats */}
                  <div className="hidden md:flex gap-4 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    <span>{t.stats.users} users</span>
                    <span>{t.stats.sales} sales</span>
                    <span>{fmtUGX(Number(t.stats.revenue))}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleMutation.mutate(t.id)}
                      disabled={toggleMutation.isPending}
                      title={t.isActive ? 'Suspend tenant' : 'Activate tenant'}
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      {t.isActive
                        ? <ToggleRight className="w-5 h-5 text-green-500" />
                        : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                      className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      {expandedId === t.id
                        ? <ChevronUp className="w-4 h-4" />
                        : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {expandedId === t.id && (
                  <div className="px-5 pb-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide">Registered</p>
                        <p className="font-medium text-gray-900 dark:text-white mt-0.5">{fmtDate(t.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide">Trial Ends</p>
                        <p className="font-medium text-gray-900 dark:text-white mt-0.5">{fmtDate(t.trialEndsAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide">Plan Expires</p>
                        <p className="font-medium text-gray-900 dark:text-white mt-0.5">{fmtDate(t.planExpiresAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Change Plan</p>
                        <div className="flex gap-2">
                          <select
                            value={planEdit[t.id] ?? t.plan}
                            onChange={(e) => setPlanEdit((prev) => ({ ...prev, [t.id]: e.target.value }))}
                            className="flex-1 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1"
                          >
                            {PLANS.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => planMutation.mutate({ id: t.id, plan: planEdit[t.id] ?? t.plan })}
                            disabled={planMutation.isPending || (planEdit[t.id] ?? t.plan) === t.plan}
                            className="text-xs px-3 py-1 rounded-lg bg-lime-500 hover:bg-lime-600 text-white disabled:opacity-40 transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </div>

                    {!t.isActive && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                        This tenant is suspended. Users cannot log in.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {tenants?.length === 0 && (
              <div className="p-8 text-center text-gray-400">No tenants registered yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
