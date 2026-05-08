import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, Fragment } from 'react';
import { Plus, Pencil, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';

interface UnitRow {
  id?: number;
  unitName: string;
  conversionFactor: number | string;
  buyingPrice: number | string;
  sellingPriceRetail: number | string;
  sellingPriceWholesale: number | string;
  minWholesaleQty: number | string;
}

const emptyUnit = (): UnitRow => ({
  unitName: '',
  conversionFactor: 1,
  buyingPrice: '',
  sellingPriceRetail: '',
  sellingPriceWholesale: '',
  minWholesaleQty: '',
});

const emptyForm = () => ({
  name: '',
  sku: '',
  barcode: '',
  brand: '',
  description: '',
  categoryId: '',
  units: [emptyUnit()],
});

export default function ProductsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canEdit = user?.role === 'Admin' || user?.role === 'Manager';

  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [expandedUnits, setExpandedUnits] = useState<number | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => api.get(`/products?search=${search}`).then((r) => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  function openAdd() {
    setEditingProduct(null);
    setForm(emptyForm());
    setError('');
    setShowModal(true);
  }

  function openEdit(p: any) {
    setEditingProduct(p);
    setForm({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? '',
      brand: p.brand ?? '',
      description: p.description ?? '',
      categoryId: p.categoryId ? String(p.categoryId) : '',
      units: p.units?.length
        ? p.units.map((u: any) => ({
            id: u.id,
            unitName: u.unitName,
            conversionFactor: Number(u.conversionFactor),
            buyingPrice: Number(u.buyingPrice),
            sellingPriceRetail: Number(u.sellingPriceRetail),
            sellingPriceWholesale: Number(u.sellingPriceWholesale),
            minWholesaleQty: u.minWholesaleQty ? Number(u.minWholesaleQty) : '',
          }))
        : [emptyUnit()],
    });
    setError('');
    setShowModal(true);
  }

  function setField(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function setUnit(idx: number, key: keyof UnitRow, val: string) {
    setForm((f) => {
      const units = [...f.units];
      units[idx] = { ...units[idx], [key]: val };
      return { ...f, units };
    });
  }

  function addUnit() {
    setForm((f) => ({ ...f, units: [...f.units, emptyUnit()] }));
  }

  function removeUnit(idx: number) {
    setForm((f) => ({ ...f, units: f.units.filter((_, i) => i !== idx) }));
  }

  async function handleSave() {
    setError('');
    if (!form.name.trim()) return setError('Product name is required.');
    if (!form.sku.trim()) return setError('SKU is required.');
    if (!form.categoryId) return setError('Category is required.');
    if (form.units.length === 0) return setError('At least one unit is required.');
    for (let i = 0; i < form.units.length; i++) {
      const u = form.units[i];
      if (!u.unitName.trim()) return setError(`Unit ${i + 1}: unit name is required.`);
      if (u.buyingPrice === '' || Number(u.buyingPrice) < 0) return setError(`Unit ${i + 1}: buying price is required.`);
      if (u.sellingPriceRetail === '' || Number(u.sellingPriceRetail) < 0) return setError(`Unit ${i + 1}: retail price is required.`);
      if (u.sellingPriceWholesale === '' || Number(u.sellingPriceWholesale) < 0) return setError(`Unit ${i + 1}: wholesale price is required.`);
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        brand: form.brand.trim() || undefined,
        description: form.description.trim() || undefined,
        categoryId: Number(form.categoryId),
        units: form.units.map((u) => ({
          ...(u.id ? { id: u.id } : {}),
          unitName: u.unitName.trim(),
          conversionFactor: Number(u.conversionFactor) || 1,
          buyingPrice: Number(u.buyingPrice),
          sellingPriceRetail: Number(u.sellingPriceRetail),
          sellingPriceWholesale: Number(u.sellingPriceWholesale),
          minWholesaleQty: u.minWholesaleQty !== '' ? Number(u.minWholesaleQty) : undefined,
        })),
      };

      if (editingProduct) {
        // Update product metadata
        await api.put(`/products/${editingProduct.id}`, {
          name: payload.name,
          barcode: payload.barcode,
          brand: payload.brand,
          description: payload.description,
          categoryId: payload.categoryId,
        });
        // Update each existing unit's prices
        for (const u of payload.units) {
          if (u.id) {
            await api.put(`/products/${editingProduct.id}/units/${u.id}`, {
              unitName: u.unitName,
              conversionFactor: u.conversionFactor,
              buyingPrice: u.buyingPrice,
              sellingPriceRetail: u.sellingPriceRetail,
              sellingPriceWholesale: u.sellingPriceWholesale,
              minWholesaleQty: u.minWholesaleQty,
            });
          }
        }
      } else {
        await api.post('/products', payload);
      }

      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['stock-items'] });
      setShowModal(false);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p: any) {
    if (!confirm(`Deactivate "${p.name}"? It will be hidden from POS but not deleted.`)) return;
    try {
      await deleteMutation.mutateAsync(p.id);
    } catch {
      alert('Failed to deactivate product.');
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Products</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {canEdit && (
            <button
              onClick={openAdd}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">SKU</th>
                <th className="text-left px-5 py-3">Category</th>
                <th className="text-left px-5 py-3">Units / Prices</th>
                <th className="text-left px-5 py-3">Status</th>
                {canEdit && <th className="px-5 py-3" />}
              </tr>
            </thead>
            <tbody>
              {products?.map((p: any) => (
                <Fragment key={p.id}>
                  <tr
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedUnits(expandedUnits === p.id ? null : p.id)}
                  >
                    <td className="px-5 py-3 font-medium flex items-center gap-1">
                      {expandedUnits === p.id ? (
                        <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      {p.name}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{p.sku}</td>
                    <td className="px-5 py-3">{p.category?.name ?? '-'}</td>
                    <td className="px-5 py-3 text-gray-500">{p.units?.length ?? 0} unit(s)</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-1.5 rounded hover:bg-indigo-50 text-indigo-600 transition"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {user?.role === 'Admin' && (
                            <button
                              onClick={() => handleDelete(p)}
                              className="p-1.5 rounded hover:bg-red-50 text-red-500 transition"
                              title="Deactivate"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                  {expandedUnits === p.id && p.units?.length > 0 && (
                    <tr className="bg-indigo-50/40">
                      <td colSpan={canEdit ? 6 : 5} className="px-8 py-3">
                        <table className="w-full text-xs text-gray-700">
                          <thead>
                            <tr className="text-gray-500 border-b border-indigo-100">
                              <th className="text-left pb-1.5">Unit</th>
                              <th className="text-right pb-1.5">Conversion</th>
                              <th className="text-right pb-1.5">Buying Price</th>
                              <th className="text-right pb-1.5">Retail Price</th>
                              <th className="text-right pb-1.5">Wholesale Price</th>
                              <th className="text-right pb-1.5">Min Wholesale Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.units.map((u: any) => (
                              <tr key={u.id} className="border-t border-indigo-100/60">
                                <td className="py-1.5 font-medium">{u.unitName}</td>
                                <td className="py-1.5 text-right">{Number(u.conversionFactor)}</td>
                                <td className="py-1.5 text-right">UGX {Number(u.buyingPrice).toLocaleString()}</td>
                                <td className="py-1.5 text-right">UGX {Number(u.sellingPriceRetail).toLocaleString()}</td>
                                <td className="py-1.5 text-right">UGX {Number(u.sellingPriceWholesale).toLocaleString()}</td>
                                <td className="py-1.5 text-right">{u.minWholesaleQty ? Number(u.minWholesaleQty) : '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {(!products || products.length === 0) && (
            <p className="text-center text-gray-400 py-8">No products found.</p>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              {/* Basic info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Product Name *</label>
                  <input
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Coca-Cola 500ml"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SKU *</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setField('sku', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. CC-500"
                    disabled={!!editingProduct}
                  />
                  {editingProduct && <p className="text-[11px] text-gray-400 mt-0.5">SKU cannot be changed after creation.</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category *</label>
                  <select
                    value={form.categoryId}
                    onChange={(e) => setField('categoryId', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select category...</option>
                    {categories?.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Barcode</label>
                  <input
                    value={form.barcode}
                    onChange={(e) => setField('barcode', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Optional"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Brand</label>
                  <input
                    value={form.brand}
                    onChange={(e) => setField('brand', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Optional"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField('description', e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    placeholder="Optional"
                  />
                </div>
              </div>

              {/* Units */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-700">Units &amp; Pricing</h4>
                  {!editingProduct && (
                    <button
                      onClick={addUnit}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Unit
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {form.units.map((u, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-xl p-4 bg-gray-50 relative">
                      {!editingProduct && form.units.length > 1 && (
                        <button
                          onClick={() => removeUnit(idx)}
                          className="absolute top-2 right-2 p-1 rounded hover:bg-red-50 text-red-400"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Unit Name *</label>
                          <input
                            value={u.unitName}
                            onChange={(e) => setUnit(idx, 'unitName', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Piece, Carton, Dozen"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Conversion Factor</label>
                          <input
                            type="number"
                            min="1"
                            value={u.conversionFactor}
                            onChange={(e) => setUnit(idx, 'conversionFactor', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Buying Price (UGX) *</label>
                          <input
                            type="number"
                            min="0"
                            value={u.buyingPrice}
                            onChange={(e) => setUnit(idx, 'buyingPrice', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Retail Price (UGX) *</label>
                          <input
                            type="number"
                            min="0"
                            value={u.sellingPriceRetail}
                            onChange={(e) => setUnit(idx, 'sellingPriceRetail', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Wholesale Price (UGX) *</label>
                          <input
                            type="number"
                            min="0"
                            value={u.sellingPriceWholesale}
                            onChange={(e) => setUnit(idx, 'sellingPriceWholesale', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Min Wholesale Qty</label>
                          <input
                            type="number"
                            min="1"
                            value={u.minWholesaleQty}
                            onChange={(e) => setUnit(idx, 'minWholesaleQty', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Optional"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
              >
                {saving ? 'Saving…' : editingProduct ? 'Save Changes' : 'Add Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
