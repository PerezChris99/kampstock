import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';

interface SummaryCard {
  title: string;
  value: string | number;
  color: string;
  icon: string;
}

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0];

  const { data: dailySales } = useQuery({
    queryKey: ['daily-sales', today],
    queryFn: () => api.get(`/reports/daily-sales?date=${today}`).then((r) => r.data),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['low-stock'],
    queryFn: () => api.get('/stock/low-stock?threshold=10').then((r) => r.data),
  });

  const { data: stockVal } = useQuery({
    queryKey: ['stock-valuation'],
    queryFn: () => api.get('/reports/stock-valuation').then((r) => r.data),
  });

  const cards: SummaryCard[] = [
    { title: "Today's Sales", value: `UGX ${(dailySales?.totalSales ?? 0).toLocaleString()}`, color: 'bg-green-500', icon: '💰' },
    { title: 'Transactions', value: dailySales?.totalTransactions ?? 0, color: 'bg-blue-500', icon: '🛒' },
    { title: 'Low Stock Items', value: lowStock?.length ?? 0, color: 'bg-orange-500', icon: '⚠️' },
    { title: 'Stock Value', value: `UGX ${(stockVal?.totalValue ?? 0).toLocaleString()}`, color: 'bg-purple-500', icon: '📦' },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl shadow p-5 flex items-center gap-4">
            <div className={`${card.color} text-white text-3xl w-14 h-14 flex items-center justify-center rounded-xl`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm text-gray-500">{card.title}</p>
              <p className="text-xl font-bold text-gray-800">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {lowStock && lowStock.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="font-semibold text-gray-700 mb-3">Low Stock Alerts</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Product</th>
                <th className="pb-2">SKU</th>
                <th className="pb-2">Location</th>
                <th className="pb-2">On Hand</th>
              </tr>
            </thead>
            <tbody>
              {lowStock.map((item: any) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2">{item.product?.name}</td>
                  <td className="py-2 text-gray-500">{item.product?.sku}</td>
                  <td className="py-2">{item.location?.name}</td>
                  <td className="py-2 text-red-600 font-medium">{item.quantityOnHand}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
