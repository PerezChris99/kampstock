import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Plus, X, Receipt, Hash, Filter } from 'lucide-react';
import api from '../lib/api';

const inputCls =
  'w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';
const selectCls =
  'px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer';

function fmtUGX(n: any) {
  return `UGX ${Number(n ?? 0).toLocaleString()}`;
}

const CATEGORY_COLORS: Record<string, string> = {
  Rent: 'bg-purple-100 text-purple-700',
  Utilities: 'bg-sky-100 text-sky-700',
  Wages: 'bg-emerald-100 text-emerald-700',
  Transport: 'bg-amber-100 text-amber-700',
  'Stock Purchase': 'bg-indigo-100 text-indigo-700',
  Maintenance: 'bg-rose-100 text-rose-700',
  Marketing: 'bg-pink-100 text-pink-700',
  Other: 'bg-gray-100 text-gray-600',
};

function AddExpenseModal({ categories, onClose }: { categories: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [category, setCategory] = useState(categories[0] ?? 'Other');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paidTo, setPaidTo] = useState('');
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload: any) => api.post('/expenses', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expense-totals'] });
      onClose();
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg ?? 'Failed to save expense.');
    },
  });

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      setError('Enter a valid amount greater than zero.');
      return;
    }
    setError('');
    mutation.mutate({
      category,
      amount: amt,
      ...(description.trim() && { description: description.trim() }),
      ...(paidTo.trim() && { paidTo: paidTo.trim() }),
      ...(paidAt && { paidAt: new Date(paidAt).toISOString() }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Record Expense</h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">{error}</div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Category *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${selectCls} w-full`}>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Amount (UGX) *</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Paid To</label>
            <input
              type="text"
              value={paidTo}
              onChange={(e) => setPaidTo(e.target.value)}
              placeholder="e.g. UMEME, landlord, staff…"
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Date</label>
            <input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={inputCls} />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional notes…"
              className={inputCls}
            />
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={mutation.isPending}
            className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [category, setCategory] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ['expense-categories'],
    queryFn: () => api.get('/expenses/categories').then((r) => r.data),
  });

  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (category) params.set('category', category);

  const { data: expensesPage, isLoading } = useQuery({
    queryKey: ['expenses', from, to, category],
    queryFn: () => api.get(`/expenses?${params.toString()}`).then((r) => r.data),
  });
  const expenses: any[] = expensesPage?.data ?? [];

  const { data: totals } = useQuery({
    queryKey: ['expense-totals', from, to],
    queryFn: () => api.get(`/expenses/totals?from=${from}&to=${to}`).then((r) => r.data),
  });

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex-1">Expenses</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
        >
          <Plus className="w-4 h-4" /> Record Expense
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 bg-white border border-gray-200 rounded-xl p-3 mb-5">
        <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium uppercase tracking-wide">
          <Filter className="w-3.5 h-3.5" /> Filters
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500 block">From</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={selectCls} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500 block">To</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={selectCls} />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-gray-500 block">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        {(from || to || category) && (
          <button
            onClick={() => { setFrom(''); setTo(''); setCategory(''); }}
            className="px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-100"
          >
            Clear
          </button>
        )}
      </div>

      {/* Summary cards */}
      {totals && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="p-2.5 bg-red-50 rounded-xl">
              <Receipt className="w-5 h-5 text-red-500" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Total Expenses</p>
              <p className="font-bold text-gray-800 truncate">{fmtUGX(totals.total)}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 rounded-xl">
              <Hash className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Transactions</p>
              <p className="font-bold text-gray-800">{totals.count ?? 0}</p>
            </div>
          </div>
          {Object.entries(totals.byCategory ?? {}).slice(0, 2).map(([cat, amt]: [string, any]) => (
            <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full mb-1 ${CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.Other}`}>
                {cat}
              </span>
              <p className="font-bold text-gray-800 truncate">{fmtUGX(amt)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 sm:px-5 py-3">Date</th>
                  <th className="text-left px-4 sm:px-5 py-3">Category</th>
                  <th className="text-left px-4 sm:px-5 py-3">Description</th>
                  <th className="text-left px-4 sm:px-5 py-3">Paid To</th>
                  <th className="text-right px-4 sm:px-5 py-3">Amount</th>
                </tr>
              </thead>
              <tbody>
                {expenses?.map((e: any) => (
                  <tr key={e.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 sm:px-5 py-3 text-gray-500 whitespace-nowrap">
                      {new Date(e.paidAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-5 py-3">
                      <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[e.category] ?? CATEGORY_COLORS.Other}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-gray-700 max-w-[220px] truncate">{e.description || '—'}</td>
                    <td className="px-4 sm:px-5 py-3 text-gray-500">{e.paidTo || '—'}</td>
                    <td className="px-4 sm:px-5 py-3 text-right font-medium whitespace-nowrap">{fmtUGX(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(!expenses || expenses.length === 0) && (
            <div className="text-center py-10">
              <p className="text-gray-400 mb-3">No expenses found for this period.</p>
              <button
                onClick={() => setShowAdd(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
              >
                <Plus className="w-4 h-4" /> Record your first expense
              </button>
            </div>
          )}
        </div>
      )}

      {showAdd && <AddExpenseModal categories={categories.length ? categories : ['Other']} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
