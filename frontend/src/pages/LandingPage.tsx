import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, Boxes, ChevronLeft, ChevronRight,
  CircleDollarSign, CloudOff, PackageCheck, Pause, Play, ShieldCheck, ShoppingCart, Truck, Store, Users,
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
          <div className="space-y-3 text-sm"><a href="#features" className="block hover:text-white">Capabilities</a><Link to="/how-it-works" className="block hover:text-white">How it works</Link><Link to="/about" className="block hover:text-white">About KampStock</Link><Link to="/faq" className="block hover:text-white">FAQ</Link><Link to="/contact" className="block hover:text-white">Contact</Link><Link to="/register" className="block hover:text-white">Create a business</Link></div>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-lime-400">Company</p>
          <div className="space-y-3 text-sm"><Link to="/about" className="block hover:text-white">About</Link><a href="https://perezchris.netlify.app" target="_blank" rel="noreferrer" className="block hover:text-white">Developer</a><Link to="/login" className="block hover:text-white">Sign in</Link></div>
        </div>
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-lime-400">Legal</p>
          <div className="space-y-3 text-sm"><Link to="/privacy" className="block hover:text-white">Privacy</Link><Link to="/terms" className="block hover:text-white">Terms of use</Link><Link to="/acceptable-use" className="block hover:text-white">Acceptable use</Link><Link to="/security" className="block hover:text-white">Security</Link><Link to="/billing" className="block hover:text-white">Billing & subscriptions</Link><Link to="/cookies" className="block hover:text-white">Cookie policy</Link><Link to="/intellectual-property" className="block hover:text-white">Intellectual property</Link></div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>© {new Date().getFullYear()} KampStock. All rights reserved.</span>
          <span>Created by Perez Chris. Copyright © 2024–2026 KampStock. All rights reserved. Proprietary software; use requires prior written permission.</span>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tourActive, setTourActive] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % slides.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused]);

  const slide = slides[active];

  return (
    <div className="min-h-screen bg-[#f5f2e9] text-[#172014]">
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <Link to="/" className="flex items-center gap-3 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lime-400 text-slate-950 shadow-lg"><Store size={19} /></div>
            <span className="text-xl font-extrabold tracking-tight">KampStock</span>
          </Link>
          <nav aria-label="Main navigation" className="hidden items-center gap-7 text-sm font-semibold text-white/85 lg:flex">
            <a href="#features" className="hover:text-white">Product</a>
            <Link to="/how-it-works" className="hover:text-white">How it works</Link>
            <Link to="/about" className="hover:text-white">About</Link>
            <Link to="/security" className="hover:text-white">Security</Link>
            <Link to="/faq" className="hover:text-white">FAQ</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden rounded-full px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 sm:block">Sign in</Link>
            <Link to="/register" className="rounded-full bg-white px-4 py-2.5 text-sm font-bold text-[#172014] shadow-lg hover:bg-lime-100">Start your business <ArrowRight className="ml-1 inline" size={15} /></Link>
            <button type="button" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen((open) => !open)} className="rounded-full border border-white/20 bg-black/20 p-2.5 text-white backdrop-blur lg:hidden">
              <span className="sr-only">{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
              <span aria-hidden="true" className="block h-4 w-5 border-y-2 border-white relative"><span className="absolute inset-x-0 top-1/2 border-t-2 border-white" /></span>
            </button>
          </div>
        </div>
      </header>
        {mobileMenuOpen && (
          <div className="border-t border-white/10 bg-[#10140d]/95 px-5 py-4 backdrop-blur lg:hidden">
            <nav aria-label="Mobile navigation" className="mx-auto grid max-w-7xl gap-1 text-sm font-semibold text-white/80">
              {[
                ['Product', '#features'],
                ['How it works', '/how-it-works'],
                ['About', '/about'],
                ['Security', '/security'],
                ['FAQ', '/faq'],
              ].map(([label, href]) => href.startsWith('#') ? (
                <a key={label} href={href} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-3 hover:bg-white/10 hover:text-white">{label}</a>
              ) : (
                <Link key={label} to={href} onClick={() => setMobileMenuOpen(false)} className="rounded-xl px-3 py-3 hover:bg-white/10 hover:text-white">{label}</Link>
              ))}
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="mt-2 rounded-xl border border-white/15 px-3 py-3 text-white">Sign in</Link>
            </nav>
          </div>
        )}

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
                <Link to="/how-it-works" className="rounded-full border border-white/25 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur hover:bg-white/15">See how it works</Link>
              </div>
            </div>
          </div>
          <div className="absolute bottom-12 right-5 flex items-center gap-2 sm:right-10" aria-label="Hero slideshow controls">
            <button type="button" aria-label="Previous slide" onClick={() => setActive((active - 1 + slides.length) % slides.length)} className="rounded-full border border-white/25 bg-black/20 p-3 text-white backdrop-blur hover:bg-white/15"><ChevronLeft size={18} /></button>
            {slides.map((_, index) => <button type="button" key={index} aria-label={`Go to slide ${index + 1}`} aria-pressed={index === active} onClick={() => setActive(index)} className={`h-1.5 rounded-full transition-all ${index === active ? 'w-10 bg-lime-400' : 'w-5 bg-white/40'}`} />)}
            <button type="button" aria-label="Next slide" onClick={() => setActive((active + 1) % slides.length)} className="rounded-full border border-white/25 bg-black/20 p-3 text-white backdrop-blur hover:bg-white/15"><ChevronRight size={18} /></button>
            <button type="button" aria-label={paused ? 'Resume slideshow' : 'Pause slideshow'} aria-pressed={paused} onClick={() => setPaused(!paused)} className="rounded-full border border-white/25 bg-black/20 p-3 text-white backdrop-blur hover:bg-white/15">{paused ? <Play size={16} /> : <Pause size={16} />}</button>
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
            <Link to="/how-it-works" className="mt-10 inline-flex items-center rounded-full bg-white px-5 py-3 text-sm font-bold text-[#172014]">Read the full onboarding guide <ArrowRight className="ml-2" size={16} /></Link>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">From stockroom to sale</p>
              <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Follow the work, not a pile of disconnected records.</h2>
              <p className="mt-5 leading-7 text-slate-600">Explore the main parts of KampStock and how each supports a real retail or wholesale workflow. This product overview is illustrative, not a live account or customer-data demo.</p>
              <div className="mt-7 grid grid-cols-2 gap-2">
                {[
                  [Store, 'Business overview', 'One operational picture'],
                  [Boxes, 'Products & stock', 'Know what remains'],
                  [ShoppingCart, 'Point of sale', 'Record the sale'],
                  [Truck, 'Purchasing', 'Follow deliveries'],
                  [Users, 'Customers', 'Keep balances clear'],
                  [BarChart3, 'Reports', 'Understand activity'],
                ].map(([Icon, title, description], index) => {
                  const TourIcon = Icon as typeof Store;
                  return <button key={String(title)} type="button" aria-pressed={tourActive === index} onClick={() => setTourActive(index)} className={`rounded-xl border p-3 text-left transition-colors ${tourActive === index ? 'border-[#26351f] bg-[#26351f] text-white' : 'border-[#d8d1c0] bg-white hover:bg-[#ebe7da]'}`}><TourIcon size={19}/><span className="mt-2 block text-sm font-extrabold">{String(title)}</span><span className={`mt-1 block text-xs ${tourActive === index ? 'text-white/65' : 'text-slate-500'}`}>{String(description)}</span></button>;
                })}
              </div>
            </div>
            <div className="overflow-hidden rounded-[1.75rem] border border-[#d8d1c0] bg-white shadow-[0_24px_70px_rgba(32,39,23,.12)]">
              <div className="flex items-center justify-between border-b border-[#e8e4da] bg-[#f8f7f1] px-5 py-4"><div className="flex gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#c86e4b]"/><span className="h-2.5 w-2.5 rounded-full bg-[#d8b55c]"/><span className="h-2.5 w-2.5 rounded-full bg-[#71915b]"/></div><span className="text-xs font-semibold text-slate-500">KampStock · Product overview</span></div>
              <div className="p-6 sm:p-9">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-orange-600">Product area 0{tourActive + 1}</p>
                <h3 className="mt-3 text-3xl font-black tracking-tight">{['Business overview','Products & stock','Point of sale','Purchasing','Customers','Reports'][tourActive]}</h3>
                <p className="mt-4 max-w-lg leading-7 text-slate-600">{[
                  'Bring everyday business activity into one place so owners and managers can see the moving parts.',
                  'Manage the catalogue, quantities and movements that explain where stock came from and where it went.',
                  'Record transactions at the counter while keeping the sale connected to the stock record.',
                  'Follow purchase orders, receiving and supplier records through the buying process.',
                  'Keep customer and supplier relationships close to the commercial history behind the numbers.',
                  'Review recorded sales, expenses and stock information to make better-informed decisions.',
                ][tourActive]}</p>
                <div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-xl border border-[#e8e4da] p-4"><span className="text-xs text-slate-500">Designed for</span><p className="mt-2 font-extrabold">Daily operations</p></div><div className="rounded-xl border border-[#e8e4da] p-4"><span className="text-xs text-slate-500">Works alongside</span><p className="mt-2 font-extrabold">Your team</p></div></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[#ddd7c8] bg-[#ebe7da]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Built with Ugandan trade in mind</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Made for the way local businesses move goods.</h2><p className="mt-5 leading-7 text-slate-600">Retail and wholesale depend on stock accuracy, customer relationships, supplier deliveries and practical ways to keep trading through connectivity interruptions.</p></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Retail & wholesale', 'Workflows for businesses that buy, hold and sell physical goods.'],
                ['Customer credit', 'Keep credit-related activity connected to customer and sales records.'],
                ['Stock locations', 'Track stock within the locations configured for your business.'],
                ['Connectivity awareness', 'An offline POS workflow supports recovery when the network interrupts work.'],
              ].map(([title, text]) => <article key={title} className="rounded-2xl border border-[#d7d0bf] bg-[#f5f2e9] p-5"><h3 className="font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}
              <p className="text-xs leading-5 text-slate-500 sm:col-span-2">EFRIS-related code is not proof of URA registration, certification or approval. Any fiscal integration must be verified for the business and actual provider configuration.</p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
            <div><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Business-critical by design</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Dependable records matter as much as a fast counter.</h2><p className="mt-5 leading-7 text-slate-600">KampStock is engineered with tenant boundaries, controlled access and transaction integrity in mind. Production security also depends on deployment configuration, provider setup and operating practice.</p><Link to="/security" className="mt-6 inline-flex items-center font-bold text-[#344b26] hover:text-orange-600">Read about security & reliability <ArrowRight className="ml-2" size={17}/></Link></div>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [ShieldCheck, 'Access boundaries', 'Authentication and role-based access help separate business responsibilities.'],
                [PackageCheck, 'Transaction integrity', 'Core workflows are designed to keep operational records connected.'],
                [CloudOff, 'Recovery-minded POS', 'Offline workflow and recovery logic support continuity through interruptions.'],
                [BarChart3, 'Tested delivery process', 'Automated CI and monitoring integrations support ongoing engineering quality.'],
              ].map(([Icon, title, text]) => { const FeatureIcon = Icon as typeof Store; return <article key={String(title)} className="rounded-2xl border border-[#ddd7c8] bg-white p-6"><FeatureIcon className="text-[#536c2c]" size={23}/><h3 className="mt-4 font-extrabold">{String(title)}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{String(text)}</p></article>; })}
            </div>
          </div>
        </section>

        <section className="border-y border-[#ddd7c8] bg-white">
          <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
            <div className="max-w-2xl"><p className="text-xs font-black uppercase tracking-[0.2em] text-orange-600">Questions, answered plainly</p><h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">Know what you are signing up for.</h2></div>
            <div className="mt-10 divide-y divide-[#e8e4da] border-y border-[#e8e4da]">
              {[
                ['Who is KampStock for?', 'KampStock is designed for retail shops, wholesalers and stock-based businesses that need sales, inventory, purchasing and business records to work together.'],
                ['Can I use the POS when connectivity drops?', 'KampStock includes an offline POS workflow. Validate it with your team and devices before relying on it for critical trading.'],
                ['Does KampStock support EFRIS?', 'The codebase includes EFRIS-related structures, but that is not proof of URA registration, certification or approval. Actual readiness requires external verification.'],
              ].map(([question, answer]) => <details key={question} className="group py-5"><summary className="cursor-pointer list-none pr-8 text-base font-extrabold sm:text-lg">{question}<span aria-hidden="true" className="float-right text-orange-600 transition-transform group-open:rotate-45">+</span></summary><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{answer}</p></details>)}
            </div>
            <Link to="/faq" className="mt-6 inline-flex items-center text-sm font-bold text-[#344b26] hover:text-orange-600">Visit all FAQs <ArrowRight className="ml-2" size={16}/></Link>
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
