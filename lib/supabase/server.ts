import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { cleanEnvUrl, cleanEnvValue } from "./env";

export { MEDIA_BUCKET } from "../media";

let client: SupabaseClient | null = null;

// Cliente com a service_role: ignora o RLS, então só pode existir no servidor.
// Devolve null quando o ambiente não está configurado (modo demo); variável
// preenchida mas mal formatada lança SupabaseConfigError.
export function getSupabaseAdmin(): SupabaseClient | null {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    return null;
  }

  if (!client) {
    const url = cleanEnvUrl(
      "NEXT_PUBLIC_SUPABASE_URL",
      process.env.NEXT_PUBLIC_SUPABASE_URL,
    );
    const serviceRoleKey = cleanEnvValue(
      "SUPABASE_SERVICE_ROLE_KEY",
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
    client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
