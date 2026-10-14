// Leitura e validação das variáveis do Supabase. Sem "server-only": o
// navegador, o proxy.ts e os scripts também passam por aqui.
//
// As mensagens dizem qual variável tem problema e nunca mostram o valor.

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

const QUOTES = ['"', "'", "`"];

export function cleanEnvValue(name: string, raw: string | undefined): string {
  const value = raw?.trim() ?? "";
  if (!value) {
    throw new SupabaseConfigError(`${name} está vazia ou não foi definida.`);
  }
  if (QUOTES.includes(value[0]) || QUOTES.includes(value[value.length - 1])) {
    throw new SupabaseConfigError(`${name} tem aspas nas pontas. Tire as aspas do valor.`);
  }
  return value;
}

export function cleanEnvUrl(name: string, raw: string | undefined): string {
  const value = cleanEnvValue(name, raw);
  if (!value.startsWith("https://")) {
    throw new SupabaseConfigError(`${name} precisa começar com https://.`);
  }
  if (value.endsWith("/")) {
    throw new SupabaseConfigError(`${name} não pode terminar com "/".`);
  }
  return value;
}

// URL e chave pública (anon). O acesso a process.env é literal de propósito:
// o Next só embute NEXT_PUBLIC_* no bundle do navegador quando o nome aparece
// por extenso.
export function getSupabasePublicEnv(): { url: string; anonKey: string } {
  return {
    url: cleanEnvUrl("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: cleanEnvValue(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}
