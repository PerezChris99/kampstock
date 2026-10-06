import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Boxes, PackageCheck, ShoppingCart, Store, Users } from 'lucide-react';

const steps = [
  { n:'01', icon:Store, title:'Set up your business', text:'Create the business workspace, add your team, define roles and establish the locations where stock is held.' },
  { n:'02', icon:Boxes, title:'Build your catalogue', text:'Add products, units, suppliers and selling prices, then establish the opening stock position carefully.' },
  { n:'03', icon:PackageCheck, title:'Buy and receive stock', text:'Create purchase orders, receive goods, record supplier invoices and keep every stock movement traceable.' },
  { n:'04', icon:ShoppingCart, title:'Sell at the counter', text:'Use the POS for everyday sales, supported payment methods and customer credit while inventory updates with the transaction.' },
  { n:'05', icon:Users, title:'Keep customers and suppliers clear', text:'Track customer balances, supplier relationships and the commercial history behind the numbers.' },
  { n:'06', icon:BarChart3, title:'Run the business from the data', text:'Use reports, expenses, stock information and sales history to understand performance and act with confidence.' },
];

export default function HowItWorksPage() {
  return <div className="min-h-screen bg-[#f5f2e9] text-[#172014]">
    <header className="border-b border-[#ddd7c8] bg-[#172014] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400 text-slate-950"><Store size={17}/></span><strong>KampStock</strong></Link>
        <div className="flex items-center gap-3"><Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-white/75 hover:text-white">Sign in</Link><Link to="/register" className="rounded-full bg-lime-400 px-4 py-2 text-sm font-bold text-slate-950">Get started</Link></div>
      </div>
    </header>
    <main>
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24"><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">How KampStock works</p><h1 className="mt-4 max-w-4xl text-5xl font-black tracking-[-.04em] sm:text-7xl">Your business already has a workflow. KampStock puts it in one connected system.</h1><p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600">The easiest way to learn KampStock is to follow the movement of goods and money through a normal trading day.</p></section>
      <section className="border-y border-[#ddd7c8] bg-[#ebe7da]"><div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20"><div className="grid gap-px overflow-hidden rounded-3xl border border-[#d8d1c0] bg-[#d8d1c0] md:grid-cols-2 lg:grid-cols-3">{steps.map(({n,icon:Icon,title,text}) => <article key={n} className="bg-[#f5f2e9] p-7 sm:p-8"><span className="text-xs font-black text-lime-700">{n}</span><Icon className="mt-6 text-orange-600" size={25}/><h2 className="mt-6 text-xl font-extrabold">{title}</h2><p className="mt-2 leading-7 text-slate-600">{text}</p></article>)}</div></div></section>
      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24"><div className="grid gap-10 lg:grid-cols-2"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">A normal day</p><h2 className="mt-3 text-4xl font-black tracking-tight">From delivery to end-of-day reconciliation.</h2></div><div className="space-y-5 text-sm leading-7 text-slate-600"><p><strong className="text-[#172014]">Morning:</strong> receive deliveries, confirm quantities, update stock and review what needs attention.</p><p><strong className="text-[#172014]">Trading hours:</strong> sell through POS, handle cash or digital payments, serve credit customers and keep the stock position current.</p><p><strong className="text-[#172014]">Management:</strong> monitor sales, expenses, stock movement and balances without rebuilding the day's story manually.</p><p><strong className="text-[#172014]">Connectivity interruptions:</strong> the POS has an offline workflow designed to preserve essential work and recover safely when connectivity returns.</p></div></div></section>
      <section className="bg-[#172014] text-white"><div className="mx-auto flex max-w-6xl flex-col gap-7 px-5 py-16 sm:px-8 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-lime-400">Start with your real workflow</p><h2 className="mt-3 text-3xl font-black">Set up the business, then let the system follow the work.</h2></div><Link to="/register" className="inline-flex shrink-0 items-center rounded-full bg-lime-400 px-6 py-3.5 text-sm font-extrabold text-slate-950">Create a business <ArrowRight className="ml-2" size={16}/></Link></div></section>
    </main>
    <footer className="border-t border-[#ddd7c8] px-5 py-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} KampStock · <Link to="/about" className="hover:text-slate-900">About</Link> · <Link to="/privacy" className="hover:text-slate-900">Privacy</Link> · <Link to="/terms" className="hover:text-slate-900">Terms</Link></footer>
  </div>;
}
