import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, CircleDollarSign, ShieldCheck, Store } from 'lucide-react';

const steps = [
  ['01', 'Create the workspace', 'Register the business and establish the people, roles and stock locations that will use KampStock.'],
  ['02', 'Build the catalogue', 'Add products, units, prices, suppliers and opening stock. For established businesses, import or enter the current stock position carefully.'],
  ['03', 'Run the counter', 'Use POS for daily sales, take cash or digital payments, manage customer credit and keep the transaction record tied to stock.'],
  ['04', 'Keep the stockroom aligned', 'Raise purchase orders, receive goods, record supplier invoices and monitor movements across locations.'],
  ['05', 'Manage the business', 'Use reports, expenses, customer balances and stock information to understand performance and make decisions.'],
];

export default function AboutPage() {
  return <div className="min-h-screen bg-[#f5f2e9] text-[#172014]">
    <header className="border-b border-[#ddd7c8] bg-[#172014] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400 text-slate-950"><Store size={17}/></span><strong>KampStock</strong></Link>
        <div className="flex items-center gap-3"><Link to="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-white/75 hover:text-white">Sign in</Link><Link to="/register" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-[#172014]">Get started</Link></div>
      </div>
    </header>
    <main>
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24"><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">About KampStock</p><h1 className="mt-4 max-w-4xl text-5xl font-black tracking-[-.04em] sm:text-7xl">Software that follows the goods, not just the numbers.</h1><p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600">KampStock was created for businesses where products physically arrive, move through a store or warehouse, get sold across a counter and eventually have to reconcile back to a number that the owner can trust.</p></section>
      <section className="border-y border-[#ddd7c8] bg-[#ebe7da]"><div className="mx-auto grid max-w-6xl gap-px bg-[#d8d1c0] md:grid-cols-3">{[
        [Boxes,'Stock','Know what came in, what moved and what remains.'],
        [CircleDollarSign,'Trade','Sell at the counter and keep payment and customer records connected.'],
        [ShieldCheck,'Control','Give each person the access they need without giving away the whole business.'],
      ].map(([Icon,title,text]) => <article key={String(title)} className="bg-[#f5f2e9] p-8 sm:p-10"><Icon size={25} className="text-orange-600"/><h2 className="mt-7 text-xl font-extrabold">{String(title)}</h2><p className="mt-2 leading-7 text-slate-600">{String(text)}</p></article>)}</div></section>
      <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-24"><div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">How it works</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">A straightforward path from setup to daily trade.</h2></div><div className="mt-12 divide-y divide-[#ddd7c8] border-y border-[#ddd7c8]">{steps.map(([number,title,text]) => <div key={number} className="grid gap-4 py-8 md:grid-cols-[80px_250px_1fr]"><span className="font-black text-lime-700">{number}</span><h3 className="text-lg font-extrabold">{title}</h3><p className="leading-7 text-slate-600">{text}</p></div>)}</div></section>
      <section className="bg-[#172014] text-white"><div className="mx-auto max-w-6xl px-5 py-20 sm:px-8"><div className="grid gap-12 md:grid-cols-2 md:items-center"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-lime-400">Why it exists</p><h2 className="mt-3 text-4xl font-black tracking-tight">Because a growing business should not have to reconstruct its day from notebooks, memory and disconnected spreadsheets.</h2></div><div className="space-y-6 text-sm leading-7 text-white/65"><p>KampStock brings the operational record closer to the actual work. The goal is not to make a business look more sophisticated; it is to make the business easier to run and harder to lose control of.</p><p>It is built around the realities of wholesale and retail operations in Uganda: physical inventory, multiple payment methods, customer credit, suppliers, intermittent connectivity and the need for owners and managers to see what is happening.</p></div></div></div></section>
      <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8"><h2 className="text-3xl font-black tracking-tight">Ready to put the operation in one place?</h2><p className="mx-auto mt-3 max-w-xl text-slate-600">Set up a workspace and start with the workflows your business already understands.</p><Link to="/register" className="mt-7 inline-flex items-center rounded-full bg-[#172014] px-6 py-3.5 text-sm font-bold text-white">Create your business <ArrowRight className="ml-2" size={16}/></Link></section>
    </main>
    <footer className="border-t border-[#ddd7c8] px-5 py-8 text-center text-xs text-slate-500">© {new Date().getFullYear()} KampStock · Built by Perez Chris · <Link to="/how-it-works" className="hover:text-slate-900">How it works</Link> · <Link to="/faq" className="hover:text-slate-900">FAQ</Link> · <Link to="/security" className="hover:text-slate-900">Security</Link> · <Link to="/privacy" className="hover:text-slate-900">Privacy</Link> · <Link to="/terms" className="hover:text-slate-900">Terms</Link></footer>
  </div>;
}
