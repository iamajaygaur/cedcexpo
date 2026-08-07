/**
 * Public Supabase env helpers.
 * New Supabase dashboards label the browser key "publishable";
 * this app historically expects NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */

export function getSupabaseUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url || url.includes("YOUR_PROJECT")) {
    return undefined;
  }
  return url;
}

/** Anon / publishable key for browser + SSR clients (RLS-gated). */
export function getSupabaseAnonKey(): string | undefined {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!key || key.startsWith("your_")) {
    return undefined;
  }
  return key;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
