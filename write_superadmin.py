import pathlib, textwrap

content = textwrap.dedent("""\
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import {
  Users, Building2, ShoppingBag, TrendingUp,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
  Shield, AlertTriangle, CalendarDays, Search,
  Phone, Mail, MapPin, Clock, Star, Layers, BadgeCheck,
  Package,
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

interface SubRecord {
  id: number; status: string; plan: string;
  amount: number; periodMonths: number;
  confirmedAt: string | null; expiresAt: string | null;
}

interface TenantRow {
  id: number;
  name: string;
  subdomain: string;
  plan: string;
  isActive: boolean;
  ownerEmail: string | null;
  ownerPhone: string | null;
  address: string | null;
  businessType: string | null;
  description: string | null;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  subscriptions: SubRecord[];
  stats: { users: number; sales: number; revenue: number };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  professional: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
};

const BIZ_TYPE_COLORS: Record<string, string> = {
  retail: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  wholesale: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  pharmacy: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  restaurant: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  electronics: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  hardware: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  clothing: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  supermarket: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  agriculture: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
};

const BIZ_TYPE_LABELS: Record<string, string> = {
  retail: 'Retail Shop',
  wholesale: 'Wholesale / Distribution',
  pharmacy: 'Pharmacy / Medical',
  restaurant: 'Restaurant / Food & Beverage',
  electronics: 'Electronics',
  hardware: 'Hardware / Building',
  clothing: 'Clothing / Apparel',
  supermarket: 'Supermarket / Grocery',
  agriculture: 'Agriculture / Farm Supply',
  other: 'Other',
};

const SUB_STATUS_COLORS: Record<string, string> = {
  PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  PENDING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  CANCELLED: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const PLANS = ['starter', 'professional', 'enterprise'];

function fmtUGX(n: number) {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function daysLeft(d: string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86_400_000);
}

function ExpiryBadge({ date }: { date: string | null }) {
  const days = daysLeft(date);
  if (days === null) return <span className="text-gray-400 text-xs">No expiry set</span>;
  if (days < 0) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">Expired {Math.abs(days)}d ago</span>;
  if (days <= 7) return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">Expires in {days}d</span>;
  return <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">{fmtDate(date)}</span>;
}

// ─── component ────────────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [planEdit, setPlanEdit] = useState<Record<number, string>>({});
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBizType, setFilterBizType] = useState('all');
  const [activeTab, setActiveTab] = useState<'directory' | 'overview'>('overview');

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa-tenants'] });
      qc.invalidateQueries({ queryKey: ['sa-dashboard'] });
    },
  });

  const planMutation = useMutation({
    mutationFn: ({ id, plan }: { id: number; plan: string }) =>
      api.patch(`/super-admin/tenants/${id}/plan`, { plan }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa-tenants'] }),
  });

  const filtered = useMemo(() => {
    if (!tenants) return [];
    return tenants.filter((t) => {
      const q = search.toLowerCase();
      if (q && !t.name.toLowerCase().includes(q) && !t.subdomain.toLowerCase().includes(q) && !(t.ownerEmail ?? '').toLowerCase().includes(q) && !(t.businessType ?? '').toLowerCase().includes(q)) return false;
      if (filterPlan !== 'all' && t.plan !== filterPlan) return false;
      if (filterStatus === 'active' && !t.isActive) return false;
      if (filterStatus === 'suspended' && t.isActive) return false;
      if (filterStatus === 'trial' && !(t.trialEndsAt && daysLeft(t.trialEndsAt)! > 0)) return false;
      if (filterStatus === 'expired' && !(t.planExpiresAt && daysLeft(t.planExpiresAt)! < 0)) return false;
      if (filterBizType !== 'all' && (t.businessType ?? 'other') !== filterBizType) return false;
      return true;
    });
  }, [tenants, search, filterPlan, filterStatus, filterBizType]);

  const statCards = stats ? [
    { label: 'Total Businesses', value: stats.totals.tenants, sub: `${stats.totals.activeTenants} active \u00b7 ${stats.totals.suspendedTenants} suspended`, icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
    { label: 'On Trial', value: stats.totals.trialTenants, sub: 'active free trials', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
    { label: 'Total Users', value: stats.totals.users, sub: 'registered across all tenants', icon: Users, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    { label: 'Products Listed', value: stats.totals.products.toLocaleString(), sub: 'across all businesses', icon: Package, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
    { label: 'Total Sales', value: stats.totals.sales.toLocaleString(), sub: 'completed orders', icon: ShoppingBag, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
    { label: 'Total Revenue', value: fmtUGX(Number(stats.totals.revenue)), sub: 'all time platform revenue', icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' },
  ] : [];

  const bizTypes = useMemo(() => {
    if (!tenants) return [];
    const seen = new Set<string>();
    tenants.forEach(t => seen.add(t.businessType ?? 'other'));
    return Array.from(seen).sort();
  }, [tenants]);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
          <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Super-Admin Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Platform-wide oversight of all registered businesses</p>
        </div>
        <button
          onClick={() => navigate('/super-admin/calendar')}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <CalendarDays className="w-4 h-4" />
          Subscription Calendar
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
        {(['overview', 'directory'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab === 'overview' ? 'Platform Overview' : 'Business Directory'}
          </button>
        ))}
      </div>

      {/* ====== OVERVIEW TAB ====== */}
      {activeTab === 'overview' && (
        <>
          {statsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => <div key={i} className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm animate-pulse h-28" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {statCards.map((c) => (
                <div key={c.label} className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
                    <c.icon className={`w-4 h-4 ${c.color}`} />
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{c.value}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 uppercase tracking-wide">{c.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{c.sub}</p>
                </div>
              ))}
            </div>
          )}

          {stats && (
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-500" /> Tenants by Plan
                </h2>
                <div className="space-y-3">
                  {stats.tenantsByPlan.map((p) => (
                    <div key={p.plan} className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${PLAN_COLORS[p.plan] ?? 'bg-gray-100 text-gray-700'}`}>
                        {p.plan}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                          <div className="h-full rounded-full bg-blue-500" style={{ width: `${(p.count / (stats.totals.tenants || 1)) * 100}%` }} />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-sm w-4 text-right">{p.count}</span>
                      </div>
                    </div>
                  ))}
                  {stats.tenantsByPlan.length === 0 && <p className="text-sm text-gray-400">No data yet</p>}
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-green-500" /> By Nature of Business
                </h2>
                {tenants && (() => {
                  const typeCounts: Record<string, number> = {};
                  tenants.forEach(t => { const k = t.businessType ?? 'other'; typeCounts[k] = (typeCounts[k] ?? 0) + 1; });
                  const entries = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);
                  return (
                    <div className="space-y-2.5">
                      {entries.map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BIZ_TYPE_COLORS[type] ?? BIZ_TYPE_COLORS.other}`}>
                            {BIZ_TYPE_LABELS[type] ?? type}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white text-sm">{count}</span>
                        </div>
                      ))}
                      {entries.length === 0 && <p className="text-sm text-gray-400">No data yet</p>}
                    </div>
                  );
                })()}
              </div>

              <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow-sm border border-gray-100 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" /> Recently Registered
                </h2>
                <div className="space-y-3">
                  {stats.recentTenants.map((t) => (
                    <div key={t.id} className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${t.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{t.name}</p>
                        <p className="text-xs text-gray-400">{fmtDate(t.createdAt)}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${PLAN_COLORS[t.plan] ?? ''}`}>{t.plan}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ====== BUSINESS DIRECTORY TAB ====== */}
      {activeTab === 'directory' && (
        <>
          {/* Search + filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, subdomain, email, or business type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">All Plans</option>
              {PLANS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="trial">On Trial</option>
              <option value="expired">Expired</option>
            </select>
            <select value={filterBizType} onChange={(e) => setFilterBizType(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">All Types</option>
              {bizTypes.map(bt => <option key={bt} value={bt}>{BIZ_TYPE_LABELS[bt] ?? bt}</option>)}
            </select>
            <p className="text-sm text-gray-400 flex-shrink-0">{filtered.length} {filtered.length === 1 ? 'business' : 'businesses'}</p>
          </div>

          {/* Business list */}
          <div className="rounded-2xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            {tenantsLoading ? (
              <div className="p-8 text-center text-gray-400">Loading businesses...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No businesses match your filters.</div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.map((t) => (
                  <div key={t.id}>

                    {/* Summary row */}
                    <div className="px-5 py-4 flex flex-wrap items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <span title={t.isActive ? 'Active' : 'Suspended'}
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${t.isActive ? 'bg-green-400' : 'bg-red-400'}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">{t.name}</p>
                          {t.businessType && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BIZ_TYPE_COLORS[t.businessType] ?? BIZ_TYPE_COLORS.other}`}>
                              {BIZ_TYPE_LABELS[t.businessType] ?? t.businessType}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {t.subdomain}.kampstock.com
                          {t.ownerEmail ? ` \u00b7 ${t.ownerEmail}` : ''}
                          {t.ownerPhone ? ` \u00b7 ${t.ownerPhone}` : ''}
                        </p>
                      </div>

                      <span className={`hidden sm:inline text-xs font-medium px-2.5 py-1 rounded-full capitalize flex-shrink-0 ${PLAN_COLORS[t.plan] ?? 'bg-gray-100 text-gray-700'}`}>
                        {t.plan}
                      </span>

                      <div className="hidden lg:block flex-shrink-0">
                        <ExpiryBadge date={t.planExpiresAt} />
                      </div>

                      <div className="hidden xl:flex gap-4 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t.stats.users}</span>
                        <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" />{t.stats.sales}</span>
                        <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{fmtUGX(Number(t.stats.revenue))}</span>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => toggleMutation.mutate(t.id)} disabled={toggleMutation.isPending}
                          title={t.isActive ? 'Suspend business' : 'Activate business'}
                          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                          {t.isActive ? <ToggleRight className="w-5 h-5 text-green-500" /> : <ToggleLeft className="w-5 h-5 text-gray-400" />}
                        </button>
                        <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                          className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors" title="View full details">
                          {expandedId === t.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    {expandedId === t.id && (
                      <div className="px-5 pb-5 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 space-y-5">

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">

                          {/* Business identity */}
                          <div className="col-span-full sm:col-span-2 lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2 font-semibold">Business Identity</p>
                            <div className="space-y-1.5 text-sm">
                              <div className="flex items-start gap-2">
                                <Building2 className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-900 dark:text-white font-medium">{t.name}</span>
                              </div>
                              {t.businessType && (
                                <div className="flex items-center gap-2">
                                  <BadgeCheck className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${BIZ_TYPE_COLORS[t.businessType] ?? BIZ_TYPE_COLORS.other}`}>
                                    {BIZ_TYPE_LABELS[t.businessType] ?? t.businessType}
                                  </span>
                                </div>
                              )}
                              {t.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">&ldquo;{t.description}&rdquo;</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${PLAN_COLORS[t.plan]}`}>{t.plan} plan</span>
                                <span className={`w-2 h-2 rounded-full ${t.isActive ? 'bg-green-400' : 'bg-red-400'}`} />
                                <span className="text-xs text-gray-500">{t.isActive ? 'Active' : 'Suspended'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Contact */}
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2 font-semibold">Contact</p>
                            <div className="space-y-2 text-sm">
                              {t.ownerEmail
                                ? <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /><span className="text-gray-700 dark:text-gray-300 text-xs break-all">{t.ownerEmail}</span></div>
                                : <div className="flex items-center gap-2 text-gray-400"><Mail className="w-3.5 h-3.5" /><span className="text-xs italic">No email provided</span></div>}
                              {t.ownerPhone
                                ? <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /><span className="text-gray-700 dark:text-gray-300 text-xs">{t.ownerPhone}</span></div>
                                : <div className="flex items-center gap-2 text-gray-400"><Phone className="w-3.5 h-3.5" /><span className="text-xs italic">No phone provided</span></div>}
                              {t.address
                                ? <div className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" /><span className="text-gray-700 dark:text-gray-300 text-xs">{t.address}</span></div>
                                : <div className="flex items-center gap-2 text-gray-400"><MapPin className="w-3.5 h-3.5" /><span className="text-xs italic">No address provided</span></div>}
                            </div>
                          </div>

                          {/* Timeline */}
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2 font-semibold">Timeline</p>
                            <div className="space-y-2 text-sm">
                              <div>
                                <p className="text-xs text-gray-400">Registered</p>
                                <p className="font-medium text-gray-900 dark:text-white text-xs">{fmtDateTime(t.createdAt)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Trial Period</p>
                                <ExpiryBadge date={t.trialEndsAt} />
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Plan Expires</p>
                                <ExpiryBadge date={t.planExpiresAt} />
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Last Updated</p>
                                <p className="font-medium text-gray-900 dark:text-white text-xs">{fmtDate(t.updatedAt)}</p>
                              </div>
                            </div>
                          </div>

                          {/* Activity */}
                          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2 font-semibold">Activity</p>
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500"><Users className="w-3.5 h-3.5" />Users</div>
                                <span className="font-bold text-gray-900 dark:text-white">{t.stats.users}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500"><ShoppingBag className="w-3.5 h-3.5" />Sales</div>
                                <span className="font-bold text-gray-900 dark:text-white">{t.stats.sales.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-1.5 text-xs text-gray-500"><TrendingUp className="w-3.5 h-3.5" />Revenue</div>
                                <span className="font-bold text-gray-900 dark:text-white text-xs">{fmtUGX(Number(t.stats.revenue))}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Subscription history */}
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                          <p className="text-xs uppercase tracking-wide text-gray-400 mb-3 font-semibold">Subscription History (last 5)</p>
                          {t.subscriptions.length > 0 ? (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-gray-400 border-b border-gray-100 dark:border-gray-700">
                                    <th className="pb-2 pr-4 font-semibold">#</th>
                                    <th className="pb-2 pr-4 font-semibold">Plan</th>
                                    <th className="pb-2 pr-4 font-semibold">Amount</th>
                                    <th className="pb-2 pr-4 font-semibold">Period</th>
                                    <th className="pb-2 pr-4 font-semibold">Status</th>
                                    <th className="pb-2 pr-4 font-semibold">Confirmed</th>
                                    <th className="pb-2 font-semibold">Expires</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                                  {t.subscriptions.map((s) => (
                                    <tr key={s.id} className="text-gray-700 dark:text-gray-300">
                                      <td className="py-1.5 pr-4 text-gray-400">{s.id}</td>
                                      <td className="py-1.5 pr-4 capitalize">{s.plan}</td>
                                      <td className="py-1.5 pr-4">{fmtUGX(Number(s.amount))}</td>
                                      <td className="py-1.5 pr-4">{s.periodMonths} mo</td>
                                      <td className="py-1.5 pr-4">
                                        <span className={`px-1.5 py-0.5 rounded-full font-medium ${SUB_STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                                      </td>
                                      <td className="py-1.5 pr-4">{fmtDate(s.confirmedAt)}</td>
                                      <td className="py-1.5">{fmtDate(s.expiresAt)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <p className="text-xs text-gray-400 text-center py-3">No subscription payments recorded yet.</p>
                          )}
                        </div>

                        {/* Actions row */}
                        <div className="flex flex-wrap gap-3 items-center">
                          <button
                            onClick={() => toggleMutation.mutate(t.id)}
                            disabled={toggleMutation.isPending}
                            className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                              t.isActive
                                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                            }`}
                          >
                            {t.isActive ? 'Suspend Business' : 'Reactivate Business'}
                          </button>
                          <div className="flex items-center gap-2 ml-auto">
                            <label className="text-xs text-gray-500">Change Plan:</label>
                            <select
                              value={planEdit[t.id] ?? t.plan}
                              onChange={(e) => setPlanEdit((prev) => ({ ...prev, [t.id]: e.target.value }))}
                              className="text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-2 py-1.5"
                            >
                              {PLANS.map((p) => <option key={p} value={p} className="capitalize">{p}</option>)}
                            </select>
                            <button
                              onClick={() => planMutation.mutate({ id: t.id, plan: planEdit[t.id] ?? t.plan })}
                              disabled={planMutation.isPending || (planEdit[t.id] ?? t.plan) === t.plan}
                              className="text-xs px-3 py-1.5 rounded-lg bg-lime-500 hover:bg-lime-600 text-white disabled:opacity-40 transition-colors font-semibold"
                            >
                              Apply
                            </button>
                          </div>
                        </div>

                        {!t.isActive && (
                          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                            This business is suspended. Its users cannot log in.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
""")

out = pathlib.Path(r"d:/NEW PROJECTS/Kampstock/frontend/src/pages/SuperAdminPage.tsx")
out.write_text(content, encoding="utf-8")
print("OK:", len(content), "chars,", len(content.splitlines()), "lines")
