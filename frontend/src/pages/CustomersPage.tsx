import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Plus, Search, X, ChevronDown, ChevronUp,
  CreditCard, CheckCircle, AlertTriangle,
  Phone, Mail, MapPin, TrendingDown,
} from 'lucide-react';
import api from '../lib/api';

// ─── types ───────────────────────────────────────────────────────────────────

interface Customer {
  id: number; name: string; phone: string | null; email: string | null;
  address: string | null; tin: string | null; isWholesale: boolean;
  creditLimit: number; balance: number; isActive: boolean; createdAt: string;
}

interface SalePayment {
  id: number; paymentMethod: string; amount: number; receivedAt: string;
}

interface LedgerSale {
  id: number; saleNumber: string; grandTotal: number; paidAmount: number;
  balance: number; createdAt: string; status: string;
  payments: SalePayment[];
}

interface Ledger {
  customer: Customer;
  sales: LedgerSale[];
  totalOutstanding: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtUGX(n: number) {
  return new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(n);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Create Customer modal ────────────────────────────────────────────────────

function CreateCustomerModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', tin: '', isWholesale: false, creditLimit: 0 });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: (data: typeof form) => api.post('/customers', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); onClose(); },
    onError: (e: any) => setErr(e?.response?.data?.message ?? 'Failed to create customer'),
  });

  const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [f]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Add Customer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          {err && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          {(['name', 'phone', 'email', 'address', 'tin'] as const).map(f => (
            <div key={f}>
              <label className="text-xs text-gray-500 capitalize">{f}</label>
              <input value={String(form[f])} onChange={set(f)} placeholder={f === 'name' ? 'Required' : 'Optional'}
                className="w-full mt-0.5 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          ))}
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-gray-500">Credit Limit (UGX)</label>
              <input type="number" min="0" value={form.creditLimit} onChange={set('creditLimit')}
                className="w-full mt-0.5 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <label className="flex items-center gap-2 mt-5 cursor-pointer">
              <input type="checkbox" checked={form.isWholesale} onChange={set('isWholesale')} className="rounded" />
              <span className="text-sm text-gray-700 dark:text-gray-300">Wholesale</span>
            </label>
          </div>
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => mutation.mutate(form)} disabled={!form.name || mutation.isPending}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40">
              {mutation.isPending ? 'Saving...' : 'Add Customer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Record Payment modal ─────────────────────────────────────────────────────

function RecordPaymentModal({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CASH');
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/customers/${customer.id}/payment`, { amount: Number(amount), paymentMethod: method }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customer-ledger', customer.id] });
      onClose();
    },
    onError: (e: any) => setErr(e?.response?.data?.message ?? 'Payment failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white">Record Payment — {customer.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl px-4 py-3 flex justify-between items-center">
            <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">Outstanding Balance</span>
            <span className="font-bold text-red-600">{fmtUGX(Number(customer.balance))}</span>
          </div>
          {err && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div>
            <label className="text-xs text-gray-500">Amount (UGX)</label>
            <input type="number" min="1" max={Number(customer.balance)} value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full mt-0.5 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500">Payment Method</label>
            <select value={method} onChange={e => setMethod(e.target.value)}
              className="w-full mt-0.5 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="CASH">Cash</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="BANK">Bank Transfer</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={!amount || Number(amount) <= 0 || mutation.isPending}
              className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-40">
              {mutation.isPending ? 'Processing...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Ledger panel ─────────────────────────────────────────────────────────────

function LedgerPanel({ customerId }: { customerId: number }) {
  const { data, isLoading } = useQuery<Ledger>({
    queryKey: ['customer-ledger', customerId],
    queryFn: () => api.get(`/customers/${customerId}/ledger`).then(r => r.data),
  });

  if (isLoading) return <div className="px-5 py-4 text-sm text-gray-400">Loading ledger...</div>;
  if (!data) return null;

  const { sales } = data;

  return (
    <div className="px-5 pb-5 bg-gray-50 dark:bg-gray-750 border-t border-gray-100 dark:border-gray-700 space-y-4">
      <div className="pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Sales & Payment Ledger</h3>
        {sales.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No sales on record.</p>
        ) : (
          <div className="space-y-3">
            {sales.map(sale => (
              <div key={sale.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">{sale.saleNumber}</span>
                  <span className="text-xs text-gray-400">{fmtDate(sale.createdAt)}</span>
                  {Number(sale.balance) > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                      Owing: {fmtUGX(Number(sale.balance))}
                    </span>
                  )}
                  {Number(sale.balance) <= 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Fully Paid
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  <div><p className="text-gray-400">Total</p><p className="font-medium text-gray-900 dark:text-white">{fmtUGX(Number(sale.grandTotal))}</p></div>
                  <div><p className="text-gray-400">Paid</p><p className="font-medium text-gray-900 dark:text-white">{fmtUGX(Number(sale.paidAmount))}</p></div>
                  <div><p className="text-gray-400">Balance</p><p className={`font-medium ${Number(sale.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmtUGX(Number(sale.balance))}</p></div>
                </div>
                {sale.payments.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1.5 font-medium">Payments received:</p>
                    <div className="space-y-1">
                      {sale.payments.map(p => (
                        <div key={p.id} className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 rounded-lg px-2.5 py-1.5">
                          <span className="flex items-center gap-1.5">
                            <CreditCard className="w-3 h-3" />
                            {p.paymentMethod.replace('_', ' ')}
                          </span>
                          <span className="font-medium text-green-600">{fmtUGX(Number(p.amount))}</span>
                          <span className="text-gray-400">{fmtDate(p.receivedAt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [paying, setPaying] = useState<Customer | null>(null);
  const [filter, setFilter] = useState<'all' | 'owing' | 'wholesale'>('all');

  const { data: customersPage, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => api.get(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`).then(r => r.data),
  });
  const customers: Customer[] = customersPage?.data ?? [];

  const filtered = customers.filter(c => {
    if (filter === 'owing') return Number(c.balance) > 0;
    if (filter === 'wholesale') return c.isWholesale;
    return true;
  });

  const totalDebt = customers.reduce((s, c) => s + Number(c.balance), 0);
  const debtors = customers.filter(c => Number(c.balance) > 0).length;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      {showCreate && <CreateCustomerModal onClose={() => setShowCreate(false)} />}
      {paying && <RecordPaymentModal customer={paying} onClose={() => setPaying(null)} />}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
          <Users className="w-5 h-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Customers</h1>
          <p className="text-sm text-gray-500">{customers.length} registered · {debtors} with outstanding balance</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Customers', value: customers.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Total Debtors', value: debtors, icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Total Debt', value: fmtUGX(totalDebt), icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
          { label: 'Wholesale', value: customers.filter(c => c.isWholesale).length, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
        ].map(card => (
          <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
            <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-base font-bold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-xs text-gray-400">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        {(['all', 'owing', 'wholesale'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-2 rounded-xl text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:border-indigo-400'}`}>
            {f === 'owing' ? 'Has Balance' : f}
          </button>
        ))}
      </div>

      {/* Customer list */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No customers found.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filtered.map(c => (
              <div key={c.id}>
                {/* Summary row */}
                <div className="px-5 py-4 flex flex-wrap items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${c.isWholesale ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm">{c.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isWholesale ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                        {c.isWholesale ? 'Wholesale' : 'Retail'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-3 mt-0.5 text-xs text-gray-400">
                      {c.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</span>}
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                      {c.address && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{c.address}</span>}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    {Number(c.balance) > 0 ? (
                      <p className="text-sm font-bold text-red-600">{fmtUGX(Number(c.balance))}</p>
                    ) : (
                      <p className="text-sm font-medium text-green-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" />Clear</p>
                    )}
                    {c.creditLimit > 0 && (
                      <p className="text-xs text-gray-400">Limit: {fmtUGX(c.creditLimit)}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {Number(c.balance) > 0 && (
                      <button onClick={() => setPaying(c)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-semibold transition-colors">
                        <CreditCard className="w-3 h-3" /> Pay
                      </button>
                    )}
                    <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="text-gray-400 hover:text-gray-700 transition-colors" title="View ledger">
                      {expanded === c.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Ledger panel */}
                {expanded === c.id && <LedgerPanel customerId={c.id} />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
