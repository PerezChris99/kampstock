import { Link } from 'react-router-dom';
import {
  ArrowLeft, Store, ShoppingCart, Package, Warehouse,
  BarChart3, Users, Smartphone, Wifi, MapPin, Shield, Award,
} from 'lucide-react';

const features = [
  {
    icon: ShoppingCart,
    title: 'Point of Sale',
    desc: 'Barcode-based POS with retail & wholesale pricing, mobile money, cash and bank payments — built for Uganda.',
  },
  {
    icon: Package,
    title: 'Inventory & Stock',
    desc: 'Real-time stock levels across warehouse locations, low-stock alerts, and goods receipt processing.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    desc: 'P&L summaries, top products, stock valuation, slow-movers — all exportable as PDF.',
  },
  {
    icon: Users,
    title: 'Multi-User Access',
    desc: 'Role-based access for Admin, Manager, Cashier and Storekeeper with a full audit trail.',
  },
  {
    icon: Smartphone,
    title: 'Mobile-First & PWA',
    desc: 'Works on any device — installable as an app on the Android phones carried by cashiers and supervisors.',
  },
  {
    icon: Wifi,
    title: 'Offline Resilient',
    desc: 'Cached reads keep working through power outages and the slow network patches common across Uganda.',
  },
  {
    icon: Warehouse,
    title: 'Supplier & Purchasing',
    desc: 'Manage supplier contacts, raise purchase orders, and record goods receipts to keep stock accurate.',
  },
  {
    icon: Shield,
    title: 'Secure by Default',
    desc: 'JWT auth, role guards, rate limiting, brute-force lockout, and sanitised error responses out of the box.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800/60 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500 flex items-center justify-center">
              <Store className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-base">KampStock</span>
          </div>
          <Link
            to="/login"
            className="ml-auto text-sm text-slate-400 hover:text-white transition"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-16">
        {/* Hero */}
        <section className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-5">
            <MapPin className="w-3 h-3" /> Made for Uganda
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-5 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent leading-tight">
            Your Business.{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Your Stock.
            </span>
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            KampStock is a comprehensive inventory and point-of-sale management platform built for
            Ugandan wholesale and retail businesses — from a boda boda spare-parts stall in Owino
            Market to a multi-branch supermarket chain in Kampala.
          </p>
          <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-2 mt-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-green-400" /> Secure
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5">
              <Wifi className="w-3.5 h-3.5 text-blue-400" /> PWA / Offline
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" /> v2.0
            </span>
            <span className="text-slate-700">·</span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-rose-400" /> Uganda 🇺🇬
            </span>
          </div>
        </section>

        {/* Features grid */}
        <section>
          <h2 className="text-xl font-semibold mb-6 text-slate-200">What KampStock does</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition"
              >
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-indigo-400" />
                </div>
                <h3 className="font-semibold text-sm text-white mb-1.5">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Uganda context */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
          <h2 className="text-xl font-semibold mb-2 text-slate-200">
            Built for the Ugandan market
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-5">
            Whether you run a hardware store in Industrial Area, a produce stall at Nakasero Market,
            an agro-input shop in Masaka, or a wholesale warehouse in Kawempe — KampStock handles
            the real-world complexity of business in Uganda.
          </p>
          <ul className="grid sm:grid-cols-2 gap-2 text-sm text-slate-400">
            {[
              'Ugandan Shillings (UGX) with proper comma formatting',
              'MTN Mobile Money, Airtel Money, cash & bank transfers',
              'Wholesale and retail pricing tiers on the same product',
              'Works through power outages and slow network patches',
              'Multi-branch / multi-tenant for growing businesses',
              'Role-based access: owners, managers, cashiers & storekeepers',
              'Purchase orders and goods receipts for supplier management',
              'Expense tracking for rent, salaries, and overhead costs',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5 flex-shrink-0">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Developer */}
        <section className="border-t border-slate-800/60 pt-10">
          <p className="text-xs text-slate-600 uppercase tracking-widest mb-5">Developer</p>
          <div className="flex flex-col sm:flex-row items-start gap-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 text-xl font-bold select-none">
              PC
            </div>
            <div className="flex-1">
              <a
                href="https://perezchris.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-2xl font-bold text-white hover:text-indigo-400 transition-colors"
              >
                Perez Chris
                <span className="ml-1.5 text-base text-indigo-500">↗</span>
              </a>
              <p className="text-slate-400 text-sm mt-1.5 leading-relaxed max-w-md">
                Full-stack software developer based in Uganda, building practical, reliable software
                for African businesses and beyond.
              </p>
              <a
                href="https://perezchris.netlify.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                perezchris.netlify.app <span className="text-xs">↗</span>
              </a>
            </div>
            <div className="text-right flex-shrink-0 self-start sm:self-center">
              <p className="text-xs text-slate-600 mb-1">Version</p>
              <p className="text-sm font-mono text-slate-400">2.0.0</p>
              <p className="text-xs text-slate-600 mt-2">
                © {new Date().getFullYear()} KampStock
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
