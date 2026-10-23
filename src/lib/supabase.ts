import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/* Client Supabase — configuré UNIQUEMENT via variables d'environnement.
   Aucune URL ni clé n'est codée en dur. Sur Vercel : renseigner
   VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les variables d'environnement. */

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return client;
}
