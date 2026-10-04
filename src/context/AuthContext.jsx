import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import posthog, { canCapturePostHog } from '../lib/posthog';
import { setErrorReporterToken } from '../lib/errorReporter';
import { fetchProfile } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Id of the user whose profile has finished loading. Until it matches the
  // signed-in user, role checks (e.g. admin) wait instead of redirecting.
  const [profileFor, setProfileFor] = useState(null);

  async function loadProfile(u) {
    if (!u) { setProfile(null); setProfileFor(null); return; }
    try {
      const p = await fetchProfile(u.id);
      setProfile(p);
      if (canCapturePostHog()) {
        posthog.identify(u.id);
      }
    } catch {
      setProfile(null);
    } finally {
      setProfileFor(u.id);
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null).finally(() => setLoading(false));
    });

    // Cached here rather than read inside the error reporter: an error during
    // page unload has no time to await a session lookup, and without the token
    // the report is filed anonymously.
    setErrorReporterToken(session?.access_token ?? null);

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setErrorReporterToken(session?.access_token ?? null);
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const isAdmin = profile?.role === 'admin';
  const profileLoading = Boolean(user) && profileFor !== user.id;

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading: loading || profileLoading, refreshProfile: () => loadProfile(user) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
