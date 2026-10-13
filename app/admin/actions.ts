"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  avatarPath,
  CAPTION_MAX_LENGTH,
  CAROUSEL_MAX_IMAGES,
  CAROUSEL_MIN_IMAGES,
  clientFolder,
  IMAGE_MAX_BYTES,
  IMAGE_OUTPUT_TYPE,
  MEDIA_BUCKET,
  presentationFolder,
  TITLE_MAX_LENGTH,
  VIDEO_EXTENSIONS,
  VIDEO_MAX_BYTES,
  type StoredMedia,
} from "@/lib/media";
import {
  getSupabaseSession,
  LOGIN_PATH,
  requireStaff,
} from "@/lib/supabase/session";
import { newToken } from "@/lib/token";

export type ActionResult = { error?: string };
export type FormState = ActionResult & { saved?: boolean };
// O e-mail volta junto com o erro, pra pessoa só redigitar a senha.
export type LoginState = ActionResult & { email?: string };

const UNIQUE_VIOLATION = "23505";

const id = z.uuid();

const clientSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(1, "Informe o nome do cliente.").max(80),
  // Regras de @ do Instagram: letras, números, ponto e sublinhado, até 30.
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9._]{1,30}$/,
      "O @ aceita só letras, números, ponto e sublinhado (até 30), sem o @.",
    ),
  bio: z.string().trim().max(300, "A bio aceita até 300 caracteres."),
});

const titleSchema = z
  .string()
  .trim()
  .min(1, "Informe o título, ex.: Semana 20–26 out.")
  .max(TITLE_MAX_LENGTH, `O título aceita até ${TITLE_MAX_LENGTH} caracteres.`);

const storedMediaSchema = z.object({
  path: z.string().max(200),
  kind: z.enum(["image", "video"]),
  poster: z.string().max(200).optional(),
});

const postSchema = z.object({
  presentationId: id,
  postId: id.optional(),
  type: z.enum(["post", "carousel", "reels"]),
  caption: z
    .string()
    .trim()
    .max(CAPTION_MAX_LENGTH, `A legenda aceita até ${CAPTION_MAX_LENGTH} caracteres.`),
  media: z.array(storedMediaSchema).min(1).max(CAROUSEL_MAX_IMAGES),
});

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Dados inválidos.";
}

// Login ------------------------------------------------------------------

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const typed = formData.get("email");
  const email = typeof typed === "string" ? typed.slice(0, 200) : "";
  const parsed = z
    .object({ email: z.email().max(200), password: z.string().min(1).max(200) })
    .safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });
  if (!parsed.success) return { error: "E-mail ou senha incorretos.", email };

  const supabase = await getSupabaseSession();
  if (!supabase) {
    return { error: "O Supabase não está configurado. Veja o README.", email };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "E-mail ou senha incorretos.", email };

  redirect("/admin");
}

export async function logout() {
  const supabase = await getSupabaseSession();
  await supabase?.auth.signOut();
  redirect(LOGIN_PATH);
}

// Storage ----------------------------------------------------------------

type BucketFile = { mimetype: string; size: number };

async function listFolder(
  supabase: SupabaseClient,
  folder: string,
): Promise<Map<string, BucketFile>> {
  const files = new Map<string, BucketFile>();
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(folder, { limit: pageSize, offset });
    if (error) throw new Error(error.message);
    for (const file of data) {
      // Subpasta vem sem metadata.
      if (!file.metadata) continue;
      files.set(`${folder}/${file.name}`, {
        mimetype: String(file.metadata.mimetype ?? ""),
        size: Number(file.metadata.size ?? 0),
      });
    }
    if (data.length < pageSize) return files;
  }
}

// Apaga os arquivos e confere que saíram: sem política de delete, o remove()
// do Storage devolve sucesso sem apagar nada.
async function removeFiles(
  supabase: SupabaseClient,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) return;
  const { data, error } = await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  if (error) throw new Error(error.message);
  if (data.length < paths.length) {
    throw new Error("nem todos os arquivos foram apagados do bucket");
  }
}

