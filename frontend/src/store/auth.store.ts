import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: number;
  name: string;
  username: string;
  role: string;
  roleId?: number;
  tenantId: number;
  isSuperAdmin?: boolean;
}

interface AuthState {
  user: User | null;
  setUser: (user: User) => void;
  // Legacy alias so existing callers (LoginPage) still compile
  setAuth: (user: User, _accessToken?: string, _refreshToken?: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      setUser: (user) => set({ user }),
      setAuth: (user) => set({ user }),
      logout: () => {
        // Clear any stale tokens that may exist from before the httpOnly migration
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({ user: null });
      },
      isAuthenticated: () => !!get().user,
    }),
    { name: 'kampstock-auth' }
  )
);
