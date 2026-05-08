import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, ShoppingCart, Package,
  AlertTriangle, DollarSign, RefreshCw,
} from "lucide-react";
import api from "../lib/api";

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

function fmt(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return n.toLocaleString();
}

function KpiCard({ title, value, sub, trend, icon: Icon, color }: {
  title: string; value: string; sub?: string; trend?: number;
  icon: React.ElementType; color: string;
}) {
  const positive = (trend ?? 0) >= 0;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <div className={"w-9 h-9 rounded-lg flex items-center justify-center " + color}>
          <Icon className="w-4 h-4 text-white" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={"flex items-center gap-1 text-xs font-medium " + (positive ? "text-emerald-600" : "text-red-500")}>
          {positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {Math.abs(trend).toFixed(1)}% vs yesterday
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={"bg-white rounded-xl border border-slate-200 p-5 shadow-sm " + (className ?? "")}>
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const { data: kpi } = useQuery({
    queryKey: ["kpi-overview"],
    queryFn: () => api.get("/reports/kpi-overview").then(r => r.data),
    refetchInterval: 60_000,
  });
  const { data: salesTrend } = useQuery({
    queryKey: ["sales-trend-30"],
    queryFn: () => api.get("/reports/sales-trend?days=30").then(r => r.data),
    refetchInterval: 120_000,
  });
  const { data: topProducts } = useQuery({
    queryKey: ["top-products"],
    queryFn: () => api.get("/reports/top-products?limit=8").then(r => r.data),
  });
  const { data: paymentBreakdown } = useQuery({
    queryKey: ["payment-breakdown"],
    queryFn: () => api.get("/reports/payment-breakdown").then(r => r.data),
  });
  const { data: categorySales } = useQuery({
    queryKey: ["category-sales"],
    queryFn: () => api.get("/reports/category-sales").then(r => r.data),
  });
  const { data: lowStock } = useQuery({
    queryKey: ["low-stock"],
    queryFn: () => api.get("/stock/low-stock?threshold=10").then(r => r.data),
    refetchInterval: 120_000,
  });
  const { data: monthlySummary } = useQuery({
    queryKey: ["monthly-summary"],
    queryFn: () => api.get("/reports/monthly-summary?months=6").then(r => r.data),
  });

  const trendData = (salesTrend ?? []).map((d: any) => ({
    date: (d.date as string).slice(5),
    Sales: Math.round(d.total / 1000),
    Orders: d.count,
  }));
  const pieData = (paymentBreakdown ?? []).map((d: any) => ({
    name: (d.method as string).replace("_", " "),
    value: Math.round(d.total),
  }));
  const topProds = (topProducts ?? []).map((p: any) => ({
    name: (p.productName as string).length > 14 ? (p.productName as string).slice(0, 14) + "…" : p.productName,
    Revenue: Math.round(p.revenue / 1000),
  }));
  const catData = (categorySales ?? []).map((c: any) => ({
    name: (c.category as string).length > 12 ? (c.category as string).slice(0, 12) + "…" : c.category,
    Revenue: Math.round(c.revenue / 1000),
  }));
  const monthlyData = (monthlySummary ?? []).map((m: any) => ({
    month: (m.period ?? "").slice(0, 7),
    Revenue: Math.round((m.revenue ?? 0) / 1000),
    COGS: Math.round((m.cogs ?? 0) / 1000),
    Profit: Math.round((m.netProfit ?? 0) / 1000),
  }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("en-UG", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <RefreshCw className="w-3.5 h-3.5" /> Live updates
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Today Revenue" value={"UGX " + fmt(kpi?.todaySales ?? 0)} sub={(kpi?.todayTransactions ?? 0) + " transactions"} trend={kpi?.salesGrowth} icon={DollarSign} color="bg-indigo-500" />
        <KpiCard title="Today Orders" value={String(kpi?.todayTransactions ?? 0)} sub="Completed sales" icon={ShoppingCart} color="bg-emerald-500" />
        <KpiCard title="Low Stock Items" value={String(kpi?.lowStockCount ?? 0)} sub="Items <= 10 units" icon={AlertTriangle} color="bg-amber-500" />
        <KpiCard title="Stock Value" value={"UGX " + fmt(kpi?.totalStockValue ?? 0)} sub="At cost price" icon={Package} color="bg-violet-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="30-Day Sales Trend (UGX 000s)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 4, right: 12, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => [v + "K UGX", "Sales"]} />
              <Line type="monotone" dataKey="Sales" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="6-Month P&L Summary (UGX 000s)">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 12, bottom: 0, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => [v + "K UGX"]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Revenue" fill="#6366f1" radius={[3,3,0,0]} />
              <Bar dataKey="COGS" fill="#f59e0b" radius={[3,3,0,0]} />
              <Bar dataKey="Profit" fill="#10b981" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard title="Top Products by Revenue (UGX 000s)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={topProds} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} width={90} />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => [v + "K UGX", "Revenue"]} />
              <Bar dataKey="Revenue" fill="#6366f1" radius={[0,3,3,0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment Methods (last 30 days)">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="45%" outerRadius={90} dataKey="value"
                label={({ name, percent }: any) => name + " " + (percent * 100).toFixed(0) + "%"}
                labelLine={false}>
                {pieData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: any) => "UGX " + Number(v).toLocaleString()} contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Sales by Category (UGX 000s)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={catData} margin={{ top: 4, right: 12, bottom: 28, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} angle={-30} textAnchor="end" />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: any) => [v + "K UGX", "Revenue"]} />
              <Bar dataKey="Revenue" radius={[3,3,0,0]}>
                {catData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {(lowStock?.length ?? 0) > 0 && (
        <ChartCard title={"Low Stock Alerts — " + (lowStock?.length ?? 0) + " items need restocking"}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Product","SKU","Qty","Location","Status"].map(h => (
                    <th key={h} className={"pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wide " + (h === "Qty" ? "text-right" : "text-left")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(lowStock ?? []).slice(0, 10).map((item: any) => (
                  <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition">
                    <td className="py-2.5 font-medium text-slate-800">{item.product?.name}</td>
                    <td className="py-2.5 text-slate-500 font-mono text-xs">{item.product?.sku}</td>
                    <td className="py-2.5 text-right font-semibold text-red-600">{item.quantityOnHand}</td>
                    <td className="py-2.5 text-slate-500">{item.location?.name}</td>
                    <td className="py-2.5">
                      <span className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium " + (
                        item.quantityOnHand <= 0 ? "bg-red-100 text-red-700" :
                        item.quantityOnHand <= 5 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"
                      )}>
                        <AlertTriangle className="w-3 h-3" />
                        {item.quantityOnHand <= 0 ? "Out of Stock" : item.quantityOnHand <= 5 ? "Critical" : "Low"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}
    </div>
  );
}