async function emptyFolder(supabase: SupabaseClient, folder: string) {
  const files = await listFolder(supabase, folder);
  await removeFiles(supabase, [...files.keys()]);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// Clientes ---------------------------------------------------------------

export async function saveClient(input: {
  id?: string;
  name: string;
  handle: string;
  bio: string;
}): Promise<ActionResult & { id?: string }> {
  const { supabase } = await requireStaff();

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { id: clientId, name, handle, bio } = parsed.data;

  const row = { name, handle, bio: bio || null };
  const query = clientId
    ? supabase.from("clients").update(row).eq("id", clientId)
    : supabase.from("clients").insert(row);
  const { data, error } = await query.select("id").maybeSingle();

  if (error?.code === UNIQUE_VIOLATION) {
    return { error: `Já existe um cliente com o @${handle}.` };
  }
  if (error) return { error: `Não deu pra salvar: ${error.message}` };
  if (!data) return { error: "Este cliente não existe mais." };

  refresh();
  return { id: data.id };
}

// Chamada depois que o navegador enviou a foto pra clients/{id}/avatar.jpg.
export async function setClientAvatar(clientId: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  if (!id.safeParse(clientId).success) return { error: "Cliente inválido." };

  const path = avatarPath(clientId);
  try {
    const file = (await listFolder(supabase, clientFolder(clientId))).get(path);
    if (!file) return { error: "A foto não chegou no bucket. Tente de novo." };
    if (file.mimetype !== IMAGE_OUTPUT_TYPE || file.size > IMAGE_MAX_BYTES) {
      await removeFiles(supabase, [path]);
      return { error: "A foto enviada não é um JPEG válido." };
    }

    const { data: client, error: readError } = await supabase
      .from("clients")
      .select("avatar_path")
      .eq("id", clientId)
      .maybeSingle();
    if (readError) throw new Error(readError.message);
    if (!client) return { error: "Este cliente não existe mais." };

    const { error } = await supabase
      .from("clients")
      .update({ avatar_path: path })
      .eq("id", clientId);
    if (error) throw new Error(error.message);

    // Foto antiga com outro nome (a do seed, por exemplo) não fica sobrando.
    if (client.avatar_path && client.avatar_path !== path) {
      await removeFiles(supabase, [client.avatar_path]);
    }
  } catch (error) {
    return { error: `Não deu pra salvar a foto: ${message(error)}` };
  }

  refresh();
  return {};
}

export async function deleteClient(input: {
  id: string;
  confirmation: string;
}): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  if (!id.safeParse(input.id).success) return { error: "Cliente inválido." };

  const { data: client, error: readError } = await supabase
    .from("clients")
    .select("handle, presentations(id)")
    .eq("id", input.id)
    .maybeSingle()
    .overrideTypes<
      { handle: string; presentations: { id: string }[] },
      { merge: false }
    >();
  if (readError) return { error: `Não deu pra excluir: ${readError.message}` };
  if (!client) return { error: "Este cliente não existe mais." };

  const typed = String(input.confirmation).trim().replace(/^@/, "").toLowerCase();
  if (typed !== client.handle.toLowerCase()) {
    return { error: "O @ digitado não confere com o do cliente." };
  }

  // Primeiro os arquivos, depois a linha: se o bucket falhar, o cliente
  // continua no painel e dá pra tentar de novo.
  try {
    for (const presentation of client.presentations) {
      await emptyFolder(supabase, presentationFolder(presentation.id));
    }
    await emptyFolder(supabase, clientFolder(input.id));
  } catch (error) {
    return { error: `Não deu pra apagar os arquivos: ${message(error)}` };
  }

  const { error } = await supabase.from("clients").delete().eq("id", input.id);
  if (error) return { error: `Não deu pra excluir: ${error.message}` };

  redirect("/admin");
}

