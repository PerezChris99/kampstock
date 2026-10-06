import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Boxes, ChevronLeft, ChevronRight,
  CircleDollarSign, CloudOff, ShieldCheck, Store, Users,
} from 'lucide-react';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9c8a213?auto=format&fit=crop&w=1800&q=85',
    eyebrow: 'Retail operations',
    title: 'Know what is on the shelf before the customer asks.',
    text: 'KampStock keeps sales, stock, pricing and customer balances moving together — from the counter to the back room.',
  },
  {
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1800&q=85',
    eyebrow: 'Wholesale control',
    title: 'Move volume without losing control.',
    text: 'Track purchase orders, goods received, supplier balances and multiple pricing levels from one operational picture.',
  },
  {
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1800&q=85',
    eyebrow: 'Point of sale',
    title: 'A faster till for busy trading days.',
    text: 'Sell quickly, take the payment method that fits the customer, and keep the stock ledger accurate behind the scenes.',
  },
];

const features = [
  { icon: Boxes, title: 'Stock that tells the truth', text: 'Products, movements, locations, receipts and adjustments stay connected.' },
  { icon: CircleDollarSign, title: 'Sales built around the way you trade', text: 'Retail and wholesale pricing, cash, mobile money and bank payments.' },
  { icon: BarChart3, title: 'Decisions from the same data', text: 'Sales, expenses, stock value, slow movers and customer credit in one place.' },
  { icon: CloudOff, title: 'Resilient when the network is not', text: 'The POS is designed to keep essential work moving through connectivity interruptions.' },
  { icon: Users, title: 'One business, the right access', text: 'Separate owner, manager, cashier and storekeeper responsibilities.' },
  { icon: ShieldCheck, title: 'Built to protect business data', text: 'Tenant isolation, authentication, rate limiting and production-grade controls.' },
];

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#10140d] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-10">
        <div>
          <div className="flex items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-slate-950"><Store size={19} /></div>
            <span className="text-xl font-extrabold tracking-tight">KampStock</span>
          </div>
          <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
            A practical business operating system for Ugandan wholesale and retail businesses. Built to bring the counter, stockroom, purchasing and management desk onto the same page.
          </p>
          <p className="mt-5 text-xs leading-5 text-slate-500">
            Built in Uganda with a focus on dependable everyday operations, not software for software's sake.
          </p>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-lime-400">Product</p>
          <div className="space-y-3 text-sm"><a href="#features" className="block hover:text-white">Capabilities</a><a href="#how-it-works" className="block hover:text-white">How it works</a><Link to="/about" className="block hover:text-white">About KampStock</Link><Link to="/register" className="block hover:text-white">Create a business</Link></div>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-lime-400">Company</p>
          <div className="space-y-3 text-sm"><Link to="/about" className="block hover:text-white">About</Link><a href="https://perezchris.netlify.app" target="_blank" rel="noreferrer" className="block hover:text-white">Developer</a><Link to="/login" className="block hover:text-white">Sign in</Link></div>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-lime-400">Legal</p>
          <div className="space-y-3 text-sm"><Link to="/privacy" className="block hover:text-white">Privacy</Link><Link to="/terms" className="block hover:text-white">Terms of use</Link><Link to="/acceptable-use" className="block hover:text-white">Acceptable use</Link></div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>© {new Date().getFullYear()} KampStock. All rights reserved.</span>
          <span>Use of the platform is subject to permission and the applicable terms.</span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, []);

  const slide = slides[active];

  return (
    <div className="min-h-screen bg-[#f5f2e9] text-[#172014]">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link to="/" className="flex items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-slate-950 shadow-lg"><Store size={19} /></div>
            <span className="text-xl font-extrabold tracking-tight">KampStock</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-white/80 md:flex">
            <a href="#features" className="hover:text-white">Capabilities</a>
            <a href="#how-it-works" className="hover:text-white">How it works</a>
            <Link to="/about" className="hover:text-white">About</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 sm:block">Sign in</Link>
            <Link to="/register" className="rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#172014] shadow-lg hover:bg-lime-100">Start your business <ArrowRight className="ml-1 inline" size={15} /></Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative min-h-[760px] overflow-hidden bg-[#172014] text-white sm:min-h-[820px]">
          {slides.map((item, index) => <img key={item.image} src={item.image} alt="" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === active ? 'opacity-100' : 'opacity-0'}`} />)}
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,18,9,.9)_0%,rgba(11,18,9,.65)_42%,rgba(11,18,9,.18)_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#f5f2e9] to-transparent" />
          <div className="relative mx-auto flex min-h-[760px] max-w-7xl items-end px-5 pb-28 pt-36 sm:min-h-[820px] sm:px-8 lg:px-10">
            <div className="max-w-3xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-black/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-lime-200 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-lime-400" /> {slide.eyebrow}
              </div>
              <h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-.045em] sm:text-7xl">{slide.title}</h1>
              <p className="mt-7 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">{slide.text}</p>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link to="/register" className="rounded-full bg-lime-400 px-6 py-3.5 text-sm font-extrabold text-slate-950 shadow-xl hover:bg-lime-300">Set up your business <ArrowRight className="ml-1 inline" size={16} /></Link>
                <Link to="/about" className="rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur hover:bg-white/15">See how it works</Link>
              </div>
            </div>
          </div>
          <div className="absolute bottom-12 right-5 flex items-center gap-2 sm:right-10">
            <button aria-label="Previous slide" onClick={() => setActive((active - 1 + slides.length) % slides.length)} className="rounded-full border border-white/25 bg-black/20 p-3 text-white backdrop-blur hover:bg-white/15"><ChevronLeft size={18} /></button>
            {slides.map((_, index) => <button key={index} aria-label={`Go to slide ${index + 1}`} onClick={() => setActive(index)} className={`h-1.5 rounded-full transition-all ${index === active ? 'w-10 bg-lime-400' : 'w-5 bg-white/40'}`} />)}
            <button aria-label="Next slide" onClick={() => setActive((active + 1) % slides.length)} className="rounded-full border border-white/25 bg-black/20 p-3 text-white backdrop-blur hover:bg-white/15"><ChevronRight size={18} /></button>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Made for the real work</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">From the first sale to the end-of-day numbers.</h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">KampStock is not another dashboard sitting beside your business. It is designed around the physical flow of goods and money: receive it, store it, sell it, collect it, reconcile it and know what is left.</p>
          </div>
        </section>

        <section id="features" className="border-y border-[#ddd7c8] bg-[#ebe7da]">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
            <div className="mb-12 max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">The operating layer</p><h2 className="mt-3 text-4xl font-black tracking-tight">Everything your counter and stockroom need to stay in step.</h2></div>
            <div className="grid gap-px overflow-hidden rounded-3xl border border-[#d8d1c0] bg-[#d8d1c0] md:grid-cols-2 lg:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => <article key={title} className="bg-[#f5f2e9] p-7 sm:p-8"><Icon className="text-orange-600" size={25} /><h3 className="mt-7 text-lg font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}
            </div>
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="rounded-[2rem] bg-[#172014] p-7 text-white sm:p-12 lg:p-16">
            <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-lime-400">How it works</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Set it up once. Run the business from there.</h2></div>
            <div className="mt-12 grid gap-8 md:grid-cols-4">
              {[
                ['01', 'Create your business', 'Set up your workspace, users, locations and operating details.'],
                ['02', 'Load your products', 'Add products, pricing, suppliers and opening stock.'],
                ['03', 'Trade normally', 'Sell, purchase, receive stock, manage credit and record expenses.'],
                ['04', 'Manage with confidence', 'Use reports and live operational data to see what is really happening.'],
              ].map(([n,t,d]) => <div key={n} className="border-t border-white/15 pt-5"><span className="text-sm font-black text-lime-400">{n}</span><h3 className="mt-5 text-lg font-extrabold">{t}</h3><p className="mt-2 text-sm leading-6 text-white/55">{d}</p></div>)}
            </div>
            <Link to="/about#how-it-works" className="mt-10 inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-bold text-[#172014]">Read the full onboarding guide <ArrowRight className="ml-2" size={16} /></Link>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8 lg:px-10">
          <div className="grid gap-10 rounded-[2rem] border border-[#d8d1c0] bg-white p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Built with purpose</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Better control for businesses that are already doing the work.</h2><p className="mt-4 max-w-2xl leading-7 text-slate-600">KampStock was created to make everyday commercial operations clearer, faster and more accountable — especially where connectivity, multiple payment methods and physical stock are part of the reality.</p></div>
            <Link to="/register" className="inline-flex items-center justify-center rounded-full bg-[#172014] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#253321]">Get started <ArrowRight className="ml-2" size={16} /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
