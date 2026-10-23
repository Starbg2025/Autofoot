import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import { SUPER_ADMIN_EMAIL, STAFF_ROLES } from '../lib/constants';
import type { Profile, UserRole } from '../types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: UserRole;
  loading: boolean;
  isStaff: boolean;
  isSuperAdmin: boolean;
  can: (permission: string) => boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function friendlyError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Adresse e-mail ou mot de passe incorrect.';
  if (/user already registered/i.test(message)) return 'Un compte existe déjà avec cette adresse e-mail.';
  if (/password should be at least/i.test(message)) return 'Le mot de passe doit comporter au moins 6 caractères.';
  if (/email.*not.*confirm/i.test(message)) return 'Veuillez confirmer votre adresse e-mail avant de vous connecter.';
  return message || 'Une erreur est survenue. Veuillez réessayer.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (u: User | null): Promise<Profile | null> => {
    const sb = getSupabase();
    if (!sb || !u) return null;
    try {
      const { data, error } = await sb.from('profiles').select('*').eq('id', u.id).maybeSingle();
      if (error) throw error;
      if (data) return data as Profile;
      // Premier passage : créer le profil membre.
      const displayName =
        (u.user_metadata?.display_name as string | undefined) ||
        u.email?.split('@')[0] ||
        'Membre';
      const { data: created, error: insertError } = await sb
        .from('profiles')
        .insert({ id: u.id, email: u.email, display_name: displayName, role: 'member', permissions: {} })
        .select()
        .single();
      if (insertError) throw insertError;
      return created as Profile;
    } catch {
      return null;
    }
  }, []);

  const promoteIfSuperAdmin = useCallback(async (u: User | null) => {
    const sb = getSupabase();
    if (!sb || !u || u.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) return;
    // Vérification côté serveur (fonction SECURITY DEFINER) : seul le compte
    // dont l'e-mail correspond obtient le rôle super_admin.
    await sb.rpc('promote_super_admin');
  }, []);

  const refreshProfile = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.auth.getUser();
    const u = data.user;
    if (u) {
      await promoteIfSuperAdmin(u);
      setProfile(await loadProfile(u));
    }
  }, [loadProfile, promoteIfSuperAdmin]);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setLoading(false);
      return;
    }
    let mounted = true;
    (async () => {
      const { data } = await sb.auth.getSession();
      if (!mounted) return;
      const u = data.session?.user ?? null;
      setSession(data.session);
      setUser(u);
      if (u) {
        await promoteIfSuperAdmin(u);
        setProfile(await loadProfile(u));
      }
      setLoading(false);
    })();
    const { data: sub } = sb.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;
      const u = newSession?.user ?? null;
      setSession(newSession);
      setUser(u);
      if (u) {
        await promoteIfSuperAdmin(u);
        setProfile(await loadProfile(u));
      } else {
        setProfile(null);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile, promoteIfSuperAdmin]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const sb = getSupabase();
    if (!sb) return { error: 'Le service d’authentification n’est pas configuré.' };
    const { error } = await sb.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: displayName.trim() } },
    });
    return { error: error ? friendlyError(error.message) : null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const sb = getSupabase();
    if (!sb) return { error: 'Le service d’authentification n’est pas configuré.' };
    // Supabase Auth vérifie le mot de passe côté serveur (bcrypt).
    // Aucune session artisanale, aucun mot de passe en clair stocké.
    const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
    return { error: error ? friendlyError(error.message) : null };
  }, []);

  const signOut = useCallback(async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, []);

  const role: UserRole = profile?.role ?? 'member';
  const isStaff = (STAFF_ROLES as readonly string[]).includes(role);
  const isSuperAdmin = role === 'super_admin';

  const can = useCallback(
    (permission: string): boolean => {
      if (isSuperAdmin || role === 'admin') return true;
      if (role === 'editor') return profile?.permissions?.[permission] === true;
      return false;
    },
    [isSuperAdmin, role, profile],
  );

  const value = useMemo<AuthState>(
    () => ({
      user, session, profile, role, loading, isStaff, isSuperAdmin, can,
      signUp, signIn, signOut, refreshProfile,
    }),
    [user, session, profile, role, loading, isStaff, isSuperAdmin, can, signUp, signIn, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>.');
  return ctx;
}
