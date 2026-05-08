import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../lib/api';

export default function ProductsPage() {
  const [search, setSearch] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => api.get(`/products?search=${search}`).then((r) => r.data),
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Products</h2>
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

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
                <th className="text-left px-5 py-3">Barcode</th>
                <th className="text-left px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((p: any) => (
                <tr key={p.id} className="border-t hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{p.name}</td>
                  <td className="px-5 py-3 text-gray-500">{p.sku}</td>
                  <td className="px-5 py-3">{p.category?.name ?? '-'}</td>
                  <td className="px-5 py-3 text-gray-500">{p.barcode ?? '-'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products?.length === 0 && (
            <p className="text-center text-gray-400 py-8">No products found.</p>
          )}
        </div>
      )}
    </div>
  );
}
