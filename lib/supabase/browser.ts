import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "./env";

let client: SupabaseClient | null = null;

// Cliente do navegador: anon key + a sessão da equipe (cookies). Serve pro
// upload direto no bucket, que não pode passar pelas funções do Next.
export function getSupabaseBrowser(): SupabaseClient {
  if (!client) {
    const { url, anonKey } = getSupabasePublicEnv();
    client = createBrowserClient(url, anonKey);
  }
  return client;
}
