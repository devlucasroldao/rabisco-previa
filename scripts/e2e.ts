// Teste de ponta a ponta do painel, contra o Supabase real e um app rodando.
//
//   pnpm build && pnpm start        (em outro terminal, com CRON_SECRET definido)
//   pnpm test:e2e
//
// Cria um usuário temporário pela API admin (service_role), com senha
// aleatória que só existe na memória, e no final apaga o usuário e tudo o que
// o teste criou no banco e no bucket, mesmo quando algum passo falha.
//
// Variáveis opcionais: E2E_BASE_URL (padrão http://localhost:3000),
// E2E_BROWSER (canal do Playwright, padrão msedge) e CRON_SECRET (o mesmo do
// app; sem ele os passos do keep-alive com segredo são pulados).

import { randomBytes } from "node:crypto";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Browser, type Page } from "playwright-core";
import { loadEnv, requireEnv } from "./env";

loadEnv();

const BASE_URL = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BUCKET = "media";
const DELETE_POST_WARNING =
  "Os números dos posts seguintes vão mudar. Se o link já foi enviado ao cliente, crie uma nova apresentação em vez de apagar posts.";

const admin = createClient(
  requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const run = randomBytes(4).toString("hex");
const TEST_EMAIL = /^e2e-[0-9a-f]{8}@rabisco-previa[.]test$/;
const email = `e2e-${run}@rabisco-previa.test`;
const password = randomBytes(24).toString("base64url");
const handle = `e2e_${run}`;

const sample = (name: string) => path.join(process.cwd(), "public", "sample", name);

type Result = { name: string; status: "passou" | "FALHOU" | "pulado"; detail?: string };
const results: Result[] = [];

// Os passos do painel dependem uns dos outros: depois da primeira falha, os
// seguintes são pulados. Os independentes (keep-alive, limpeza) rodam sempre.
let broken = false;

// Página do painel, pra dizer onde o navegador estava quando um passo falhou.
let panel: Page | null = null;

// Uma promise solta que falhe não pode derrubar o processo antes da limpeza.
process.on("unhandledRejection", (reason) => {
  console.log(`  aviso   promise rejeitada fora de um passo: ${reason}`);
});

async function step(
  name: string,
  fn: () => Promise<void>,
  { independent = false } = {},
) {
  if (broken && !independent) {
    skip(name, "um passo anterior falhou");
    return;
  }
  try {
    await fn();
    results.push({ name, status: "passou" });
    console.log(`  ok      ${name}`);
  } catch (error) {
    let detail = error instanceof Error ? error.message.split("\n")[0] : String(error);
    if (panel && !independent) {
      const alerts = await panel.getByRole("alert").allInnerTexts().catch(() => []);
      detail += ` [em ${panel.url()}${alerts.length ? `, alerta: ${alerts.join(" | ")}` : ""}]`;
    }
    results.push({ name, status: "FALHOU", detail });
    if (!independent) broken = true;
    console.log(`  FALHOU  ${name}\n          ${detail}`);
  }
}

function skip(name: string, detail: string) {
  results.push({ name, status: "pulado", detail });
  console.log(`  pulado  ${name} (${detail})`);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal<T>(actual: T, expected: T, what: string) {
  assert(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${what}: esperava ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`,
  );
}

async function listBucket(folder: string): Promise<string[]> {
  const { data, error } = await admin.storage.from(BUCKET).list(folder, { limit: 1000 });
  if (error) throw new Error(error.message);
  return data.filter((file) => file.metadata).map((file) => `${folder}/${file.name}`);
}

// Largura e altura de um JPEG, lidas do marcador SOF.
async function jpegSize(storagePath: string): Promise<{ width: number; height: number }> {
  const { data, error } = await admin.storage.from(BUCKET).download(storagePath);
  if (error) throw new Error(error.message);
  equal(data.type, "image/jpeg", `tipo de ${storagePath}`);
  const bytes = Buffer.from(await data.arrayBuffer());
  for (let offset = 2; offset < bytes.length; ) {
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  throw new Error(`${storagePath} não é um JPEG legível`);
}

type PostRow = {
  id: string;
  position: number;
  type: string;
  caption: string | null;
  media: { path: string; kind: string; poster?: string }[];
};

async function postsOf(presentationId: string): Promise<PostRow[]> {
  const { data, error } = await admin
    .from("posts")
    .select("id, position, type, caption, media")
    .eq("presentation_id", presentationId)
    .order("position");
  if (error) throw new Error(error.message);
  return data as PostRow[];
}

function idFromUrl(page: Page): string {
  const id = new URL(page.url()).pathname.split("/").pop();
  assert(id && /^[0-9a-f-]{36}$/.test(id), `URL sem id: ${page.url()}`);
  return id;
}

async function addPost(page: Page, number: number, fill: () => Promise<void>) {
  await page.getByRole("button", { name: "Adicionar post" }).click();
  await fill();
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page
    .getByRole("button", { name: `Editar o post ${number}` })
    .waitFor({ timeout: 120_000 });
}

async function createPresentation(page: Page, clientId: string, title: string) {
  await page.goto(`${BASE_URL}/admin/clientes/${clientId}`);
  await page.getByLabel("Título da nova apresentação").fill(title);
  await page.getByRole("button", { name: "Nova apresentação" }).click();
  await page.waitForURL(/\/admin\/apresentacoes\/[0-9a-f-]{36}$/);
  return idFromUrl(page);
}

async function main() {
  console.log(`Teste de ponta a ponta em ${BASE_URL} (execução ${run})\n`);

  const { data: created, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError) throw new Error(`Não deu pra criar o usuário de teste: ${userError.message}`);
  const userId = created.user.id;

  let opened: Browser | null = null;
  let clientId = "";
  let presentationId = "";
  let token = "";
  let secondPresentationId = "";
  let actionRequest: { url: string; headers: Record<string, string>; body: Buffer } | null = null;

  try {
    const browser = await chromium.launch({ channel: process.env.E2E_BROWSER ?? "msedge" });
    opened = browser;
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE_URL });
    const page = await context.newPage();
    page.setDefaultTimeout(30_000);
    panel = page;
    console.log("Sem sessão");
    await step("/admin sem sessão redireciona para o login", async () => {
      const response = await fetch(`${BASE_URL}/admin`, { redirect: "manual" });
      equal(response.status, 307, "status");
      equal(
        new URL(response.headers.get("location") ?? "", BASE_URL).pathname,
        "/admin/login",
        "destino",
      );
      await page.goto(`${BASE_URL}/admin/clientes/novo`);
      equal(new URL(page.url()).pathname, "/admin/login", "página aberta no navegador");
    });

    await step("login e painel têm noindex", async () => {
      const robots = await page.locator('meta[name="robots"]').getAttribute("content");
      assert(robots?.includes("noindex"), `meta robots: ${robots}`);
    });

    await step("senha errada mostra o erro em português", async () => {
      await page.getByLabel("E-mail").fill(email);
      await page.getByLabel("Senha").fill("senha-errada");
      await page.getByRole("button", { name: "Entrar" }).click();
      await page.getByText("E-mail ou senha incorretos").waitFor();
    });

    console.log("\nCom sessão");
    await step("login com o usuário temporário abre o painel e mostra o e-mail", async () => {
      await page.getByLabel("Senha").fill(password);
      await page.getByRole("button", { name: "Entrar" }).click();
      await page.waitForURL(`${BASE_URL}/admin`);
      await page.getByText(email).waitFor();
      await page.getByRole("button", { name: "Sair" }).waitFor();
    });

    await step("cria cliente com @ em minúsculas, bio com quebra de linha e avatar 320×320", async () => {
      await page.getByRole("link", { name: "Novo cliente" }).click();
      await page.getByLabel("Nome").fill(`Teste E2E ${run}`);
      await page.getByLabel("@ do Instagram (sem o @)").fill(handle.toUpperCase());
      await page.getByLabel("Bio").fill("Linha um\nLinha dois");
      await page.getByLabel("Foto do perfil").setInputFiles(sample("avatar.jpg"));
      await page.getByText("Prévia da foto nova").waitFor();
      await page.getByRole("button", { name: "Criar cliente" }).click();
      await page.waitForURL(/\/admin\/clientes\/[0-9a-f-]{36}$/);
      clientId = idFromUrl(page);

      const { data } = await admin.from("clients").select("*").eq("id", clientId).single();
      equal(data.handle, handle, "handle");
      equal(data.bio, "Linha um\nLinha dois", "bio");
      equal(data.avatar_path, `clients/${clientId}/avatar.jpg`, "avatar_path");
      equal(await jpegSize(data.avatar_path), { width: 320, height: 320 }, "tamanho do avatar");
    });

    await step("@ repetido mostra erro amigável e não cria outro cliente", async () => {
      await page.goto(`${BASE_URL}/admin/clientes/novo`);
      await page.getByLabel("Nome").fill("Repetido");
      await page.getByLabel("@ do Instagram (sem o @)").fill(handle);
      await page.getByRole("button", { name: "Criar cliente" }).click();
      await page.getByText(`Já existe um cliente com o @${handle}`).waitFor();
      const { count } = await admin
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("handle", handle);
      equal(count, 1, "clientes com o @");
    });

    await step("lista de clientes mostra o cliente e o nº de apresentações", async () => {
      await page.goto(`${BASE_URL}/admin`);
      const row = page.getByRole("link", { name: new RegExp(`Teste E2E ${run}`) });
      await row.waitFor();
      assert((await row.innerText()).includes("0 apresentações"), "contagem de apresentações");
    });

    await step("cria apresentação com token de 12 caracteres", async () => {
      const captured = page.waitForRequest(
        (request) => request.method() === "POST" && Boolean(request.headers()["next-action"]),
      );
      captured.catch(() => {});
      presentationId = await createPresentation(page, clientId, "Semana E2E");
      const request = await captured;
      actionRequest = {
        url: request.url(),
        headers: await request.allHeaders(),
        body: request.postDataBuffer()!,
      };

      const { data } = await admin
        .from("presentations")
        .select("token, title")
        .eq("id", presentationId)
        .single();
      token = data?.token;
      equal(data?.title, "Semana E2E", "título");
      assert(/^[A-Za-z0-9_-]{12}$/.test(token), `token fora do padrão: ${token}`);
    });

    await step("a mesma Server Action sem sessão não cria nada", async () => {
      assert(actionRequest, "a requisição da action não foi capturada");
      const headers = {
        "next-action": actionRequest.headers["next-action"],
        "content-type": actionRequest.headers["content-type"],
        accept: "text/x-component",
      };
      // Pela rota do painel (para no proxy) e por uma rota pública (o proxy
      // não cobre, então quem barra é o requireStaff da própria action).
      for (const url of [actionRequest.url, `${BASE_URL}/`]) {
        await fetch(url, { method: "POST", headers, body: new Uint8Array(actionRequest.body), redirect: "manual" });
      }
      const { count } = await admin
        .from("presentations")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId);
      equal(count, 1, "apresentações do cliente depois das chamadas sem sessão");
    });

    await step("Copiar link confirma e copia o link do cliente", async () => {
      await page.getByRole("button", { name: "Copiar link" }).click();
      await page.getByText("Link copiado").waitFor();
      equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        `${BASE_URL}/p/${token}`,
        "área de transferência",
      );
    });

    await step("adiciona um post de 1 imagem", async () => {
      await addPost(page, 1, async () => {
        await page.getByLabel("Imagem", { exact: true }).setInputFiles(sample("paz.jpg"));
        await page.getByLabel("Legenda").fill("Post de teste\n#teste");
      });
    });

    await step("adiciona um carrossel de 3 imagens, trocando a ordem", async () => {
      await addPost(page, 2, async () => {
        await page.getByRole("radio", { name: "Carrossel" }).check();
        await page
          .getByLabel(/^Imagens/)
          .setInputFiles([sample("car-1.jpg"), sample("car-2.jpg"), sample("car-3.jpg")]);
        await page.getByRole("button", { name: "Descer a imagem 1" }).click();
        const names = await page.getByRole("listitem").filter({ hasText: /car-\d\.jpg/ }).allInnerTexts();
        equal(
          names.map((text) => text.match(/car-\d\.jpg/)![0]),
          ["car-2.jpg", "car-1.jpg", "car-3.jpg"],
          "ordem depois de descer a primeira",
        );
        await page.getByLabel("Legenda").fill("Carrossel de teste");
      });
    });

    await step("adiciona um Reels com MP4 e capa, com o aviso de H.264", async () => {
      await addPost(page, 3, async () => {
        await page.getByRole("radio", { name: "Reels" }).check();
        await page.getByText("Envie o vídeo já em H.264 (MP4).").waitFor();
        await page.getByLabel(/^Vídeo/).setInputFiles(sample("reels.mp4"));
        await page.getByLabel("Capa (imagem)").setInputFiles(sample("reels-capa.jpg"));
        await page.getByLabel("Legenda").fill("Reels de teste");
      });
    });

    await step("posts no banco: posições 1, 2, 3, formato da Etapa 2 e imagens em JPEG até 1080 px", async () => {
      const posts = await postsOf(presentationId);
      equal(posts.map((post) => [post.position, post.type, post.media.length]), [
        [1, "post", 1],
        [2, "carousel", 3],
        [3, "reels", 1],
      ], "posts");
      equal(posts[2].media[0].kind, "video", "kind do reels");
      assert(posts[2].media[0].path.endsWith(".mp4"), "extensão do vídeo");
      assert(posts[2].media[0].poster, "capa do reels");

      const folder = `presentations/${presentationId}/`;
      const paths = posts.flatMap((post) =>
        post.media.flatMap((item) => (item.poster ? [item.path, item.poster] : [item.path])),
      );
      assert(paths.every((item) => item.startsWith(folder)), "caminho fora da pasta");
      equal((await listBucket(folder.slice(0, -1))).sort(), [...paths].sort(), "arquivos no bucket");

      for (const item of paths.filter((item) => item.endsWith(".jpg"))) {
        const { width } = await jpegSize(item);
        assert(width <= 1080, `${item} tem ${width} px de largura`);
      }
    });

    await step("/p/<token> sem sessão mostra os 3 posts, com imagens e vídeo carregando", async () => {
      const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const view = await visitor.newPage();
        await view.goto(`${BASE_URL}/p/${token}`);
        await view.getByRole("button", { name: "Abrir post 1, Post" }).waitFor();
        await view.getByRole("button", { name: "Abrir post 2, Carrossel · 3 imagens" }).waitFor();
        await view.getByRole("button", { name: "Abrir post 3, Reels" }).waitFor();
        equal(await view.getByRole("button", { name: /^Abrir post/ }).count(), 3, "posts no grid");

        await view.goto(`${BASE_URL}/p/${token}?post=2`);
        await view.getByText("Post 2 de 3").waitFor();
        await view.getByText("Carrossel de teste").waitFor();
        await view.waitForFunction(() =>
          [...document.images].some((image) => image.naturalWidth >= 600 && image.complete),
        );

        await view.goto(`${BASE_URL}/p/${token}?post=3`);
        await view.getByText("Post 3 de 3").waitFor();
        const video = view.locator("video");
        assert(await video.getAttribute("poster"), "vídeo sem poster");
        const response = await fetch((await video.evaluate((el: HTMLVideoElement) => el.currentSrc || el.src)));
        assert(response.ok, `vídeo respondeu ${response.status}`);
        equal(response.headers.get("content-type"), "video/mp4", "tipo do vídeo");
      } finally {
        await visitor.close();
      }
    });

    await step("edita o post 1: legenda nova e imagem substituída, sem sobra no bucket", async () => {
      const before = (await postsOf(presentationId))[0];
      await page.getByRole("button", { name: "Editar o post 1" }).click();
      const form = page.getByRole("form", { name: "Editar post" });
      await form.getByLabel("Imagem", { exact: true }).setInputFiles(sample("car-4.jpg"));
      await form.getByLabel("Legenda").fill("Legenda editada");
      await form.getByRole("button", { name: "Salvar post" }).click();
      await form.waitFor({ state: "detached", timeout: 60_000 });

      const after = (await postsOf(presentationId))[0];
      equal(after.caption, "Legenda editada", "legenda");
      assert(after.media[0].path !== before.media[0].path, "a imagem não foi trocada");
      const files = await listBucket(`presentations/${presentationId}`);
      assert(!files.includes(before.media[0].path), "a imagem antiga ficou no bucket");
      equal(files.length, 6, "arquivos no bucket");
    });

    await step("renomeia a apresentação", async () => {
      await page.getByLabel("Título", { exact: true }).fill("Semana E2E editada");
      await page.getByRole("button", { name: "Salvar título" }).click();
      await page.getByText("Título salvo.").waitFor();
      const { data } = await admin.from("presentations").select("title").eq("id", presentationId).single();
      equal(data?.title, "Semana E2E editada", "título");
    });

    await step("exclui o post 2 com o aviso combinado, apaga os arquivos e não renumera", async () => {
      let warning = "";
      page.once("dialog", (dialog) => {
        warning = dialog.message();
        void dialog.accept();
      });
      await page.getByRole("button", { name: "Excluir o post 2" }).click();
      await page.getByRole("button", { name: "Editar o post 3" }).waitFor({ state: "detached" });
      equal(warning, DELETE_POST_WARNING, "texto da confirmação");

      const posts = await postsOf(presentationId);
      equal(posts.map((post) => post.position), [1, 3], "posições");
      equal((await listBucket(`presentations/${presentationId}`)).length, 3, "arquivos no bucket");
    });

    await step("exclui a apresentação e o bucket fica sem arquivos dela", async () => {
      await page.goto(`${BASE_URL}/admin/clientes/${clientId}`);
      page.once("dialog", (dialog) => void dialog.accept());
      await page.getByRole("button", { name: "Excluir", exact: true }).click();
      await page.getByText("Nenhuma apresentação ainda.").waitFor();

      equal(await listBucket(`presentations/${presentationId}`), [], "arquivos no bucket");
      equal(await postsOf(presentationId), [], "posts");
      const { data } = await admin.from("presentations").select("id").eq("id", presentationId);
      equal(data, [], "linha da apresentação");

      const response = await fetch(`${BASE_URL}/p/${token}`);
      assert((await response.text()).includes("Esta prévia não existe ou foi removida"), "o link ainda abre");
    });

    await step("excluir cliente exige o @ e apaga arquivos, apresentações e a linha", async () => {
      secondPresentationId = await createPresentation(page, clientId, "Segunda semana");
      await addPost(page, 1, async () => {
        await page.getByLabel("Imagem", { exact: true }).setInputFiles(sample("car-1.jpg"));
      });
      equal((await listBucket(`presentations/${secondPresentationId}`)).length, 1, "arquivo do post");

      await page.goto(`${BASE_URL}/admin/clientes/${clientId}`);
      const button = page.getByRole("button", { name: "Excluir cliente" });
      await page.getByLabel(/para confirmar$/).fill("outro_cliente");
      assert(await button.isDisabled(), "o botão liberou com o @ errado");
      await page.getByLabel(/para confirmar$/).fill(handle);
      await button.click();
      await page.waitForURL(`${BASE_URL}/admin`);

      equal(await listBucket(`clients/${clientId}`), [], "arquivos do cliente");
      equal(await listBucket(`presentations/${secondPresentationId}`), [], "arquivos da apresentação");
      const { data } = await admin.from("clients").select("id").eq("id", clientId);
      equal(data, [], "linha do cliente");
    });

    await step("Sair encerra a sessão", async () => {
      await page.getByRole("button", { name: "Sair" }).click();
      await page.waitForURL(`${BASE_URL}/admin/login`);
      await page.goto(`${BASE_URL}/admin`);
      equal(new URL(page.url()).pathname, "/admin/login", "página depois de sair");
    });

    console.log("\nKeep-alive");
    await step("/api/cron/keepalive responde 401 sem o segredo e com segredo errado", async () => {
      equal((await fetch(`${BASE_URL}/api/cron/keepalive`)).status, 401, "sem header");
      const wrong = await fetch(`${BASE_URL}/api/cron/keepalive`, {
        headers: { authorization: "Bearer errado" },
      });
      equal(wrong.status, 401, "segredo errado");
    }, { independent: true });

    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      await step("/api/cron/keepalive responde 200 { ok: true } com o segredo", async () => {
        const response = await fetch(`${BASE_URL}/api/cron/keepalive`, {
          headers: { authorization: `Bearer ${cronSecret}` },
        });
        equal(response.status, 200, "status");
        equal(await response.json(), { ok: true }, "corpo");
      }, { independent: true });
    } else {
      skip("/api/cron/keepalive com o segredo", "CRON_SECRET não definido");
    }
  } finally {
    await opened?.close();

    console.log("\nLimpeza");
    await step("apaga os dados, os arquivos e o usuário de teste", async () => {
      const { data: clients } = await admin
        .from("clients")
        .select("id, presentations(id)")
        .eq("handle", handle);
      const folders = [clientId && `clients/${clientId}`, presentationId, secondPresentationId]
        .filter(Boolean)
        .map((item) => (item.includes("/") ? item : `presentations/${item}`));
      for (const client of clients ?? []) {
        folders.push(`clients/${client.id}`);
        for (const presentation of client.presentations) {
          folders.push(`presentations/${presentation.id}`);
        }
        await admin.from("clients").delete().eq("id", client.id);
      }
      for (const folder of new Set(folders)) {
        const files = await listBucket(folder);
        if (files.length > 0) await admin.storage.from(BUCKET).remove(files);
        equal(await listBucket(folder), [], `sobra em ${folder}`);
      }

      // Sobras de rodadas que morreram antes da limpeza.
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      for (const user of users?.users ?? []) {
        if (user.id !== userId && TEST_EMAIL.test(user.email ?? "")) {
          await admin.auth.admin.deleteUser(user.id);
          console.log(`          apagado também ${user.email}, de uma rodada anterior`);
        }
      }

      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) throw new Error(`usuário ${email} NÃO foi apagado: ${error.message}`);
      const { data: check } = await admin.auth.admin.getUserById(userId);
      assert(!check?.user, `usuário ${email} ainda existe`);

      const { count } = await admin
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("handle", handle);
      equal(count, 0, "clientes de teste restantes");
    }, { independent: true });
  }

  const failed = results.filter((result) => result.status === "FALHOU");
  const skipped = results.filter((result) => result.status === "pulado");
  console.log(
    `\n${results.length - failed.length - skipped.length} passaram, ${failed.length} falharam, ${skipped.length} pulados.`,
  );
  if (failed.length > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`\nO teste não rodou. ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
