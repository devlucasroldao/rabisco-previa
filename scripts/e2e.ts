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
//
// A compressão de vídeo baixa o ffmpeg.wasm do CDN, então precisa de internet.
// Com um ffmpeg instalado no sistema (no PATH), o teste também gera na hora um
// HEVC curto em .mov, como o do iPhone; sem ele, esse passo é pulado.

import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { chromium, type Browser, type Page } from "playwright-core";
import { megabytes } from "../lib/media";
import { batchConfirmation } from "../lib/storage-rules";
import { newToken } from "../lib/token";
import { loadEnv, requireEnv } from "./env";

loadEnv();

const BASE_URL = (process.env.E2E_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const BUCKET = "media";
const FFMPEG_CDN = "**/cdn.jsdelivr.net/**";
const COMPRESSING_MESSAGE =
  "Comprimindo no seu computador. Pode levar alguns minutos, mantenha esta aba aberta.";
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

async function download(storagePath: string): Promise<Buffer> {
  const { data, error } = await admin.storage.from(BUCKET).download(storagePath);
  if (error) throw new Error(error.message);
  return Buffer.from(await data.arrayBuffer());
}

// O que dá pra conferir de um MP4 sem decodificar: vídeo em H.264 (avc1), não
// em HEVC, e o índice (moov) antes dos dados (mdat), que é o faststart.
function checkCompressedMp4(bytes: Buffer, what: string) {
  assert(bytes.includes("avc1"), `${what}: o vídeo não está em H.264`);
  assert(!bytes.includes("hvc1") && !bytes.includes("hev1"), `${what}: o vídeo ainda está em HEVC`);
  const moov = bytes.indexOf("moov");
  assert(moov > 0 && moov < bytes.indexOf("mdat"), `${what}: sem faststart`);
}

// Soma dos tamanhos dos arquivos de uma pasta do bucket.
async function bucketBytes(folder: string): Promise<number> {
  const { data, error } = await admin.storage.from(BUCKET).list(folder, { limit: 1000 });
  if (error) throw new Error(error.message);
  return data.reduce((sum, file) => sum + Number(file.metadata?.size ?? 0), 0);
}

const COMPRESSED_NOTE =
  "Os vídeos desta prévia estão comprimidos. O arquivo final é publicado em qualidade total.";

// O medidor do cabeçalho, em MB, lido da tela.
async function meterMegabytes(page: Page): Promise<number> {
  const text = await page.getByText(/^Armazenamento: [\d,]+ MB de 1 GB \(<?\d+%\)$/).innerText();
  return Number(text.match(/([\d,]+) MB/)![1].replace(",", "."));
}

// Escolhe o vídeo no formulário aberto e espera a compressão terminar.
// Devolve o resumo de tamanho e tempo pro relatório.
async function compressInForm(page: Page, file: string): Promise<string> {
  const started = Date.now();
  await page.getByLabel(/^Vídeo/).setInputFiles(file);
  await page.getByText(COMPRESSING_MESSAGE).waitFor();
  assert(
    await page.getByRole("button", { name: "Adicionar", exact: true }).isDisabled(),
    "o botão de salvar ficou liberado durante a compressão",
  );
  const sizes = page.getByText(/original [\d,]+ MB → final [\d,]+ MB/);
  await sizes.waitFor({ timeout: 600_000 });
  equal(await page.getByText("sem compressão").count(), 0, "avisos de envio sem compressão");
  const seconds = ((Date.now() - started) / 1000).toFixed(1).replace(".", ",");
  const summary = `${path.basename(file)}: ${(await sizes.innerText()).match(/original.*/)![0]}, em ${seconds} s`;
  console.log(`          ${summary}`);
  // A capa automática sai do quadro de 1 s.
  await page.getByText("Quadro do vídeo em 0:01").waitFor();
  return summary;
}

// Abre o post na tela do cliente e confere que o vídeo toca de verdade.
async function playsForVisitor(browser: Browser, url: string, size?: [number, number]) {
  const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const view = await visitor.newPage();
    await view.goto(url);
    const video = view.locator("video");
    assert(await video.getAttribute("poster"), "vídeo sem poster");
    const source = await video.evaluate((el: HTMLVideoElement) => el.currentSrc || el.src);
    const response = await fetch(source);
    assert(response.ok, `vídeo respondeu ${response.status}`);
    equal(response.headers.get("content-type"), "video/mp4", "tipo do vídeo");

    await video.evaluate((el: HTMLVideoElement) => {
      el.muted = true;
      return el.play();
    });
    await view.waitForFunction(() => {
      const el = document.querySelector("video");
      return Boolean(el && el.currentTime > 0.3 && el.videoWidth > 0);
    });
    if (size) {
      equal(
        await video.evaluate((el: HTMLVideoElement) => [el.videoWidth, el.videoHeight]),
        size,
        "tamanho do vídeo",
      );
    }
  } finally {
    await visitor.close();
  }
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

const ORDER_CHANGED_NOTE =
  "A ordem mudou. Se o link já foi enviado, avise o cliente que os números dos posts mudaram.";

// Legendas na ordem de position, conferindo que position vai de 1 a N.
async function captionsOf(presentationId: string): Promise<string[]> {
  const posts = await postsOf(presentationId);
  equal(
    posts.map((post) => post.position),
    posts.map((_, index) => index + 1),
    "position de 1 a N",
  );
  return posts.map((post) => post.caption ?? "");
}

// A ordem é salva depois do soltar; espera o banco chegar lá.
async function waitForCaptions(presentationId: string, expected: string[]) {
  let last: string[] = [];
  for (let attempt = 0; attempt < 40; attempt++) {
    last = (await postsOf(presentationId)).map((post) => post.caption ?? "");
    if (JSON.stringify(last) === JSON.stringify(expected)) {
      equal(await captionsOf(presentationId), expected, "ordem no banco");
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  equal(last, expected, "ordem no banco");
}

// A tela do cliente responde "não existe" (link desativado, trocado ou errado).
async function opensAsMissing(token: string): Promise<boolean> {
  const response = await fetch(`${BASE_URL}/p/${token}`);
  return (await response.text()).includes("Esta prévia não existe ou foi removida");
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
  let hevcPresentationId = "";
  const oldIds: string[] = [];
  let storyPresentationId = "";
  let recentId = "";
  let managedId = "";
  let managedToken = "";
  let reelsOnlyId = "";
  const temp = mkdtempSync(path.join(os.tmpdir(), "rabisco-e2e-"));
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

    await step("sem o ffmpeg (CDN fora do ar), o vídeo de até 50 MB vai sem compressão, com aviso", async () => {
      await page.route(FFMPEG_CDN, (route) => route.abort());
      try {
        await page.getByRole("button", { name: "Adicionar post" }).click();
        await page.getByRole("radio", { name: "Reels" }).check();
        await page.getByLabel(/^Vídeo/).setInputFiles(sample("reels.mp4"));
        await page.getByText("Não deu pra carregar o compressor de vídeo").waitFor();
        await page.getByText("será enviado sem compressão").waitFor();
        // O original é H.264, então o navegador ainda tira a capa dele.
        await page.getByText("Quadro do vídeo em 0:01").waitFor();
        await page.getByRole("form", { name: "Novo post" }).getByRole("button", { name: "Cancelar", exact: true }).click();
      } finally {
        await page.unroute(FFMPEG_CDN);
      }
    });

    await step("adiciona um Reels: cancela, comprime o MP4, gera a capa e troca o quadro", async () => {
      await addPost(page, 3, async () => {
        await page.getByRole("radio", { name: "Reels" }).check();
        await page.getByText("O vídeo é comprimido aqui no navegador").waitFor();

        await page.getByLabel(/^Vídeo/).setInputFiles(sample("reels.mp4"));
        await page.getByRole("button", { name: "Cancelar compressão" }).click();
        await page.getByText(COMPRESSING_MESSAGE).waitFor({ state: "detached" });
        equal(await page.getByText(/original [\d,]+ MB/).count(), 0, "vídeo depois de cancelar");

        await compressInForm(page, sample("reels.mp4"));
        // Trocar o vídeo comprime de novo, na mesma página.
        await compressInForm(page, sample("reels.mp4"));
        await page.getByLabel(/^Quadro da capa/).fill("2");
        await page.getByText("Quadro do vídeo em 0:02").waitFor();
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
      equal((await jpegSize(posts[2].media[0].poster)).width, 1080, "largura da capa do reels");
      const video = await download(posts[2].media[0].path);
      checkCompressedMp4(video, "reels");
      assert(
        video.length <= 50 * 1024 * 1024,
        `o vídeo no bucket tem ${megabytes(video.length)}`,
      );

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

        await view.getByText(COMPRESSED_NOTE).waitFor();

        await view.goto(`${BASE_URL}/p/${token}?post=2`);
        await view.getByText("Post 2 de 3").waitFor();
        await view.getByText("Carrossel de teste").waitFor();
        await view.waitForFunction(() =>
          [...document.images].some((image) => image.naturalWidth >= 600 && image.complete),
        );

        await view.goto(`${BASE_URL}/p/${token}?post=3`);
        await view.getByText("Post 3 de 3").waitFor();
      } finally {
        await visitor.close();
      }
    });

    await step("/p/<token> toca o Reels comprimido", async () => {
      await playsForVisitor(browser, `${BASE_URL}/p/${token}?post=3`);
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

    console.log("\nArmazenamento e limpeza");
    await step("apresentações de teste mostram idade, tamanho, posts e o selo Antiga", async () => {
      for (const title of ["Antiga E2E A", "Antiga E2E B"]) {
        const created = await createPresentation(page, clientId, title);
        await addPost(page, 1, async () => {
          await page.getByLabel("Imagem", { exact: true }).setInputFiles(sample("car-1.jpg"));
        });
        oldIds.push(created);
      }
      recentId = await createPresentation(page, clientId, "Recente E2E");
      await addPost(page, 1, async () => {
        await page.getByLabel("Imagem", { exact: true }).setInputFiles(sample("car-2.jpg"));
      });
      await addPost(page, 2, async () => {
        await page.getByLabel("Imagem", { exact: true }).setInputFiles(sample("car-3.jpg"));
      });

      // 30 dias atrás: a única forma de ter uma apresentação velha num teste.
      const past = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const { error } = await admin.from("presentations").update({ created_at: past }).in("id", oldIds);
      if (error) throw new Error(error.message);

      await page.goto(`${BASE_URL}/admin/clientes/${clientId}`);
      const expected = [
        { title: "Antiga E2E A", id: oldIds[0], age: "30 dias", posts: "1 post", old: true },
        { title: "Antiga E2E B", id: oldIds[1], age: "30 dias", posts: "1 post", old: true },
        { title: "Recente E2E", id: recentId, age: "hoje", posts: "2 posts", old: false },
      ];
      for (const item of expected) {
        const row = page.getByRole("listitem").filter({ hasText: item.title });
        const text = await row.innerText();
        const size = megabytes(await bucketBytes(`presentations/${item.id}`));
        for (const part of [item.age, size, item.posts]) {
          assert(text.includes(part), `${item.title}: esperava "${part}" em "${text}"`);
        }
        equal(await row.getByText("Antiga", { exact: true }).count(), item.old ? 1 : 0, `selo de ${item.title}`);
      }
    });

    await step("/p/<token> sem Reels não mostra o aviso de vídeo comprimido", async () => {
      const { data } = await admin.from("presentations").select("token").eq("id", recentId).single();
      const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const view = await visitor.newPage();
        await view.goto(`${BASE_URL}/p/${data?.token}`);
        await view.getByText("Prévia preparada pela Rabisco").waitFor();
        equal(await view.getByText(COMPRESSED_NOTE).count(), 0, "aviso sem Reels");
      } finally {
        await visitor.close();
      }
    });

    await step("limpeza em lote apaga as antigas selecionadas, sem sobra no bucket, e atualiza o medidor", async () => {
      const sizes = await Promise.all(oldIds.map((item) => bucketBytes(`presentations/${item}`)));
      const freed = sizes[0] + sizes[1];
      assert(freed > 0, "as apresentações antigas não têm arquivo");

      await page.goto(`${BASE_URL}/admin`);
      const before = await meterMegabytes(page);
      const client = `Teste E2E ${run}`;
      const recent = page.getByLabel(`Selecionar ${client}: Recente E2E`);
      equal(await recent.count(), 0, "a recente na lista de antigas");
      for (const title of ["Antiga E2E A", "Antiga E2E B"]) {
        await page.getByLabel(`Selecionar ${client}: ${title}`).check();
      }
      await page.getByText(`2 apresentações, ${megabytes(freed)}`).waitFor();

      await page.getByRole("button", { name: "Apagar selecionadas" }).click();
      const dialog = page.getByRole("alertdialog", { name: "Confirmar exclusão" });
      equal(
        await dialog.locator("p").innerText(),
        batchConfirmation(sizes.map((bytes) => ({ bytes }))),
        "texto da confirmação",
      );
      await dialog.getByRole("button", { name: "Apagar", exact: true }).click();
      await page.getByText(`2 apresentações apagadas, ${megabytes(freed)} liberados.`).waitFor({ timeout: 60_000 });

      for (const item of oldIds) {
        equal(await listBucket(`presentations/${item}`), [], `arquivos de ${item}`);
      }
      const { data } = await admin.from("presentations").select("id").in("id", [...oldIds, recentId]);
      equal(data?.map((row) => row.id), [recentId], "apresentações que sobraram");

      // O medidor cai pelo menos o que foi liberado (o arredondamento é de 0,1 MB).
      await page.waitForFunction(
        (limit) => {
          const match = document.body.innerText.match(/Armazenamento: ([\d,]+) MB/);
          return match ? Number(match[1].replace(",", ".")) <= limit : false;
        },
        before - freed / 1024 / 1024 + 0.1,
      );
      const after = await meterMegabytes(page);
      console.log(`          medidor: ${before} MB → ${after} MB (liberados ${megabytes(freed)})`);
    });

    console.log("\nStories");
    let storyToken = "";
    let storyBytes = 0;
    await step("adiciona 2 stories no dia A e 1 no dia B (seleção múltipla) e o medidor sobe", async () => {
      storyPresentationId = await createPresentation(page, clientId, "Stories E2E");
      // Um post só: com stories, o grid aparece mesmo assim.
      await addPost(page, 1, async () => {
        await page.getByLabel("Imagem", { exact: true }).setInputFiles(sample("paz.jpg"));
      });
      const folder = `presentations/${storyPresentationId}`;
      const postBytes = await bucketBytes(folder);
      const before = await meterMegabytes(page);

      const form = page.getByRole("form", { name: "Adicionar stories" });
      await form.getByLabel("Dia").fill("2026-10-12");
      await form.getByLabel(/^Artes dos stories/).setInputFiles([sample("reels-capa.jpg"), sample("avatar.jpg")]);
      await form.getByRole("button", { name: "Adicionar stories" }).click();
      await page.getByRole("button", { name: "Excluir o story 2" }).waitFor({ timeout: 60_000 });
      await form.getByLabel("Dia").fill("2026-10-14");
      await form.getByLabel(/^Artes dos stories/).setInputFiles(sample("car-4.jpg"));
      await form.getByRole("button", { name: "Adicionar stories" }).click();
      await page.getByRole("button", { name: "Excluir o story 3" }).waitFor({ timeout: 60_000 });

      await page.getByRole("region", { name: "Segunda, 12/10" }).getByRole("listitem").nth(1).waitFor();
      equal(await page.getByRole("region", { name: "Segunda, 12/10" }).getByRole("listitem").count(), 2, "stories na segunda");
      equal(await page.getByRole("region", { name: "Quarta, 14/10" }).getByRole("listitem").count(), 1, "stories na quarta");

      const { data: rows } = await admin
        .from("stories")
        .select("day, position, path")
        .eq("presentation_id", storyPresentationId)
        .order("day")
        .order("position");
      equal(rows?.map((row) => [row.day, row.position]), [
        ["2026-10-12", 1],
        ["2026-10-12", 2],
        ["2026-10-14", 1],
      ], "dias e posições");
      for (const row of rows ?? []) {
        // Mesma pasta dos posts, sem subpasta.
        assert(new RegExp(`^${folder}/[0-9a-f-]{36}\\.jpg$`).test(row.path), `caminho ${row.path}`);
        const { width } = await jpegSize(row.path);
        assert(width <= 1080, `${row.path} tem ${width} px`);
      }
      // A arte 9:16 de 1080 px fica como está; a de 320×320 não é ampliada
      // nem recortada.
      equal(await jpegSize(rows![0].path), { width: 1080, height: 1920 }, "story 9:16");
      equal(await jpegSize(rows![1].path), { width: 320, height: 320 }, "story pequeno");
      equal((await listBucket(folder)).length, 4, "arquivos na pasta (1 post + 3 stories)");

      const total = await bucketBytes(folder);
      storyBytes = total - postBytes;
      assert(storyBytes > 0, "os stories não ocupam espaço");

      // O tamanho da apresentação no painel inclui os stories.
      await page.goto(`${BASE_URL}/admin/clientes/${clientId}`);
      const row = page.getByRole("listitem").filter({ hasText: "Stories E2E" });
      assert((await row.innerText()).includes(megabytes(total)), `tamanho com stories: ${await row.innerText()}`);

      // E o medidor também.
      await page.waitForFunction(
        (limit) => {
          const match = document.body.innerText.match(/Armazenamento: ([\d,]+) MB/);
          return match ? Number(match[1].replace(",", ".")) >= limit : false;
        },
        before + storyBytes / 1024 / 1024 - 0.1,
      );
      console.log(`          medidor: ${before} MB → ${await meterMegabytes(page)} MB (stories ${megabytes(storyBytes)})`);

      const { data } = await admin.from("presentations").select("token").eq("id", storyPresentationId).single();
      storyToken = data?.token;
    });

    await step("/p/<token>: anel colorido, balão, contador e grid com 1 post", async () => {
      const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const view = await visitor.newPage();
        await view.goto(`${BASE_URL}/p/${storyToken}`);
        const avatar = view.getByRole("button", { name: "Ver stories da semana (3)", exact: true });
        await avatar.waitFor();
        equal(await avatar.locator("[data-ring]").getAttribute("data-ring"), "novo", "anel");
        const ring = await avatar.locator("[data-ring]").evaluate((el) => getComputedStyle(el).backgroundImage);
        assert(ring.includes("linear-gradient"), `anel sem degradê: ${ring}`);
        await view.getByText("Toque na foto para ver os stories da semana").waitFor();
        await view.getByText("1 conteúdo · 3 stories · Rabisco").waitFor();
        await view.getByRole("button", { name: "Abrir post 1, Post" }).waitFor();
      } finally {
        await visitor.close();
      }
    });

    await step("visualizador: chips dos dias, Story N de T, assiste a todos e o anel fica cinza (também ao recarregar)", async () => {
      const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const view = await visitor.newPage();
        await view.goto(`${BASE_URL}/p/${storyToken}`);
        await view.getByRole("button", { name: "Ver stories da semana (3)", exact: true }).click();
        const dialog = view.getByRole("dialog");
        await dialog.waitFor();
        equal(new URL(view.url()).searchParams.get("story"), "1", "story na URL");
        equal(await dialog.getAttribute("aria-label"), "Segunda, 12/10 · Story 1 de 3", "rótulo");
        equal(await view.getByText("Toque na foto para ver os stories da semana").count(), 0, "balão aberto");
        await dialog.getByRole("img", { name: "Story 1 de 3" }).waitFor();

        await dialog.getByRole("button", { name: "Qua 14" }).click();
        await view.waitForURL(/story=3/);
        equal(await dialog.getAttribute("aria-label"), "Quarta, 14/10 · Story 3 de 3", "rótulo depois do chip");
        equal(await dialog.getByRole("button", { name: "Qua 14" }).getAttribute("aria-current"), "true", "dia marcado");
        await dialog.getByRole("button", { name: "Seg 12" }).click();
        await view.waitForURL(/story=1/);

        // Teclado: seta pra direita avança, pra esquerda volta.
        await view.keyboard.press("ArrowRight");
        await view.waitForURL(/story=2/);
        await view.keyboard.press("ArrowLeft");
        await view.waitForURL(/story=1/);

        // Segurar pausa: 6 s depois, continua no mesmo story.
        const box = (await dialog.getByRole("img", { name: "Story 1 de 3" }).boundingBox())!;
        await view.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await view.mouse.down();
        await view.waitForTimeout(6000);
        equal(new URL(view.url()).searchParams.get("story"), "1", "story enquanto segura");
        await view.mouse.up();

        // Assiste a todos: 5 s cada, passando de segunda pra quarta, e fecha no fim.
        await view.waitForURL(/story=2/, { timeout: 15_000 });
        await view.waitForURL(/story=3/, { timeout: 15_000 });
        await dialog.waitFor({ state: "detached", timeout: 15_000 });

        const avatar = view.getByRole("button", { name: "Ver stories da semana (3, todos vistos)", exact: true });
        await avatar.waitFor();
        equal(await avatar.locator("[data-ring]").getAttribute("data-ring"), "visto", "anel depois de ver tudo");

        await view.reload();
        await avatar.waitFor();
        equal(await avatar.locator("[data-ring]").getAttribute("data-ring"), "visto", "anel depois de recarregar");
        equal(await view.getByText("Toque na foto para ver os stories da semana").count(), 0, "balão depois de ver tudo");

        // Dá pra reabrir, e o Esc fecha.
        await avatar.click();
        await view.getByRole("dialog").waitFor();
        await view.keyboard.press("Escape");
        await view.getByRole("dialog").waitFor({ state: "detached" });
        equal(new URL(view.url()).searchParams.get("story"), null, "story na URL depois do Esc");
      } finally {
        await visitor.close();
      }
    });

    await step("sem localStorage, nada quebra: anel sempre colorido e balão sempre visível", async () => {
      const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        await visitor.addInitScript(() => {
          Object.defineProperty(window, "localStorage", {
            get() {
              throw new Error("bloqueado");
            },
          });
        });
        const view = await visitor.newPage();
        const errors: string[] = [];
        view.on("pageerror", (error) => errors.push(String(error)));
        await view.goto(`${BASE_URL}/p/${storyToken}?story=3`);
        await view.getByRole("dialog").waitFor();
        await view.getByRole("button", { name: "Fechar os stories" }).first().click();
        const avatar = view.getByRole("button", { name: "Ver stories da semana (3)", exact: true });
        await avatar.waitFor();
        equal(await avatar.locator("[data-ring]").getAttribute("data-ring"), "novo", "anel sem localStorage");
        await view.getByText("Toque na foto para ver os stories da semana").waitFor();
        equal(errors, [], "erros na página");
      } finally {
        await visitor.close();
      }
    });

    await step("com movimento reduzido, o story não avança sozinho", async () => {
      const visitor = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
      try {
        const view = await visitor.newPage();
        await view.goto(`${BASE_URL}/p/${storyToken}?story=1`);
        await view.getByRole("dialog").waitFor();
        await view.waitForTimeout(6500);
        equal(new URL(view.url()).searchParams.get("story"), "1", "story depois de 6,5 s");
        await view.getByRole("button", { name: "Próximo story" }).click();
        await view.waitForURL(/story=2/);
      } finally {
        await visitor.close();
      }
    });

    await step("painel: desce um story dentro do dia e muda o dia de outro", async () => {
      await page.goto(`${BASE_URL}/admin/apresentacoes/${storyPresentationId}`);
      const order = async () => {
        const { data } = await admin
          .from("stories")
          .select("day, position, path")
          .eq("presentation_id", storyPresentationId);
        return [...(data ?? [])]
          .sort((a, b) => (a.day === b.day ? a.position - b.position : a.day < b.day ? -1 : 1))
          .map((row) => `${row.day}:${row.path}`);
      };
      const before = await order();
      await page.getByRole("button", { name: "Descer o story 1" }).click();
      for (let i = 0; i < 20 && JSON.stringify(await order()) === JSON.stringify(before); i++) {
        await page.waitForTimeout(250);
      }
      const swapped = await order();
      equal(swapped, [before[1], before[0], before[2]], "ordem depois de descer");

      // Story 3 (quarta) vai pra terça: continua o 3º, agora num dia próprio.
      await page.getByLabel("Dia do story 3").fill("2026-10-13");
      await page.getByRole("region", { name: "Terça, 13/10" }).waitFor();
      equal((await order())[2].split(":")[0], "2026-10-13", "dia novo do story 3");
    });

    await step("exclui um story e depois a apresentação: o bucket fica sem sobra", async () => {
      const folder = `presentations/${storyPresentationId}`;
      await page.goto(`${BASE_URL}/admin/apresentacoes/${storyPresentationId}`);
      page.once("dialog", (dialog) => void dialog.accept());
      await page.getByRole("button", { name: "Excluir o story 3" }).click();
      await page.getByRole("button", { name: "Excluir o story 3" }).waitFor({ state: "detached" });
      equal((await listBucket(folder)).length, 3, "arquivos depois de excluir um story");
      const { count } = await admin
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("presentation_id", storyPresentationId);
      equal(count, 2, "stories no banco");

      await page.goto(`${BASE_URL}/admin/clientes/${clientId}`);
      page.once("dialog", (dialog) => void dialog.accept());
      const row = page.getByRole("listitem").filter({ hasText: "Stories E2E" });
      await row.getByRole("button", { name: "Excluir", exact: true }).click();
      await row.waitFor({ state: "detached" });
      equal(await listBucket(folder), [], "arquivos da apresentação com stories");
      const { count: left } = await admin
        .from("stories")
        .select("id", { count: "exact", head: true })
        .eq("presentation_id", storyPresentationId);
      equal(left, 0, "stories depois de excluir a apresentação");
    });

    console.log("\nGestão da apresentação");
    await step("monta uma apresentação com 3 posts de legendas A, B e C", async () => {
      managedId = await createPresentation(page, clientId, "Gestão E2E");
      for (const [index, letter] of ["A", "B", "C"].entries()) {
        await addPost(page, index + 1, async () => {
          await page
            .getByLabel("Imagem", { exact: true })
            .setInputFiles(sample(["paz.jpg", "car-1.jpg", "car-2.jpg"][index]));
          await page.getByLabel("Legenda").fill(`Legenda ${letter}`);
        });
      }
      equal(await captionsOf(managedId), ["Legenda A", "Legenda B", "Legenda C"], "ordem inicial");
    });

    await step("reordena pelo teclado na alça: salva atômico, mostra Ordem salva e o aviso", async () => {
      const handle = page.getByRole("button", { name: "Arrastar o post 1" });
      await handle.focus();
      await page.keyboard.press("Space");
      await page.waitForTimeout(200);
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(200);
      await page.keyboard.press("ArrowDown");
      await page.waitForTimeout(200);
      await page.keyboard.press("Space");
      await page.getByText("Ordem salva").waitFor();
      await page.getByText(ORDER_CHANGED_NOTE).waitFor();
      await waitForCaptions(managedId, ["Legenda B", "Legenda C", "Legenda A"]);
    });

    await step("reordena pelo botão subir", async () => {
      await page.getByRole("button", { name: "Subir o post 3" }).click();
      await waitForCaptions(managedId, ["Legenda B", "Legenda A", "Legenda C"]);
    });

    await step("reordena arrastando a alça com o mouse (simulado pelo Playwright)", async () => {
      const handle = page.getByRole("button", { name: "Arrastar o post 3" });
      const target = page.getByRole("button", { name: "Arrastar o post 1" });
      const from = (await handle.boundingBox())!;
      const to = (await target.boundingBox())!;
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
      await page.mouse.down();
      // Passos pequenos: o PointerSensor só começa depois de 5 px.
      await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 - 10, { steps: 5 });
      await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2 - 10, { steps: 20 });
      await page.waitForTimeout(200);
      await page.mouse.up();
      await waitForCaptions(managedId, ["Legenda C", "Legenda B", "Legenda A"]);
    });

    await step("/p/<token> mostra os posts na ordem nova", async () => {
      const { data } = await admin.from("presentations").select("token").eq("id", managedId).single();
      managedToken = data?.token ?? "";
      const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const view = await visitor.newPage();
        for (const [number, letter] of [[1, "C"], [2, "B"], [3, "A"]] as const) {
          await view.goto(`${BASE_URL}/p/${managedToken}?post=${number}`);
          await view.getByText(`Post ${number} de 3`).waitFor();
          await view.getByText(`Legenda ${letter}`).waitFor();
        }
      } finally {
        await visitor.close();
      }
    });

    await step("desativa o link: selo, aviso nos botões e /p/<token> diz que não existe", async () => {
      await page.getByRole("button", { name: "Desativar link" }).click();
      await page.getByText("Link desativado", { exact: true }).waitFor();
      const { data } = await admin.from("presentations").select("active").eq("id", managedId).single();
      equal(data?.active, false, "active no banco");
      assert(await opensAsMissing(managedToken), "o link desativado ainda abre");

      await page.getByRole("button", { name: "Copiar link" }).click();
      await page.getByText(/O link está desativado/).waitFor();
      await page.getByRole("button", { name: "Ver como cliente" }).click();
      await page.getByText(/O link está desativado/).waitFor();
    });

    await step("reativa o link e ele volta a abrir", async () => {
      await page.getByRole("button", { name: "Reativar link" }).click();
      await page.getByRole("button", { name: "Desativar link" }).waitFor();
      equal(await page.getByText("Link desativado", { exact: true }).count(), 0, "selo");
      assert(!(await opensAsMissing(managedToken)), "o link reativado não abre");
    });

    await step("regenera o link com confirmação: o antigo diz que não existe e o novo abre e copia", async () => {
      const oldToken = managedToken;
      await page.getByRole("button", { name: "Regenerar link" }).click();
      await page.getByText("O link antigo deixa de funcionar. Quem o recebeu precisará do novo.").waitFor();
      await page.getByRole("button", { name: "Regenerar", exact: true }).click();
      await page.getByText(/^Link regenerado/).waitFor();

      const { data } = await admin.from("presentations").select("token").eq("id", managedId).single();
      managedToken = data?.token ?? "";
      assert(/^[A-Za-z0-9_-]{12}$/.test(managedToken), `token novo fora do padrão: ${managedToken}`);
      assert(managedToken !== oldToken, "o token não mudou");
      assert(await opensAsMissing(oldToken), "o link antigo ainda abre");
      assert(!(await opensAsMissing(managedToken)), "o link novo não abre");

      await page.getByRole("button", { name: "Copiar link" }).click();
      await page.getByText("Link copiado").waitFor();
      equal(
        await page.evaluate(() => navigator.clipboard.readText()),
        `${BASE_URL}/p/${managedToken}`,
        "área de transferência",
      );
    });

    await step("Reels único abre direto e mostra o aviso de vídeo comprimido em 11 px", async () => {
      // Montada pela API admin: o Reels pelo painel já é coberto acima.
      reelsOnlyId = randomUUID();
      const reelsToken = newToken();
      const folder = `presentations/${reelsOnlyId}`;
      const { error } = await admin
        .from("presentations")
        .insert({ id: reelsOnlyId, client_id: clientId, title: "Reels único E2E", token: reelsToken });
      if (error) throw new Error(error.message);
      for (const [name, type] of [["reels.mp4", "video/mp4"], ["reels-capa.jpg", "image/jpeg"]]) {
        const { error: uploadError } = await admin.storage
          .from(BUCKET)
          .upload(`${folder}/${name}`, readFileSync(sample(name)), { contentType: type });
        if (uploadError) throw new Error(uploadError.message);
      }
      const { error: postError } = await admin.from("posts").insert({
        presentation_id: reelsOnlyId,
        position: 1,
        type: "reels",
        caption: "Reels único",
        media: [{ path: `${folder}/reels.mp4`, kind: "video", poster: `${folder}/reels-capa.jpg` }],
      });
      if (postError) throw new Error(postError.message);

      const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
      try {
        const view = await visitor.newPage();
        await view.goto(`${BASE_URL}/p/${reelsToken}`);
        await view.getByText("Post 1 de 1").waitFor();
        equal(await view.getByRole("button", { name: /^Abrir post/ }).count(), 0, "grid");
        const note = view.getByText(COMPRESSED_NOTE);
        await note.waitFor();
        equal(await note.evaluate((el) => getComputedStyle(el).fontSize), "11px", "tamanho do aviso");
        const adjust = view.getByText(/Quer ajustar algo\?/);
        const below = (await note.boundingBox())!.y > (await adjust.boundingBox())!.y;
        assert(below, "o aviso não ficou abaixo do texto de ajuste");
      } finally {
        await visitor.close();
      }
    });

    await step("troca a senha do usuário temporário em Conta: erros em português e a nova passa a valer", async () => {
      const newPassword = randomBytes(24).toString("base64url");
      await page.getByRole("link", { name: "Conta" }).click();
      await page.waitForURL(`${BASE_URL}/admin/conta`);
      const robots = await page.locator('meta[name="robots"]').getAttribute("content");
      assert(robots?.includes("noindex"), `meta robots: ${robots}`);

      const fill = async (current: string, next: string, confirmation: string) => {
        await page.getByLabel("Senha atual", { exact: true }).fill(current);
        await page.getByLabel(/^Nova senha/).fill(next);
        await page.getByLabel("Confirme a nova senha", { exact: true }).fill(confirmation);
        await page.getByRole("button", { name: "Trocar senha" }).click();
      };

      await fill("senha-atual-errada", newPassword, newPassword);
      await page.getByText("A senha atual está incorreta.").waitFor();
      await fill(password, newPassword, `${newPassword}x`);
      await page.getByText("A confirmação não é igual à nova senha.").waitFor();
      await fill(password, newPassword, newPassword);
      await page.getByText(/^Senha trocada/).waitFor();

      await page.getByRole("button", { name: "Sair" }).click();
      await page.waitForURL(`${BASE_URL}/admin/login`);
      await page.getByLabel("E-mail").fill(email);
      // A página Conta continua no DOM, escondida: o rótulo exato evita os
      // campos de senha dela.
      await page.getByLabel("Senha", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Entrar" }).click();
      await page.getByText("E-mail ou senha incorretos").waitFor();
      await page.getByLabel("Senha", { exact: true }).fill(newPassword);
      await page.getByRole("button", { name: "Entrar" }).click();
      await page.waitForURL(`${BASE_URL}/admin`);
    });

    const hevcName = "HEVC .mov gerado na hora: comprime pra H.264 720×1280 e toca no /p/<token>";
    if (spawnSync("ffmpeg", ["-version"]).status === 0) {
      await step(hevcName, async () => {
        // Parecido com o que sai do iPhone: HEVC (hvc1) em .mov, 1080×1920 a 60 fps.
        const mov = path.join(temp, "hevc.mov");
        const made = spawnSync("ffmpeg", [
          "-v", "error", "-y",
          "-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=60:duration=3",
          "-f", "lavfi", "-i", "sine=frequency=440:duration=3",
          "-c:v", "libx265", "-tag:v", "hvc1", "-pix_fmt", "yuv420p",
          "-c:a", "aac", "-shortest", mov,
        ]);
        assert(made.status === 0, `o ffmpeg do sistema não gerou o HEVC: ${made.stderr}`);
        const originalBytes = statSync(mov).size;

        hevcPresentationId = await createPresentation(page, clientId, "HEVC E2E");
        const { data } = await admin
          .from("presentations")
          .select("token")
          .eq("id", hevcPresentationId)
          .single();
        await addPost(page, 1, async () => {
          await page.getByRole("radio", { name: "Reels" }).check();
          await compressInForm(page, mov);
        });

        const [post] = await postsOf(hevcPresentationId);
        const video = await download(post.media[0].path);
        checkCompressedMp4(video, "HEVC");
        assert(originalBytes > 0 && video.length > 0, "arquivo vazio");
        equal((await jpegSize(post.media[0].poster!)).width, 1080, "largura da capa");
        await playsForVisitor(browser, `${BASE_URL}/p/${data?.token}`, [720, 1280]);
      });
    } else {
      skip(hevcName, "sem ffmpeg no PATH pra gerar o HEVC");
    }

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
      if (hevcPresentationId) {
        equal(await listBucket(`presentations/${hevcPresentationId}`), [], "arquivos do HEVC");
      }
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
    rmSync(temp, { recursive: true, force: true });

    console.log("\nLimpeza");
    await step("apaga os dados, os arquivos e o usuário de teste", async () => {
      const { data: clients } = await admin
        .from("clients")
        .select("id, presentations(id)")
        .eq("handle", handle);
      const folders = [
        clientId && `clients/${clientId}`,
        presentationId,
        secondPresentationId,
        hevcPresentationId,
        ...oldIds,
        recentId,
        storyPresentationId,
      ]
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
