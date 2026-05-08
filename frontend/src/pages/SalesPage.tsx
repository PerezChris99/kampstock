import { Fragment, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Receipt } from 'lucide-react';
import api from '../lib/api';

const PAY_LABELS: Record<string, string> = {
  CASH: 'Cash', MOBILE_MONEY: 'Mobile Money', BANK: 'Bank', CREDIT: 'Credit',
};

function fmtUGX(n: string | number) {
  return 'UGX ' + Number(n).toLocaleString();
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-UG', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function SalesPage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');

  const { data: sales = [], isLoading, isError } = useQuery<any[]>({
    queryKey: ['sales', from, to],
    queryFn: () =>
      api.get(`/sales?from=${from}&to=${to}&limit=200`).then(r => r.data),
  });

  const filtered = sales.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.saleNumber?.toLowerCase().includes(q) ||
      s.customer?.name?.toLowerCase().includes(q) ||
      s.createdBy?.name?.toLowerCase().includes(q)
    );
  });

  const toggle = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const fetchLines = async (id: number) => {
    try {
      const r = await api.get(`/sales/${id}`);
      return r.data.lines ?? [];
    } catch {
      return [];
    }
  };

  const [lineCache, setLineCache] = useState<Record<number, any[]>>({});

  const handleToggle = async (sale: any) => {
    if (!lineCache[sale.id] && !expanded.has(sale.id)) {
      const lines = await fetchLines(sale.id);
      setLineCache(prev => ({ ...prev, [sale.id]: lines }));
    }
    toggle(sale.id);
  };

  const totalRevenue = filtered.reduce((sum, s) => sum + Number(s.grandTotal), 0);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Receipt size={20} className="text-indigo-600" />
          Sales History
        </h2>
        <div className="text-sm text-gray-500">
          {filtered.length} sale{filtered.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
          <span className="font-semibold text-gray-700">{fmtUGX(totalRevenue)}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 bg-white border border-gray-200 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-600">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="border border-gray-300 rounded-lg text-sm px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <input
          type="text"
          placeholder="Search receipt, customer…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg text-sm px-3 py-1 flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-indigo-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Loading sales…</div>
        ) : isError ? (
          <div className="p-8 text-center text-red-500">Failed to load sales.</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No sales found for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 w-8"></th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Receipt #</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Payment</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Total</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(sale => (
                <Fragment key={sale.id}>
                  <tr
                    key={sale.id}
                    className="hover:bg-indigo-50 cursor-pointer transition"
                    onClick={() => handleToggle(sale)}
                  >
                    <td className="px-4 py-3 text-gray-400">
                      {expanded.has(sale.id)
                        ? <ChevronDown size={15} />
                        : <ChevronRight size={15} />}
                    </td>
                    <td className="px-4 py-3 font-mono text-indigo-700 text-xs">{sale.saleNumber}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(sale.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-700">{sale.customer?.name ?? 'Walk-in'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        sale.saleType === 'WHOLESALE'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>{sale.saleType}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {sale.payments?.map((p: any) => PAY_LABELS[p.paymentMethod] ?? p.paymentMethod).join(', ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-800">{fmtUGX(sale.grandTotal)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        sale.status === 'COMPLETED' ? 'bg-green-100 text-green-700'
                          : sale.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-600'
                      }`}>{sale.status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{sale.createdBy?.name ?? '—'}</td>
                  </tr>
                  {expanded.has(sale.id) && (
                    <tr className="bg-indigo-50">
                      <td colSpan={9} className="px-8 py-3">
                        {lineCache[sale.id] ? (
                          lineCache[sale.id].length === 0 ? (
                            <span className="text-gray-400 text-xs">No line items found.</span>
                          ) : (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-left py-1 font-semibold">Product</th>
                                  <th className="text-left py-1 font-semibold">Unit</th>
                                  <th className="text-right py-1 font-semibold">Qty</th>
                                  <th className="text-right py-1 font-semibold">Unit Price</th>
                                  <th className="text-right py-1 font-semibold">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lineCache[sale.id].map((line: any) => (
                                  <tr key={line.id} className="border-t border-indigo-100">
                                    <td className="py-1 text-gray-700">{line.product?.name ?? `#${line.productId}`}</td>
                                    <td className="py-1 text-gray-500">{line.product?.unitOfMeasure ?? line.unitName ?? '—'}</td>
                                    <td className="py-1 text-right text-gray-700">{Number(line.quantity)}</td>
                                    <td className="py-1 text-right text-gray-700">{fmtUGX(line.unitPrice)}</td>
                                    <td className="py-1 text-right font-semibold text-gray-800">{fmtUGX(line.lineTotal ?? line.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )
                        ) : (
                          <span className="text-gray-400 text-xs">Loading items…</span>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
