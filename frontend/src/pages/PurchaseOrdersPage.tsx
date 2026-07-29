import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Trash2, Send, Ban, PackageCheck } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';

// ─── shared helpers ──────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SENT: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  RECEIVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
};

const STATUS_FILTERS = ['ALL', 'DRAFT', 'SENT', 'PARTIAL', 'RECEIVED', 'CANCELLED'];

function fmtUGX(n: unknown) {
  return `UGX ${Number(n ?? 0).toLocaleString()}`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

const inputCls =
  'w-full mt-0.5 px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

/**
 * Normalize role names for permission checks: strips the legacy `_<tenantId>`
 * suffix (e.g. "Admin_1") and lowercases, mirroring the backend RolesGuard.
 */
const normRole = (role?: string) => (role ?? '').replace(/_\d+$/, '').toLowerCase();

function usePOPermissions() {
  const { user } = useAuthStore();
  const role = normRole(user?.role);
  const canManage = !!user?.isSuperAdmin || role === 'admin' || role === 'manager';
  const canReceive = canManage || role === 'storekeeper';
  return { canManage, canReceive };
}

// ─── Create PO modal ─────────────────────────────────────────────────────────

interface DraftLine {
  productId: string;
  quantity: string;
  unitPrice: string;
  discount: string;
}

const emptyLine = (): DraftLine => ({ productId: '', quantity: '1', unitPrice: '', discount: '0' });

function CreatePOModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);
  const [err, setErr] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [showQuickSupplier, setShowQuickSupplier] = useState(false);

  const { data: suppliersPage } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers?limit=500').then((r) => r.data),
  });
  const suppliers: any[] = suppliersPage?.data ?? [];

  const quickSupplier = useMutation({
    mutationFn: () => api.post('/suppliers', { name: newSupplierName.trim() }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      setSupplierId(String(res.data.id));
      setNewSupplierName('');
      setShowQuickSupplier(false);
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      setErr(Array.isArray(msg) ? msg.join('; ') : msg ?? 'Failed to create supplier');
    },
  });

  const { data: productsPage } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => api.get('/products?limit=500').then((r) => r.data),
  });
  const products: any[] = productsPage?.data ?? [];

  const setLine = (i: number, field: keyof DraftLine, value: string) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));

  const lineTotal = (l: DraftLine) => {
    const t = Number(l.quantity) * Number(l.unitPrice) - Number(l.discount || 0);
    return Number.isFinite(t) ? t : 0;
  };
  const grandTotal = lines.reduce((s, l) => s + Math.max(lineTotal(l), 0), 0);

  const validLines = lines.filter(
    (l) => l.productId && Number(l.quantity) > 0 && Number(l.unitPrice) >= 0,
  );
  const canSubmit = supplierId && validLines.length === lines.length && lines.length > 0;

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/purchase-orders', {
        supplierId: Number(supplierId),
        ...(expectedDate && { expectedDate: new Date(expectedDate).toISOString() }),
        ...(notes.trim() && { notes: notes.trim() }),
        lines: lines.map((l) => ({
          productId: Number(l.productId),
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
          discount: Number(l.discount || 0),
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      onClose();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      setErr(Array.isArray(msg) ? msg.join('; ') : msg ?? 'Failed to create purchase order');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h3 className="font-semibold text-gray-900">New Purchase Order</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {err && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500">Supplier *</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls}>
                <option value="">Select supplier…</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {showQuickSupplier ? (
                <div className="flex gap-2 mt-2">
                  <input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)}
                    placeholder="Supplier name" className={inputCls} autoFocus />
                  <button onClick={() => quickSupplier.mutate()}
                    disabled={!newSupplierName.trim() || quickSupplier.isPending}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold disabled:opacity-40 whitespace-nowrap">
                    {quickSupplier.isPending ? 'Adding…' : 'Add'}
                  </button>
                  <button onClick={() => { setShowQuickSupplier(false); setNewSupplierName(''); }}
                    className="px-2 py-2 rounded-xl border text-gray-500 text-xs hover:bg-gray-50">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setShowQuickSupplier(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium mt-1 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> New supplier
                </button>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500">Expected Date</label>
              <input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500">Notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" className={inputCls} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500 font-medium">Line Items *</label>
              <button onClick={() => setLines((p) => [...p, emptyLine()])}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add line
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    {i === 0 && <label className="text-[10px] text-gray-400">Product</label>}
                    <select value={l.productId} onChange={(e) => setLine(i, 'productId', e.target.value)} className={inputCls}>
                      <option value="">Select…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <label className="text-[10px] text-gray-400">Qty</label>}
                    <input type="number" min="0.0001" value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <label className="text-[10px] text-gray-400">Unit Price</label>}
                    <input type="number" min="0" value={l.unitPrice} onChange={(e) => setLine(i, 'unitPrice', e.target.value)} className={inputCls} />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <label className="text-[10px] text-gray-400">Discount</label>}
                    <input type="number" min="0" value={l.discount} onChange={(e) => setLine(i, 'discount', e.target.value)} className={inputCls} />
                  </div>
                  <div className="col-span-1 text-right text-xs text-gray-600 pb-2.5 truncate">
                    {lineTotal(l) > 0 ? lineTotal(l).toLocaleString() : '—'}
                  </div>
                  <div className="col-span-1 pb-1.5">
                    <button onClick={() => setLines((p) => p.filter((_, idx) => idx !== i))}
                      disabled={lines.length === 1}
                      className="text-gray-300 hover:text-red-500 disabled:opacity-30">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-600 font-medium">Grand Total</span>
            <span className="font-bold text-gray-900">{fmtUGX(grandTotal)}</span>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40">
              {mutation.isPending ? 'Creating…' : 'Create Purchase Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Receive Goods modal ─────────────────────────────────────────────────────

function ReceiveGoodsModal({ po, onClose }: { po: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [locationId, setLocationId] = useState('');
  const [err, setErr] = useState('');
  const [qtys, setQtys] = useState<Record<number, string>>(() =>
    Object.fromEntries((po.lines ?? []).map((l: any) => [l.id, String(l.quantity)])),
  );

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => api.get('/stock/locations').then((r) => r.data),
  });

  const receivable = (po.lines ?? []).filter((l: any) => Number(qtys[l.id]) > 0);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/goods-receipts', {
        purchaseOrderId: po.id,
        locationId: Number(locationId),
        lines: receivable.map((l: any) => ({
          productId: l.productId,
          quantity: Number(qtys[l.id]),
          unitCost: Number(l.unitPrice),
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['purchase-order', po.id] });
      qc.invalidateQueries({ queryKey: ['stock'] });
      onClose();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      setErr(Array.isArray(msg) ? msg.join('; ') : msg ?? 'Failed to receive goods');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Receive Goods — {po.poNumber}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {err && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div>
            <label className="text-xs text-gray-500">Receiving Location *</label>
            <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputCls}>
              <option value="">Select location…</option>
              {(locations ?? []).map((loc: any) => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium">Quantities Received</label>
            <div className="space-y-2 mt-1">
              {(po.lines ?? []).map((l: any) => (
                <div key={l.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm text-gray-700 truncate">
                    {l.product?.name ?? `Product #${l.productId}`}
                    <span className="text-xs text-gray-400 ml-1">(ordered {Number(l.quantity)})</span>
                  </span>
                  <input type="number" min="0" value={qtys[l.id] ?? ''}
                    onChange={(e) => setQtys((p) => ({ ...p, [l.id]: e.target.value }))}
                    className="w-24 px-3 py-1.5 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Enter 0 to skip a line. Receiving less than ordered marks the PO as PARTIAL.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => mutation.mutate()}
              disabled={!locationId || receivable.length === 0 || mutation.isPending}
              className="flex-1 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-40">
              {mutation.isPending ? 'Receiving…' : 'Confirm Receipt'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail modal ────────────────────────────────────────────────────────────

function PODetailModal({ poId, onClose }: { poId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const { canManage, canReceive } = usePOPermissions();
  const [showReceive, setShowReceive] = useState(false);
  const [err, setErr] = useState('');

  const { data: po, isLoading } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: () => api.get(`/purchase-orders/${poId}`).then((r) => r.data),
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/purchase-orders/${poId}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['purchase-orders'] });
      qc.invalidateQueries({ queryKey: ['purchase-order', poId] });
    },
    onError: (e: any) => setErr(e?.response?.data?.message ?? 'Status update failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-900">{po?.poNumber ?? 'Purchase Order'}</h3>
            {po && <StatusBadge status={po.status} />}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        {isLoading || !po ? (
          <p className="text-gray-500 p-6">Loading…</p>
        ) : (
          <div className="p-5 space-y-4">
            {err && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400">Supplier</p>
                <p className="font-medium text-gray-800">{po.supplier?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Ordered</p>
                <p className="font-medium text-gray-800">{po.orderedDate ? new Date(po.orderedDate).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Expected</p>
                <p className="font-medium text-gray-800">{po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Created By</p>
                <p className="font-medium text-gray-800">{po.createdBy?.name ?? '—'}</p>
              </div>
            </div>
            {po.notes && <p className="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-2">{po.notes}</p>}

            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-4 py-2">Product</th>
                    <th className="text-right px-4 py-2">Qty</th>
                    <th className="text-right px-4 py-2">Unit Price</th>
                    <th className="text-right px-4 py-2">Discount</th>
                    <th className="text-right px-4 py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(po.lines ?? []).map((l: any) => (
                    <tr key={l.id} className="border-t border-gray-50">
                      <td className="px-4 py-2">{l.product?.name ?? `#${l.productId}`}</td>
                      <td className="px-4 py-2 text-right">{Number(l.quantity)}</td>
                      <td className="px-4 py-2 text-right">{Number(l.unitPrice).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right">{Number(l.discount ?? 0).toLocaleString()}</td>
                      <td className="px-4 py-2 text-right font-medium">{Number(l.lineTotal).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-gray-50">
                    <td colSpan={4} className="px-4 py-2 text-right text-gray-600 font-medium">Grand Total</td>
                    <td className="px-4 py-2 text-right font-bold">{fmtUGX(po.grandTotal)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {(po.goodsReceipts ?? []).length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">Goods Receipts</p>
                <div className="space-y-1">
                  {po.goodsReceipts.map((gr: any) => (
                    <div key={gr.id} className="flex justify-between text-sm bg-green-50 rounded-lg px-3 py-1.5">
                      <span className="text-green-800">Receipt #{gr.id}</span>
                      <span className="text-green-600">{new Date(gr.receiptDate).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-1">
              {canManage && po.status === 'DRAFT' && (
                <button onClick={() => statusMutation.mutate('SENT')} disabled={statusMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-40">
                  <Send className="w-4 h-4" /> Mark as Sent
                </button>
              )}
              {canReceive && (po.status === 'SENT' || po.status === 'PARTIAL') && (
                <button onClick={() => setShowReceive(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold">
                  <PackageCheck className="w-4 h-4" /> Receive Goods
                </button>
              )}
              {canManage && ['DRAFT', 'SENT', 'PARTIAL'].includes(po.status) && (
                <button
                  onClick={() => {
                    if (window.confirm(`Cancel purchase order ${po.poNumber}? This cannot be undone.`)) {
                      statusMutation.mutate('CANCELLED');
                    }
                  }}
                  disabled={statusMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold disabled:opacity-40">
                  <Ban className="w-4 h-4" /> Cancel PO
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      {showReceive && po && <ReceiveGoodsModal po={po} onClose={() => setShowReceive(false)} />}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

export default function PurchaseOrdersPage() {
  const { canManage } = usePOPermissions();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const { data: ordersPage, isLoading } = useQuery({
    queryKey: ['purchase-orders', statusFilter, page],
    queryFn: () =>
      api
        .get('/purchase-orders', {
          params: {
            limit: PAGE_SIZE,
            offset: page * PAGE_SIZE,
            ...(statusFilter !== 'ALL' && { status: statusFilter }),
          },
        })
        .then((r) => r.data),
  });
  const orders: any[] = ordersPage?.data ?? [];
  const total: number = ordersPage?.total ?? 0;
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Purchase Orders</h2>
        {canManage && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
            <Plus className="w-4 h-4" /> New Purchase Order
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button key={s}
            onClick={() => { setStatusFilter(s); setPage(0); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              statusFilter === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {isLoading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-5 py-3">PO #</th>
                <th className="text-left px-5 py-3">Supplier</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-right px-5 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((o: any) => (
                <tr key={o.id} onClick={() => setDetailId(o.id)}
                  className="border-t hover:bg-gray-50 cursor-pointer">
                  <td className="px-5 py-3 font-medium">{o.poNumber}</td>
                  <td className="px-5 py-3">{o.supplier?.name}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {o.orderedDate ? new Date(o.orderedDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-right">{fmtUGX(o.grandTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!orders || orders.length === 0) && (
            <div className="text-center py-10">
              <p className="text-gray-400 mb-3">No purchase orders found.</p>
              {canManage && statusFilter === 'ALL' && (
                <button onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
                  <Plus className="w-4 h-4" /> Create your first purchase order
                </button>
              )}
            </div>
          )}
          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-5 py-3 border-t bg-gray-50 text-sm">
              <span className="text-gray-500">
                Page {page + 1} of {totalPages} · {total} orders
              </span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(p - 1, 0))} disabled={page === 0}
                  className="px-3 py-1.5 rounded-lg border text-gray-600 disabled:opacity-40 hover:bg-white">
                  Previous
                </button>
                <button onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))} disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 rounded-lg border text-gray-600 disabled:opacity-40 hover:bg-white">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {showCreate && <CreatePOModal onClose={() => setShowCreate(false)} />}
      {detailId !== null && <PODetailModal poId={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
