import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

export default function PurchaseOrdersPage() {
  const { data: ordersPage, isLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => api.get('/purchase-orders').then((r) => r.data),
  });
  const orders: any[] = ordersPage?.data ?? [];

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    SENT: 'bg-blue-100 text-blue-700',
    PARTIAL: 'bg-yellow-100 text-yellow-700',
    RECEIVED: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-600',
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Purchase Orders</h2>
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
                <tr key={o.id} className="border-t hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium">{o.poNumber}</td>
                  <td className="px-5 py-3">{o.supplier?.name}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {o.orderedDate ? new Date(o.orderedDate).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[o.status] ?? ''}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    UGX {Number(o.grandTotal ?? 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!orders || orders.length === 0) && (
            <p className="text-center text-gray-400 py-8">No purchase orders found.</p>
          )}
        </div>
      )}
    </div>
  );
}
