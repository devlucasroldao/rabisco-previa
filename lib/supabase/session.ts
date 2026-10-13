import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export const LOGIN_PATH = "/admin/login";

// Cliente com a anon key e a sessão da equipe nos cookies: quem manda é o RLS.
// Devolve null quando o ambiente não está configurado (modo demo).
export async function getSupabaseSession(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;

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
  if (!supabase) redirect(LOGIN_PATH);

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect(LOGIN_PATH);

  return { supabase, user: data.user };
}
