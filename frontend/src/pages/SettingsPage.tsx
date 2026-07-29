import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Mail, Phone, MapPin, BadgeCheck, FileText, Save, Check } from 'lucide-react';
import api from '../lib/api';

const BUSINESS_TYPES = [
  { value: 'retail', label: 'Retail Shop' },
  { value: 'wholesale', label: 'Wholesale / Distribution' },
  { value: 'pharmacy', label: 'Pharmacy / Medical' },
  { value: 'restaurant', label: 'Restaurant / Food & Beverage' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'hardware', label: 'Hardware / Building' },
  { value: 'clothing', label: 'Clothing / Apparel' },
  { value: 'supermarket', label: 'Supermarket / Grocery' },
  { value: 'agriculture', label: 'Agriculture / Farm Supply' },
  { value: 'other', label: 'Other' },
];

interface Profile {
  id: number;
  name: string;
  subdomain: string;
  plan: string;
  ownerEmail: string | null;
  ownerPhone: string | null;
  address: string | null;
  businessType: string | null;
  description: string | null;
  trialEndsAt: string | null;
  planExpiresAt: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: profile, isLoading, isError, refetch } = useQuery<Profile>({
    queryKey: ['tenant-profile'],
    queryFn: () => api.get('/tenants/profile').then(r => r.data),
  });

  const [form, setForm] = useState<Partial<Profile>>({});

  const mutation = useMutation({
    mutationFn: (data: Partial<Profile>) => api.patch('/tenants/profile', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-profile'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  if (isLoading) return <div className="p-8 text-gray-400">Loading profile...</div>;
  if (isError || !profile)
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <p className="text-gray-700 font-medium mb-1">Could not load your business profile.</p>
        <p className="text-sm text-gray-500 mb-4">Please check your connection and try again.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
        >
          Retry
        </button>
      </div>
    );

  const val = (field: keyof Profile) =>
    field in form ? (form[field] as string) ?? '' : (profile[field] as string) ?? '';

  const set = (field: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSave = () => {
    if (Object.keys(form).length === 0) return;
    mutation.mutate(form);
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
          <Building2 className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Business Profile</h1>
          <p className="text-sm text-gray-500">Update your business contact info and description</p>
        </div>
      </div>

      {/* Read-only info */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Account Info (read-only)</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Business Name</p>
            <p className="font-medium text-gray-900 dark:text-white">{profile.name}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Subdomain</p>
            <p className="font-medium text-gray-900 dark:text-white">{profile.subdomain}.kampstock.com</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Current Plan</p>
            <p className="font-medium text-gray-900 dark:text-white capitalize">{profile.plan}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs mb-0.5">Registered</p>
            <p className="font-medium text-gray-900 dark:text-white">
              {new Date(profile.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* Editable fields */}
      <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-5 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Contact & Identity</h2>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" /> Owner Email
          </label>
          <input
            type="email"
            value={val('ownerEmail')}
            onChange={set('ownerEmail')}
            placeholder="owner@yourbusiness.com"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" /> Owner Phone
          </label>
          <input
            type="tel"
            value={val('ownerPhone')}
            onChange={set('ownerPhone')}
            placeholder="+256 7XX XXX XXX"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" /> Business Address
          </label>
          <input
            type="text"
            value={val('address')}
            onChange={set('address')}
            placeholder="Street, City, District"
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
            <BadgeCheck className="w-3.5 h-3.5" /> Nature of Business
          </label>
          <select
            value={val('businessType')}
            onChange={set('businessType')}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {BUSINESS_TYPES.map(bt => (
              <option key={bt.value} value={bt.value}>{bt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" /> Business Description
          </label>
          <textarea
            value={val('description')}
            onChange={set('description')}
            placeholder="Brief description of what your business does..."
            rows={3}
            maxLength={300}
            className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <p className="text-xs text-gray-400 text-right">{val('description').length}/300</p>
        </div>

        <button
          onClick={handleSave}
          disabled={mutation.isPending || Object.keys(form).length === 0}
          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40'
          }`}
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Changes</>}
        </button>
      </div>
    </div>
  );
}
