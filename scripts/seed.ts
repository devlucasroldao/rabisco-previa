// Cria uma apresentação de exemplo da Conecte no Supabase, com os arquivos de
// public/sample/. Uso: pnpm seed
//
// Rodar de novo cria outra apresentação e reaproveita o cliente (pelo handle).

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { samplePresentations } from "../lib/sample-data";
import { loadEnv, requireEnv } from "./env";

const BUCKET = "media";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
};

loadEnv();

const supabase = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

// "/sample/paz.jpg" -> envia public/sample/paz.jpg para {folder}/paz.jpg
async function upload(publicUrl: string, folder: string): Promise<string> {
  const fileName = path.basename(publicUrl);
  const contentType = CONTENT_TYPES[path.extname(fileName).toLowerCase()];
  if (!contentType) throw new Error(`Tipo de arquivo não suportado: ${fileName}`);

  const file = await readFile(path.join(process.cwd(), "public", publicUrl));
  const storagePath = `${folder}/${fileName}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, { contentType, upsert: true });
  if (error) throw new Error(`Upload de ${fileName} falhou: ${error.message}`);

  console.log(`  enviado ${storagePath}`);
  return storagePath;
}

async function findOrCreateClient(sample: (typeof samplePresentations)[number]["client"]) {
  const { data: existing, error: findError } = await supabase
    .from("clients")
    .select("id")
    .eq("handle", sample.handle)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (findError) throw new Error(`Busca do cliente falhou: ${findError.message}`);

  if (existing) {
    console.log(`Cliente @${sample.handle} já existe, reaproveitando.`);
    return existing.id as string;
  }

  const id = randomUUID();
  console.log(`Criando o cliente @${sample.handle}`);
  const avatarPath = await upload(sample.avatarUrl, `clients/${id}`);
  const { error } = await supabase.from("clients").insert({
    id,
    name: sample.name,
    handle: sample.handle,
    bio: sample.bio,
    avatar_path: avatarPath,
  });
  if (error) throw new Error(`Criação do cliente falhou: ${error.message}`);
  return id;
}

async function main() {
  const sample = samplePresentations.find((p) => p.token === "demo");
  if (!sample) throw new Error("Apresentação demo não encontrada em sample-data.ts");

  const clientId = await findOrCreateClient(sample.client);

  const presentationId = randomUUID();
  const token = nanoid(12);
  const folder = `presentations/${presentationId}`;

  console.log(`Enviando a mídia de "${sample.title}"`);
  const posts = [];
  for (const post of sample.posts) {
    const media = [];
    for (const item of post.media) {
      media.push({
        path: await upload(item.url, folder),
        kind: item.kind,
        ...(item.poster ? { poster: await upload(item.poster, folder) } : {}),
      });
    }
    posts.push({
      presentation_id: presentationId,
      position: post.position,
      type: post.type,
      caption: post.caption,
      media,
    });
  }

  const { error: presentationError } = await supabase
    .from("presentations")
    .insert({ id: presentationId, client_id: clientId, title: sample.title, token });
  if (presentationError) {
    throw new Error(`Criação da apresentação falhou: ${presentationError.message}`);
  }

  const { error: postsError } = await supabase.from("posts").insert(posts);
  if (postsError) {
    // Não deixa pra trás uma apresentação sem posts.
    await supabase.from("presentations").delete().eq("id", presentationId);
    throw new Error(`Criação dos posts falhou: ${postsError.message}`);
  }

  console.log(`\nPronto: ${posts.length} posts em "${sample.title}".`);
  console.log(`\n  http://localhost:3000/p/${token}\n`);
  console.log("Pra provar que o público não acessa nada direto:");
  console.log(`  pnpm check:anon ${posts[0].media[0].path}\n`);
}

main().catch((error) => {
  console.error(`\nSeed falhou. ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
