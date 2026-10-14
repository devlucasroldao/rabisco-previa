// Lista (sem apagar nada) o que rodadas do e2e deixaram no Supabase: clientes
// "Teste E2E <hash>" com @ e2e_<hash>, apresentações, arquivos e usuários de
// teste. Uso: pnpm e2e:leftovers

import { createClient } from "@supabase/supabase-js";
import { loadEnv, requireEnv } from "./env";

loadEnv();

const admin = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// Os dois sinais juntos: o nome e o @ que só o teste usa.
const TEST_NAME = /^Teste E2E [0-9a-f]{8}$/;
const TEST_HANDLE = /^e2e_[0-9a-f]{8}$/;
const TEST_EMAIL = /^e2e-[0-9a-f]{8}@rabisco-previa[.]test$/;

async function countFiles(folder: string): Promise<number> {
  const { data } = await admin.storage.from("media").list(folder, { limit: 1000 });
  return (data ?? []).filter((file) => file.metadata).length;
}

async function main() {
  const { data: clients, error } = await admin
    .from("clients")
    .select("id, name, handle, created_at, presentations(id, title, created_at)")
    .like("name", "Teste E2E%")
    .order("created_at");
  if (error) throw new Error(error.message);

  console.log(`Clientes com nome "Teste E2E…": ${clients.length}`);
  for (const client of clients) {
    const sure = TEST_NAME.test(client.name) && TEST_HANDLE.test(client.handle);
    const files = await countFiles(`clients/${client.id}`);
    console.log(
      `- ${client.name} (@${client.handle}) criado em ${client.created_at}${sure ? "" : "  ATENÇÃO: não segue o padrão do teste"}`,
    );
    console.log(`    id ${client.id}, ${files} arquivo(s) em clients/${client.id}`);
    for (const presentation of client.presentations) {
      const count = await countFiles(`presentations/${presentation.id}`);
      console.log(`    apresentação "${presentation.title}" (${presentation.id}), ${count} arquivo(s)`);
    }
  }

  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const testUsers = (users?.users ?? []).filter((user) => TEST_EMAIL.test(user.email ?? ""));
  console.log(`\nUsuários de teste (e2e-…@rabisco-previa.test): ${testUsers.length}`);
  for (const user of testUsers) console.log(`- ${user.email} criado em ${user.created_at}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
