import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import api from '../lib/api';
import { useAuthStore } from '../store/auth.store';

const inputCls =
  'w-full mt-0.5 px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

const normRole = (role?: string) => (role ?? '').replace(/_\d+$/, '').toLowerCase();

function AddSupplierModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', contactPerson: '', phone: '', email: '', address: '', tin: '' });
  const [err, setErr] = useState('');

  const set = (f: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/suppliers', {
        name: form.name.trim(),
        ...(form.contactPerson.trim() && { contactPerson: form.contactPerson.trim() }),
        ...(form.phone.trim() && { phone: form.phone.trim() }),
        ...(form.email.trim() && { email: form.email.trim() }),
        ...(form.address.trim() && { address: form.address.trim() }),
        ...(form.tin.trim() && { tin: form.tin.trim() }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] });
      onClose();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message;
      setErr(Array.isArray(msg) ? msg.join('; ') : msg ?? 'Failed to create supplier');
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Add Supplier</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          {err && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          {(
            [
              ['name', 'Name *'],
              ['contactPerson', 'Contact Person'],
              ['phone', 'Phone'],
              ['email', 'Email'],
              ['address', 'Address'],
              ['tin', 'TIN'],
            ] as const
          ).map(([f, label]) => (
            <div key={f}>
              <label className="text-xs text-gray-500">{label}</label>
              <input value={form[f]} onChange={set(f)}
                placeholder={f === 'name' ? 'Required' : 'Optional'} className={inputCls} />
            </div>
          ))}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40">
              {mutation.isPending ? 'Saving…' : 'Add Supplier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const { user } = useAuthStore();
  const role = normRole(user?.role);
  const canManage = !!user?.isSuperAdmin || role === 'admin' || role === 'manager';
  const [showAdd, setShowAdd] = useState(false);

  const { data: suppliersPage, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then((r) => r.data),
  });
  const suppliers: any[] = suppliersPage?.data ?? [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Suppliers</h2>
        {canManage && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold">
            <Plus className="w-4 h-4" /> Add Supplier
          </button>
        )}
      </div>
      {isLoading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Contact Person</th>
                <th className="text-left px-5 py-3">Phone</th>
                <th className="text-left px-5 py-3">Email</th>
                <th className="text-right px-5 py-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {suppliers?.map((s: any) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{s.name}</td>
                  <td className="px-5 py-3">{s.contactPerson ?? '-'}</td>
                  <td className="px-5 py-3">{s.phone ?? '-'}</td>
                  <td className="px-5 py-3">{s.email ?? '-'}</td>
                  <td className="px-5 py-3 text-right text-red-600">
                    UGX {Number(s.balance ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!suppliers || suppliers.length === 0) && (
            <p className="text-center text-gray-400 py-8">No suppliers found.</p>
          )}
        </div>
      )}
      {showAdd && <AddSupplierModal onClose={() => setShowAdd(false)} />}
    </div>
  );
}
