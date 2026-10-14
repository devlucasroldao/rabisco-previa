// Prova que o público (anon key) não lê as tabelas nem o bucket direto, nem
// chama as funções do medidor de armazenamento do painel.
// Uso: pnpm check:anon [caminho/de/um/arquivo/no/bucket]
//
// Usa só a anon key, a mesma que qualquer visitante pode ver. O caminho é
// opcional (o pnpm seed imprime um) e testa um arquivo que existe de verdade.

import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireEnv } from "./env";

const BUCKET = "media";
const TABLES = ["clients", "presentations", "posts"];
const MISSING_TABLE = ["PGRST205", "42P01"];
// Funções do medidor do painel: só authenticated pode chamar.
const FUNCTIONS = ["media_usage_bytes", "media_usage_by_presentation"];
const MISSING_FUNCTION = ["PGRST202", "42883"];

loadEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let leaks = 0;

function report(ok: boolean, what: string, detail: string) {
  if (!ok) leaks++;
  console.log(`${ok ? "OK    " : "FALHOU"} ${what}: ${detail}`);
}

async function main() {
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*").limit(5);
    // Tabela inexistente não prova nada: a migration não foi aplicada.
    if (error && MISSING_TABLE.includes(error.code)) {
      report(false, `select em ${table}`, `a tabela não existe (${error.code}). Rode o db push antes.`);
    } else if (error) report(true, `select em ${table}`, `erro ${error.code} "${error.message}"`);
    else report(data.length === 0, `select em ${table}`, `${data.length} linha(s)`);
  }

  for (const fn of FUNCTIONS) {
    const { data, error } = await supabase.rpc(fn);
    // Função inexistente não prova nada: a migration não foi aplicada.
    if (error && MISSING_FUNCTION.includes(error.code)) {
      report(false, `rpc ${fn}`, `a função não existe (${error.code}). Rode o db push antes.`);
    } else if (error) report(true, `rpc ${fn}`, `erro ${error.code} "${error.message}"`);
    else report(false, `rpc ${fn}`, `respondeu ${JSON.stringify(data).slice(0, 60)}`);
  }

  const { data: listed, error: listError } = await supabase.storage
    .from(BUCKET)
    .list("presentations");
  if (listError) report(true, "listar o bucket", `erro "${listError.message}"`);
  else report(listed.length === 0, "listar o bucket", `${listed.length} item(ns)`);

  const filePath = process.argv[2];
  if (!filePath) {
    console.log("\nSem caminho de arquivo: o teste das URLs sem assinatura foi pulado.");
  } else {
    const attempts: { what: string; path: string; headers: Record<string, string> }[] = [
      { what: "URL pública", path: `object/public/${BUCKET}/${filePath}`, headers: {} },
      { what: "URL sem assinatura", path: `object/sign/${BUCKET}/${filePath}`, headers: {} },
      {
        what: "download com a anon key",
        path: `object/${BUCKET}/${filePath}`,
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      },
    ];
    for (const attempt of attempts) {
      const response = await fetch(`${url}/storage/v1/${attempt.path}`, {
        headers: attempt.headers,
      });
      report(!response.ok, attempt.what, `HTTP ${response.status}`);
    }
  }

  if (leaks > 0) {
    console.error(`\n${leaks} verificação(ões) falharam.`);
    process.exit(1);
  }
  console.log("\nNada acessível com a anon key.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
