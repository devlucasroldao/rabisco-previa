import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export { MEDIA_BUCKET } from "../media";

let client: SupabaseClient | null = null;

// Cliente com a service_role: ignora o RLS, então só pode existir no servidor.
// Devolve null quando o ambiente não está configurado (modo demo).
export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  client ??= createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
