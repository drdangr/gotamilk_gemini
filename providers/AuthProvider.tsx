import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { ensureProfile } from '../services/profile';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  signInWithProvider: (provider: 'google' | 'github') => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const hasSupabase = Boolean(supabase);

  useEffect(() => {
    if (!hasSupabase) return;
    let isMounted = true;
    supabase!.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
    });
    const { data: sub } = supabase!.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession ?? null);
    });
    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, [hasSupabase]);

  useEffect(() => {
    if (!session?.user) return;
    ensureProfile(session.user).catch(() => {});
  }, [session?.user]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    async signInWithProvider(provider) {
      if (!hasSupabase) {
        // eslint-disable-next-line no-alert
        alert('Supabase не настроен. Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local');
        return;
      }
      await supabase!.auth.signInWithOAuth({ provider });
    },
    async signInWithEmail(email: string) {
      if (!hasSupabase) {
        // eslint-disable-next-line no-alert
        alert('Supabase не настроен. Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local');
        return;
      }
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
      const { error } = await supabase!.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) {
        // eslint-disable-next-line no-alert
        alert(`Не удалось отправить ссылку для входа: ${error.message}`);
      } else {
        // eslint-disable-next-line no-alert
        alert('Мы отправили ссылку для входа на вашу почту. Проверьте inbox.');
      }
    },
    async signOut() {
      if (!hasSupabase) return;
      await supabase!.auth.signOut();
    },
  }), [session, hasSupabase]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


