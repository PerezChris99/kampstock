import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../lib/api';

export default function ExpensesPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', from, to],
    queryFn: () => api.get(`/expenses?from=${from}&to=${to}`).then((r) => r.data),
  });

  const { data: totals } = useQuery({
    queryKey: ['expense-totals', from, to],
    queryFn: () => api.get(`/expenses/totals?from=${from}&to=${to}`).then((r) => r.data),
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Expenses</h2>
        <div className="flex gap-2 text-sm">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="border rounded px-3 py-1.5" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="border rounded px-3 py-1.5" />
        </div>
      </div>

      {totals && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          {Object.entries(totals).map(([cat, amt]: [string, any]) => (
            <div key={cat} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
              <span className="text-gray-600">{cat}</span>
              <span className="font-bold text-gray-800">UGX {Number(amt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {isLoading ? <p className="text-gray-500">Loading...</p> : (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Category</th>
                <th className="text-left px-5 py-3">Description</th>
                <th className="text-right px-5 py-3">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses?.map((e: any) => (
                <tr key={e.id} className="border-t hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(e.paidAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3">{e.category}</td>
                  <td className="px-5 py-3">{e.description}</td>
                  <td className="px-5 py-3 text-right font-medium">
                    UGX {Number(e.amount).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!expenses || expenses.length === 0) && (
            <p className="text-center text-gray-400 py-8">No expenses found for this period.</p>
          )}
        </div>
      )}
    </div>
  );
}
