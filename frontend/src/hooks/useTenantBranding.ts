import { useEffect, useState } from 'react';
import axios from 'axios';
import { getSubdomain } from '../utils/subdomain';

interface TenantBranding {
  id: number;
  name: string;
  subdomain: string;
  plan: string;
}

/**
 * Resolves tenant branding for the current subdomain.
 * Returns null when there is no subdomain or the subdomain is unknown.
 */
export function useTenantBranding() {
  const [tenant, setTenant] = useState<TenantBranding | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const subdomain = getSubdomain();
    if (!subdomain) return;

    setLoading(true);
    const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    axios
      .get<TenantBranding>(`${base}/tenants/subdomain/${encodeURIComponent(subdomain)}`)
      .then((r) => setTenant(r.data))
      .catch(() => setTenant(null))
      .finally(() => setLoading(false));
  }, []);

  return { tenant, loading };
}
