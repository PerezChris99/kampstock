import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../lib/api';

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState(30);

  const { data: profit } = useQuery({
    queryKey: ['monthly-profit', year, month],
    queryFn: () => api.get(`/reports/monthly-profit?year=${year}&month=${month}`).then((r) => r.data),
  });

  const { data: slowMovers } = useQuery({
    queryKey: ['slow-movers', days],
    queryFn: () => api.get(`/reports/slow-movers?days=${days}`).then((r) => r.data),
  });

  const { data: valuation } = useQuery({
    queryKey: ['stock-valuation'],
    queryFn: () => api.get('/reports/stock-valuation').then((r) => r.data),
  });

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Reports</h2>

      {/* Monthly P&L */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-700">Monthly Profit & Loss</h3>
          <div className="flex gap-2 text-sm">
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
              className="border rounded px-2 py-1">
              {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
              className="border rounded px-2 py-1 w-20" />
          </div>
        </div>
        {profit && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Revenue', value: profit.revenue, color: 'text-green-600' },
              { label: 'COGS', value: profit.cogs, color: 'text-red-500' },
              { label: 'Gross Profit', value: profit.grossProfit, color: 'text-blue-600' },
              { label: 'Expenses', value: profit.totalExpenses, color: 'text-red-500' },
              { label: 'Net Profit', value: profit.netProfit, color: profit.netProfit >= 0 ? 'text-green-700' : 'text-red-700' },
              { label: 'Sales Count', value: profit.salesCount, color: 'text-gray-700' },
            ].map((item) => (
              <div key={item.label} className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className={`text-xl font-bold ${item.color}`}>
                  {item.label === 'Sales Count' ? item.value : `UGX ${Number(item.value).toLocaleString()}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stock Valuation */}
      <div className="bg-white rounded-xl shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-3">Stock Valuation</h3>
        {valuation && (
          <>
            <p className="text-3xl font-bold text-blue-700 mb-4">
              UGX {Number(valuation.totalValue).toLocaleString()}
            </p>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Product</th>
                    <th className="text-right px-3 py-2">Qty</th>
                    <th className="text-right px-3 py-2">Cost</th>
                    <th className="text-right px-3 py-2">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {valuation.items?.map((item: any) => (
                    <tr key={item.productId + item.location} className="border-t">
                      <td className="px-3 py-1.5">{item.productName}</td>
                      <td className="px-3 py-1.5 text-right">{item.quantityOnHand}</td>
                      <td className="px-3 py-1.5 text-right">{Number(item.lastCostPrice).toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{Number(item.value).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Slow Movers */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700">Slow-Moving Items</h3>
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm">
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left px-3 py-2">Product</th>
              <th className="text-left px-3 py-2">SKU</th>
              <th className="text-right px-3 py-2">Units Sold</th>
            </tr>
          </thead>
          <tbody>
            {slowMovers?.slice(0, 15).map((p: any) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-1.5">{p.name}</td>
                <td className="px-3 py-1.5 text-gray-500">{p.sku}</td>
                <td className="px-3 py-1.5 text-right">
                  <span className={p.soldLast30Days === 0 ? 'text-red-600 font-bold' : ''}>
                    {p.soldLast30Days}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
