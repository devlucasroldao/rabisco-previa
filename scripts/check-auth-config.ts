// Confere se a URL e a chave pública do .env.local são aceitas pelo Supabase.
// Uso: pnpm check:auth
//
// Faz um GET em /auth/v1/settings com a chave pública no header apikey e
// imprime só o status HTTP e OK ou FALHOU: nunca a URL nem a chave.

import { getSupabasePublicEnv, SupabaseConfigError } from "../lib/supabase/env";
import { loadEnv } from "./env";

loadEnv();

function fail(detail: string): never {
  console.log(`FALHOU ${detail}`);
  process.exit(1);
}

async function main() {
  let env: ReturnType<typeof getSupabasePublicEnv>;
  try {
    env = getSupabasePublicEnv();
  } catch (error) {
    if (error instanceof SupabaseConfigError) fail(error.message);
    throw error;
  }

  let response: Response;
  try {
    response = await fetch(`${env.url}/auth/v1/settings`, {
      headers: { apikey: env.anonKey },
    });
  } catch {
    // O erro do fetch pode citar o endereço: fica só o aviso.
    fail("sem resposta do Supabase (rede ou endereço da URL)");
  }

  if (!response.ok) fail(`HTTP ${response.status}`);
  console.log(`OK     HTTP ${response.status}`);
}

main().catch(() => fail("erro inesperado"));
