import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function CustomersPage() {
  const { data: customers, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers').then((r) => r.data),
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Customers</h2>
      {isLoading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-5 py-3">Name</th>
                <th className="text-left px-5 py-3">Phone</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">TIN</th>
                <th className="text-right px-5 py-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {customers?.map((c: any) => (
                <tr key={c.id} className="border-t hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{c.name}</td>
                  <td className="px-5 py-3">{c.phone ?? '-'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${c.isWholesale ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {c.isWholesale ? 'Wholesale' : 'Retail'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{c.tin ?? '-'}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={Number(c.balance) > 0 ? 'text-red-600 font-medium' : ''}>
                      UGX {Number(c.balance ?? 0).toLocaleString()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!customers || customers.length === 0) && (
            <p className="text-center text-gray-400 py-8">No customers found.</p>
          )}
        </div>
      )}
    </div>
  );
}
