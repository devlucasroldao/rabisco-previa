// Prova que o público (anon key) não lê as tabelas nem o bucket direto.
// Uso: pnpm check:anon [caminho/de/um/arquivo/no/bucket]
//
// Usa só a anon key, a mesma que qualquer visitante pode ver. O caminho é
// opcional (o pnpm seed imprime um) e testa um arquivo que existe de verdade.

import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireEnv } from "./env";

const BUCKET = "media";
const TABLES = ["clients", "presentations", "posts"];

loadEnv();

const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let leaks = 0;

function report(ok: boolean, what: string, detail: string) {
  if (!ok) leaks++;
  console.log(`${ok ? "OK    " : "VAZOU "} ${what}: ${detail}`);
}

async function main() {
  for (const table of TABLES) {
    const { data, error } = await supabase.from(table).select("*").limit(5);
    if (error) report(true, `select em ${table}`, `erro "${error.message}"`);
    else report(data.length === 0, `select em ${table}`, `${data.length} linha(s)`);
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
    console.error(`\n${leaks} acesso(s) indevido(s) com a anon key.`);
    process.exit(1);
  }
  console.log("\nNada acessível com a anon key.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
