import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function SuppliersPage() {
  const { data: suppliersPage, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then((r) => r.data),
  });
  const suppliers: any[] = suppliersPage?.data ?? [];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Suppliers</h2>
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
    </div>
  );
}
