import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSupabasePublicEnv } from "./env";

export const LOGIN_PATH = "/admin/login";

// Cliente com a anon key e a sessão da equipe nos cookies: quem manda é o RLS.
// Lança SupabaseConfigError quando a URL ou a chave pública estão ausentes ou
// mal formatadas.
export async function getSupabaseSession(): Promise<SupabaseClient> {
  const { url, anonKey } = getSupabasePublicEnv();

  // O cliente de auth lê o relógio pra conferir a validade do token, e isso
  // só pode acontecer com uma requisição de verdade, nunca num pré-render.
  await connection();
  const cookieStore = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component não grava cookie: quem renova a sessão é o proxy.ts.
        }
      },
    },
  });
}

// Toda leitura e toda Server Action do painel passa por aqui. O getUser()
// confere o token com o Supabase em vez de confiar no cookie.
export async function requireStaff(): Promise<{
  supabase: SupabaseClient;
  user: User;
}> {
  const supabase = await getSupabaseSession();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect(LOGIN_PATH);

  return { supabase, user: data.user };
}