// Apresentações ----------------------------------------------------------

export async function createPresentation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireStaff();

  const clientId = id.safeParse(formData.get("clientId"));
  const title = titleSchema.safeParse(formData.get("title"));
  if (!clientId.success) return { error: "Cliente inválido." };
  if (!title.success) return { error: firstIssue(title.error) };

  const { data, error } = await supabase
    .from("presentations")
    .insert({ client_id: clientId.data, title: title.data, token: newToken() })
    .select("id")
    .single();
  if (error) return { error: `Não deu pra criar: ${error.message}` };

  redirect(`/admin/apresentacoes/${data.id}`);
}

export async function renamePresentation(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await requireStaff();

  const presentationId = id.safeParse(formData.get("id"));
  const title = titleSchema.safeParse(formData.get("title"));
  if (!presentationId.success) return { error: "Apresentação inválida." };
  if (!title.success) return { error: firstIssue(title.error) };

  const { data, error } = await supabase
    .from("presentations")
    .update({ title: title.data })
    .eq("id", presentationId.data)
    .select("id")
    .maybeSingle();
  if (error) return { error: `Não deu pra salvar: ${error.message}` };
  if (!data) return { error: "Esta apresentação não existe mais." };

  refresh();
  return { saved: true };
}

export async function deletePresentation(
  presentationId: string,
): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  if (!id.safeParse(presentationId).success) {
    return { error: "Apresentação inválida." };
  }

  // Os posts caem em cascata no banco; a mídia do bucket não.
  try {
    await emptyFolder(supabase, presentationFolder(presentationId));
  } catch (error) {
    return { error: `Não deu pra apagar a mídia: ${message(error)}` };
  }

  const { error } = await supabase
    .from("presentations")
    .delete()
    .eq("id", presentationId);
  if (error) return { error: `Não deu pra excluir: ${error.message}` };

  refresh();
  return {};
}

// Posts ------------------------------------------------------------------

function mediaPaths(media: StoredMedia[]): string[] {
  return media.flatMap((item) => (item.poster ? [item.path, item.poster] : [item.path]));
}

// Confere a forma do post e que cada arquivo existe no bucket, na pasta da
// apresentação, com o tipo e o tamanho esperados. Devolve o erro, se houver.
function checkPostMedia(
  type: z.infer<typeof postSchema>["type"],
  media: StoredMedia[],
  files: Map<string, BucketFile>,
): string | null {
  const images = media.filter((item) => item.kind === "image");
  const videos = media.filter((item) => item.kind === "video");

  if (type === "post" && (media.length !== 1 || images.length !== 1)) {
    return "Um post tem exatamente 1 imagem.";
  }
  if (
    type === "carousel" &&
    (videos.length > 0 ||
      images.length < CAROUSEL_MIN_IMAGES ||
      images.length > CAROUSEL_MAX_IMAGES)
  ) {
    return `Um carrossel tem de ${CAROUSEL_MIN_IMAGES} a ${CAROUSEL_MAX_IMAGES} imagens.`;
  }
  if (type === "reels" && (media.length !== 1 || videos.length !== 1 || !videos[0].poster)) {
    return "Um Reels tem 1 vídeo e 1 imagem de capa.";
  }
  if (images.some((item) => item.poster)) return "Só o vídeo tem capa.";

  const paths = mediaPaths(media);
  if (new Set(paths).size !== paths.length) return "Há arquivos repetidos no post.";

  const videoPaths = new Set(videos.map((item) => item.path));
  for (const path of paths) {
    const file = files.get(path);
    if (!file) return "Um dos arquivos não chegou no bucket. Tente de novo.";

    if (videoPaths.has(path)) {
      if (!VIDEO_EXTENSIONS[file.mimetype]) return "O vídeo precisa ser MP4 ou MOV.";
      if (file.size > VIDEO_MAX_BYTES) return "O vídeo passa do limite de 50 MB.";
    } else {
      if (file.mimetype !== IMAGE_OUTPUT_TYPE) return "As imagens precisam ser JPEG.";
      if (file.size > IMAGE_MAX_BYTES) return "Uma das imagens é grande demais.";
    }
  }
  return null;
}

