import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import posthog, { isPostHogConfigured } from '../lib/posthog';
import { fetchProfile } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(u) {
    if (!u) { setProfile(null); return; }
    try {
      const p = await fetchProfile(u.id);
      setProfile(p);
      if (isPostHogConfigured) {
        posthog.identify(u.id, {
          email: u.email,
          name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          phone: p.phone,
          role: p.role,
        });
      }
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null).finally(() => setLoading(false));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, refreshProfile: () => loadProfile(user) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
