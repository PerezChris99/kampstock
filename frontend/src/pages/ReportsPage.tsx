import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import { Download, TrendingUp, TrendingDown, DollarSign, Package, BarChart2 } from "lucide-react";
import api from "../lib/api";
import { generatePLReport, generateStockReport, generateSlowMoversReport } from "../lib/pdf";

const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#06b6d4","#ec4899","#14b8a6"];

function ChartCard({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color, sub }: { label: string; value: string; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start gap-3">
      <div className={"w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 " + color}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const now = new Date();
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth() + 1);

  const { data: plData } = useQuery({
    queryKey: ["monthly-profit", selYear, selMonth],
    queryFn: () => api.get(`/reports/monthly-profit?year=${selYear}&month=${selMonth}`).then(r => r.data),
  });
  const { data: stockVal } = useQuery({
    queryKey: ["stock-valuation"],
    queryFn: () => api.get("/reports/stock-valuation").then(r => r.data),
  });
  const { data: slowMovers } = useQuery({
    queryKey: ["slow-movers"],
    queryFn: () => api.get("/reports/slow-movers?days=30").then(r => r.data),
  });
  const { data: monthlySummary } = useQuery({
    queryKey: ["monthly-summary"],
    queryFn: () => api.get("/reports/monthly-summary?months=6").then(r => r.data),
  });
  const { data: topProducts } = useQuery({
    queryKey: ["top-products-reports"],
    queryFn: () => api.get("/reports/top-products?limit=10&days=30").then(r => r.data),
  });
  const { data: payBreakdown } = useQuery({
    queryKey: ["payment-breakdown-reports"],
    queryFn: () => api.get("/reports/payment-breakdown?days=30").then(r => r.data),
  });

  const monthlyBarData = (monthlySummary ?? []).map((m: any) => ({
    month: (m.period ?? "").slice(0, 7),
    Revenue: Math.round((m.revenue ?? 0) / 1000),
    COGS: Math.round((m.cogs ?? 0) / 1000),
    Expenses: Math.round((m.totalExpenses ?? 0) / 1000),
    Profit: Math.round((m.netProfit ?? 0) / 1000),
  }));

  const slowData = (slowMovers ?? []).slice(0, 15).map((s: any) => ({
    name: (s.name as string).length > 18 ? (s.name as string).slice(0, 18) + "…" : s.name,
    Sold: s.soldLast30Days,
  }));

  const catStockData = (stockVal?.items ?? []).reduce((acc: Record<string, number>, item: any) => {
    const cat = item.productName.split(" ")[0];
    acc[cat] = (acc[cat] ?? 0) + item.value;
    return acc;
  }, {});
  const catPieData = Object.entries(catStockData).slice(0, 8).map(([name, value]) => ({ name, value: Math.round(value as number / 1000) }));

  const topProdData = (topProducts ?? []).map((p: any) => ({
    name: (p.productName as string).length > 16 ? (p.productName as string).slice(0, 16) + "…" : p.productName,
    Revenue: Math.round(p.revenue / 1000),
    Profit: Math.round(p.profit / 1000),
  }));

  const payData = (payBreakdown ?? []).map((d: any) => ({
    name: (d.method as string).replace("_", " "),
    value: Math.round(d.total),
  }));

  const pl = plData ?? {};
  const isProfit = (pl.netProfit ?? 0) >= 0;

  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const years = [now.getFullYear() - 1, now.getFullYear()];

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Business performance insights</p>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <span className="text-sm font-medium text-slate-600">P&L Period:</span>
        <select value={selMonth} onChange={e => setSelMonth(Number(e.target.value))} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
          {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <select value={selYear} onChange={e => setSelYear(Number(e.target.value))} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button
          onClick={() => plData && generatePLReport({ period: plData.period, revenue: plData.revenue, cogs: plData.cogs, grossProfit: plData.grossProfit, totalExpenses: plData.totalExpenses, netProfit: plData.netProfit, salesCount: plData.salesCount })}
          className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
        >
          <Download className="w-4 h-4" /> Download P&L PDF
        </button>
      </div>

      {/* P&L summary stat boxes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Revenue" value={"UGX " + Math.round(pl.revenue ?? 0).toLocaleString()} icon={DollarSign} color="bg-indigo-500" sub={(pl.salesCount ?? 0) + " sales"} />
        <StatBox label="Gross Profit" value={"UGX " + Math.round(pl.grossProfit ?? 0).toLocaleString()} icon={TrendingUp} color="bg-emerald-500"
          sub={pl.revenue > 0 ? ((pl.grossProfit / pl.revenue) * 100).toFixed(1) + "% margin" : undefined} />
        <StatBox label="Expenses" value={"UGX " + Math.round(pl.totalExpenses ?? 0).toLocaleString()} icon={BarChart2} color="bg-amber-500" />
        <StatBox label="Net Profit" value={"UGX " + Math.round(pl.netProfit ?? 0).toLocaleString()} icon={isProfit ? TrendingUp : TrendingDown} color={isProfit ? "bg-emerald-600" : "bg-red-500"} sub={isProfit ? "Profitable" : "Loss"} />
      </div>

      {/* Row 2: 6-month trend + top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="6-Month Revenue vs Profit (UGX 000s)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthlyBarData} margin={{ top: 4, right: 12, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => [v + "K UGX"]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Revenue" fill="#6366f1" radius={[3,3,0,0]} />
              <Bar dataKey="Expenses" fill="#f59e0b" radius={[3,3,0,0]} />
              <Bar dataKey="Profit" fill="#10b981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top 10 Products by Revenue — last 30 days (UGX 000s)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topProdData} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} width={100} />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => [v + "K UGX"]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Revenue" fill="#6366f1" radius={[0,3,3,0]} />
              <Bar dataKey="Profit" fill="#10b981" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Stock value pie + payment breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Stock Value by Category (UGX 000s)"
          action={
            <button onClick={() => stockVal && generateStockReport(stockVal.items, stockVal.totalValue)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
              <Download className="w-3.5 h-3.5" /> Export PDF
            </button>
          }>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={catPieData} cx="50%" cy="45%" outerRadius={95} dataKey="value"
                label={({ name, percent }: any) => name + " " + (percent * 100).toFixed(0) + "%"} labelLine={false}>
                {catPieData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => "UGX " + Number(v).toLocaleString() + "K"} contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment Methods Breakdown (last 30 days)">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={payData} cx="50%" cy="45%" innerRadius={50} outerRadius={90} dataKey="value"
                label={({ name, percent }: any) => name + " " + (percent * 100).toFixed(0) + "%"} labelLine={false}>
                {payData.map((_: any, i: number) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => "UGX " + Number(v).toLocaleString()} contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Slow movers */}
      <ChartCard title="Slow-Moving Stock — Units Sold in Last 30 Days"
        action={
          <button onClick={() => slowMovers && generateSlowMoversReport(slowMovers)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
        }>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={slowData} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} width={110} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Bar dataKey="Sold" radius={[0,3,3,0]}>
                {slowData.map((d: any, i: number) => (
                  <Cell key={i} fill={d.Sold === 0 ? "#ef4444" : d.Sold < 5 ? "#f59e0b" : "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="overflow-y-auto max-h-72">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 sticky top-0 bg-white">
                  <th className="pb-2 text-xs font-semibold text-slate-500 uppercase text-left">Product</th>
                  <th className="pb-2 text-xs font-semibold text-slate-500 uppercase text-right">Sold (30d)</th>
                  <th className="pb-2 text-xs font-semibold text-slate-500 uppercase text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {(slowMovers ?? []).slice(0, 20).map((item: any) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-2 font-medium text-slate-800 text-xs">{item.name}</td>
                    <td className={"py-2 text-right font-semibold text-xs " + (item.soldLast30Days === 0 ? "text-red-600" : "text-slate-700")}>{item.soldLast30Days}</td>
                    <td className="py-2">
                      <span className={"px-2 py-0.5 rounded-full text-xs font-medium " + (
                        item.soldLast30Days === 0 ? "bg-red-100 text-red-700" :
                        item.soldLast30Days < 5 ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
                      )}>
                        {item.soldLast30Days === 0 ? "No Movement" : item.soldLast30Days < 5 ? "Very Slow" : "Slow"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ChartCard>

      {/* Stock valuation table */}
      <ChartCard title={"Stock Valuation — Total: UGX " + Math.round(stockVal?.totalValue ?? 0).toLocaleString()}
        action={
          <button onClick={() => stockVal && generateStockReport(stockVal.items, stockVal.totalValue)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition">
            <Download className="w-3.5 h-3.5" /> Download PDF
          </button>
        }>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {["Product","SKU","Location","Qty","Unit Cost","Value"].map(h => (
                  <th key={h} className={"pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide " + (["Qty","Unit Cost","Value"].includes(h) ? "text-right" : "text-left")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(stockVal?.items ?? []).map((item: any, i: number) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                  <td className="py-2.5 font-medium text-slate-800">{item.productName}</td>
                  <td className="py-2.5 font-mono text-xs text-slate-500">{item.sku}</td>
                  <td className="py-2.5 text-slate-500">{item.location}</td>
                  <td className="py-2.5 text-right">{Number(item.quantityOnHand).toLocaleString()}</td>
                  <td className="py-2.5 text-right">UGX {Number(item.lastCostPrice).toLocaleString()}</td>
                  <td className="py-2.5 text-right font-semibold text-slate-800">UGX {Number(item.value).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