// Chamada depois que o navegador enviou todos os arquivos pro bucket.
export async function savePost(input: {
  presentationId: string;
  postId?: string;
  type: string;
  caption: string;
  media: StoredMedia[];
}): Promise<ActionResult> {
  const { supabase } = await requireStaff();

  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { presentationId, postId, type, caption, media } = parsed.data;

  try {
    const { data: posts, error: readError } = await supabase
      .from("posts")
      .select("id, position, type, media")
      .eq("presentation_id", presentationId)
      .overrideTypes<
        { id: string; position: number; type: string; media: StoredMedia[] }[],
        { merge: false }
      >();
    if (readError) throw new Error(readError.message);

    const current = postId ? posts.find((post) => post.id === postId) : undefined;
    if (postId && !current) return { error: "Este post não existe mais." };
    if (current && current.type !== type) {
      return { error: "O tipo do post não muda depois de criado." };
    }

    // Arquivo de outro post da mesma apresentação não pode ser reaproveitado.
    const taken = new Set(
      posts.filter((post) => post.id !== postId).flatMap((post) => mediaPaths(post.media)),
    );
    if (mediaPaths(media).some((path) => taken.has(path))) {
      return { error: "Um dos arquivos já pertence a outro post." };
    }

    // listFolder só devolve o que está em presentations/{id}/, então um
    // caminho de fora da pasta cai no "não chegou no bucket".
    const files = await listFolder(supabase, presentationFolder(presentationId));
    const mediaError = checkPostMedia(type, media, files);
    if (mediaError) return { error: mediaError };

    if (current) {
      const { error } = await supabase
        .from("posts")
        .update({ caption, media })
        .eq("id", current.id);
      if (error) throw new Error(error.message);

      // O post já aponta pros arquivos novos. Se a limpeza dos antigos falhar,
      // sobra arquivo órfão no bucket, mas o post salvo continua inteiro.
      const kept = new Set(mediaPaths(media));
      await removeFiles(
        supabase,
        mediaPaths(current.media).filter(
          (path) => !kept.has(path) && files.has(path),
        ),
      ).catch(() => {});
    } else {
      const position = Math.max(0, ...posts.map((post) => post.position)) + 1;
      const { error } = await supabase.from("posts").insert({
        presentation_id: presentationId,
        position,
        type,
        caption,
        media,
      });
      if (error) throw new Error(error.message);
    }
  } catch (error) {
    return { error: `Não deu pra salvar o post: ${message(error)}` };
  }

  refresh();
  return {};
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const { supabase } = await requireStaff();
  if (!id.safeParse(postId).success) return { error: "Post inválido." };

  try {
    const { data: post, error: readError } = await supabase
      .from("posts")
      .select("presentation_id, media")
      .eq("id", postId)
      .maybeSingle()
      .overrideTypes<
        { presentation_id: string; media: StoredMedia[] },
        { merge: false }
      >();
    if (readError) throw new Error(readError.message);
    if (!post) return { error: "Este post não existe mais." };

    // Só o que ainda existe: arquivo que já sumiu não trava a exclusão.
    const files = await listFolder(
      supabase,
      presentationFolder(post.presentation_id),
    );
    await removeFiles(
      supabase,
      mediaPaths(post.media).filter((path) => files.has(path)),
    );

    // position não é renumerada: a tela do cliente numera pela ordem.
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) throw new Error(error.message);
  } catch (error) {
    return { error: `Não deu pra excluir o post: ${message(error)}` };
  }

  refresh();
  return {};
}
