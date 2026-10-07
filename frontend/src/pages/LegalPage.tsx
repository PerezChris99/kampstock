import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Store } from 'lucide-react';

const documents = {
  privacy: {
    title: 'Privacy',
    intro: 'KampStock is designed to keep business information within the tenant and user boundaries defined by the platform. This page describes the intended handling of information and should be read alongside the actual service configuration and applicable law.',
    sections: [
      ['Information we handle', 'Business registration details, user account information, products, customers, suppliers, sales, purchases, expenses, stock movements and other information entered by an authorized business user.'],
      ['Why it is used', 'To provide the KampStock service, authenticate users, maintain business records, generate operational reports, process subscriptions and protect the service from misuse.'],
      ['Tenant separation', 'KampStock is a multi-tenant system. Business records are associated with their tenant and application controls are designed to prevent one business from accessing another business’s data.'],
      ['Service providers', 'Payment processing, hosting, monitoring and other infrastructure providers may process information where required to operate the service. Production configuration determines which providers are active.'],
      ['Your responsibilities', 'Business administrators are responsible for entering accurate information, controlling user access and ensuring that their use of the service complies with applicable privacy and data-protection requirements.'],
      ['Questions and requests', 'For privacy, access, correction, retention or deletion questions, contact the service operator through the support channel provided to your business.'],
    ],
  },
  terms: {
    title: 'Terms of use',
    intro: 'KampStock is business software for inventory, point-of-sale, purchasing, customer credit and related operations. Access to the platform is provided subject to permission and the terms agreed with the service operator.',
    sections: [
      ['Authorized use', 'You may use KampStock only for legitimate business operations and only through accounts and tenants you are authorized to access.'],
      ['Account security', 'Business administrators are responsible for user invitations, roles, passwords and protecting credentials. Do not share accounts or deliberately bypass access controls.'],
      ['Business records', 'KampStock helps record and organize business information; it does not replace professional accounting, tax, legal or fiscal advice. Businesses remain responsible for the accuracy and lawful use of their records.'],
      ['Payments and subscriptions', 'Subscription availability, pricing, payment processing and renewal are subject to the commercial plan applicable to the business. Third-party payment services may have their own terms.'],
      ['Availability', 'We aim for reliable service and production-grade operation, but no internet service can promise uninterrupted availability. Planned maintenance, infrastructure incidents and third-party outages may affect availability.'],
      ['Intellectual property', 'KampStock software, branding, documentation and original materials remain protected intellectual property. Reproduction, redistribution, resale, deployment for third parties, modification or commercial reuse requires prior written permission unless expressly authorized in writing.'],
    ],
  },
  billing: {
    title: 'Billing & subscription',
    intro: 'KampStock subscription access is tied to the plan and commercial terms applicable to the business. Payment processing may involve third-party providers and is subject to their service availability and terms.',
    sections: [
      ['Subscription status', 'Access to subscription features depends on the status recorded for the business. Expiry, suspension, renewal and reactivation are controlled by the service configuration and applicable plan terms.'],
      ['Payment processing', 'KampStock includes Pesapal billing integration. Production payment processing depends on the merchant account, credentials, callback/IPN configuration and successful end-to-end provider verification.'],
      ['Payment records', 'Subscription and payment status records are maintained to support entitlement decisions, reconciliation, support and audit requirements.'],
      ['Third-party services', 'Payment providers may impose their own fees, processing rules, availability limits and terms. KampStock does not represent third-party services as being under its direct operational control.'],
      ['Commercial terms', 'Pricing, billing frequency, trial periods, grace periods, refunds and cancellation terms are determined by the commercial agreement presented to or accepted by the business.'],
    ],
  },
  acceptable: {
    title: 'Acceptable use',
    intro: 'KampStock is intended to support legitimate commerce. The following rules protect businesses, their customers and the integrity of the service.',
    sections: [
      ['Do not abuse the service', 'Do not probe, overload, scrape, reverse engineer, bypass rate limits or attempt to compromise the application, infrastructure or another tenant.'],
      ['Do not misuse another business’s data', 'Access only the tenant and records you are authorized to access. Attempts to enumerate, export or alter another tenant’s information are prohibited.'],
      ['Keep credentials private', 'Do not sell, publish, share or intentionally expose passwords, session tokens, payment credentials or other secrets.'],
      ['Use lawful business data', 'Do not use KampStock to facilitate fraud, money laundering, theft, unauthorized payments or other unlawful activity.'],
      ['Report security issues responsibly', 'If you discover a security weakness, report it privately to the service operator with enough detail to reproduce and investigate the issue.'],
    ],
  },
} as const;

export default function LegalPage() {
  const { type = 'privacy' } = useParams();
  const document = documents[type as keyof typeof documents] ?? documents.privacy;
  return <div className="min-h-screen bg-[#f5f2e9] text-[#172014]">
    <header className="border-b border-[#ddd7c8] bg-[#172014] text-white">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-lime-400 text-slate-950"><Store size={17}/></span><strong>KampStock</strong></Link>
        <Link to="/" className="text-sm text-white/70 hover:text-white">Back to site</Link>
      </div>
    </header>
    <main className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><ArrowLeft size={15}/> KampStock</Link>
      <p className="mt-10 text-xs font-black uppercase tracking-[0.2em] text-orange-600">Legal</p>
      <h1 className="mt-3 text-5xl font-black tracking-tight">{document.title}</h1>
      <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">{document.intro}</p>
      <div className="mt-14 divide-y divide-[#ddd7c8] border-y border-[#ddd7c8]">
        {document.sections.map(([title, text]) => <section key={title} className="py-8"><h2 className="text-xl font-extrabold">{title}</h2><p className="mt-3 leading-7 text-slate-600">{text}</p></section>)}
      </div>
      <p className="mt-10 text-xs leading-6 text-slate-500">This information is provided for service transparency and does not replace advice from a qualified legal or privacy professional for your specific business.</p>
    </main>
  </div>;
}
