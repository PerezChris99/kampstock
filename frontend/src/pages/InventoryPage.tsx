import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function InventoryPage() {
  const { data: items, isLoading } = useQuery({
    queryKey: ['stock-items'],
    queryFn: () => api.get('/stock').then((r) => r.data),
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Inventory</h2>
      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-5 py-3">Product</th>
                <th className="text-left px-5 py-3">SKU</th>
                <th className="text-left px-5 py-3">Location</th>
                <th className="text-right px-5 py-3">On Hand</th>
                <th className="text-right px-5 py-3">Cost Price</th>
                <th className="text-right px-5 py-3">Value</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item: any) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{item.product?.name}</td>
                  <td className="px-5 py-3 text-gray-500">{item.product?.sku}</td>
                  <td className="px-5 py-3">{item.location?.name}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={Number(item.quantityOnHand) < 10 ? 'text-red-600 font-bold' : ''}>
                      {Number(item.quantityOnHand).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    UGX {Number(item.lastCostPrice).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 text-right font-medium">
                    UGX {(Number(item.quantityOnHand) * Number(item.lastCostPrice)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!items || items.length === 0) && (
            <p className="text-center text-gray-400 py-8">No stock items found.</p>
          )}
        </div>
      )}
    </div>
  );
}
