import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { MEDIA_BUCKET, type PostType, type StoredMedia } from "./media";
import { daysSince, isOld } from "./storage-rules";
import { requireStaff } from "./supabase/session";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export type AdminClient = {
  id: string;
  name: string;
  handle: string;
  bio: string;
  avatarUrl: string | null;
};

export type AdminClientSummary = AdminClient & { presentationCount: number };

export type AdminPresentation = {
  id: string;
  title: string;
  token: string;
  createdAt: string | null;
  postCount: number;
  ageDays: number | null;
  bytes: number;
};

export type OldPresentation = {
  id: string;
  title: string;
  clientName: string;
  ageDays: number;
  bytes: number;
  postCount: number;
};

type ClientRow = {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  avatar_path: string | null;
};

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function listClients(): Promise<AdminClientSummary[]> {
  const { supabase } = await requireStaff();

  const { data, error } = await supabase
    .from("clients")
    .select("id, name, handle, bio, avatar_path, presentations(count)")
    .order("name")
    .overrideTypes<
      (ClientRow & { presentations: { count: number }[] })[],
      { merge: false }
    >();
  if (error) throw new Error(`Falha ao listar os clientes: ${error.message}`);

  const avatars = await signAvatars(supabase, data);
  return data.map((row) => ({
    ...toClient(row, avatars),
    presentationCount: row.presentations[0]?.count ?? 0,
  }));
}

export async function getClient(id: string): Promise<{
  client: AdminClient;
  presentations: AdminPresentation[];
} | null> {
  const { supabase } = await requireStaff();
  if (!isUuid(id)) return null;

  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, name, handle, bio, avatar_path, presentations(id, title, token, created_at, posts(count))",
    )
    .eq("id", id)
    .order("created_at", { referencedTable: "presentations", ascending: false })
    .maybeSingle()
    .overrideTypes<
      ClientRow & {
        presentations: {
          id: string;
          title: string;
          token: string;
          created_at: string | null;
          posts: { count: number }[];
        }[];
      },
      { merge: false }
    >();
  if (error) throw new Error(`Falha ao buscar o cliente: ${error.message}`);
  if (!data) return null;

  const [avatars, sizes] = await Promise.all([
    signAvatars(supabase, [data]),
    presentationSizes(supabase),
  ]);
  const now = new Date();
  return {
    client: toClient(data, avatars),
    presentations: data.presentations.map((p) => ({
      id: p.id,
      title: p.title,
      token: p.token,
      createdAt: p.created_at,
      postCount: p.posts[0]?.count ?? 0,
      ageDays: daysSince(p.created_at, now),
      bytes: sizes.get(p.id) ?? 0,
    })),
  };
}

// Armazenamento --------------------------------------------------------------

// As somas vêm de funções security definer (migration do medidor): o painel
// continua sem service_role e sem ler storage.objects direto.
export async function getStorageUsage(): Promise<number> {
  const { supabase } = await requireStaff();
  const { data, error } = await supabase.rpc("media_usage_bytes");
  if (error) throw new Error(`Falha ao medir o armazenamento: ${error.message}`);
  return Number(data ?? 0);
}

// Bytes no bucket por apresentação. Também usada pela limpeza em lote.
export async function presentationSizes(
  supabase: SupabaseClient,
): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc("media_usage_by_presentation");
  if (error) throw new Error(`Falha ao medir as apresentações: ${error.message}`);
  const rows = (data ?? []) as { presentation_id: string; bytes: number }[];
  return new Map(rows.map((row) => [row.presentation_id, Number(row.bytes)]));
}

// Apresentações com mais de 21 dias, das mais antigas pras mais novas.
export async function listOldPresentations(): Promise<OldPresentation[]> {
  const { supabase } = await requireStaff();

  const [{ data, error }, sizes] = await Promise.all([
    supabase
      .from("presentations")
      .select("id, title, created_at, client:clients!inner(name), posts(count)")
      .order("created_at")
      .overrideTypes<
        {
          id: string;
          title: string;
          created_at: string | null;
          client: { name: string };
          posts: { count: number }[];
        }[],
        { merge: false }
      >(),
    presentationSizes(supabase),
  ]);
  if (error) throw new Error(`Falha ao listar as apresentações: ${error.message}`);

  const now = new Date();
  return data.flatMap((row) => {
    const ageDays = daysSince(row.created_at, now);
    if (ageDays === null || !isOld(ageDays)) return [];
    return [
      {
        id: row.id,
        title: row.title,
        clientName: row.client.name,
        ageDays,
        bytes: sizes.get(row.id) ?? 0,
        postCount: row.posts[0]?.count ?? 0,
      },
    ];
  });
}

function toClient(row: ClientRow, avatars: Map<string, string>): AdminClient {
  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    bio: row.bio ?? "",
    avatarUrl: (row.avatar_path && avatars.get(row.avatar_path)) || null,
  };
}

function signAvatars(supabase: SupabaseClient, rows: ClientRow[]) {
  return signPaths(
    supabase,
    rows.flatMap((row) => (row.avatar_path ? [row.avatar_path] : [])),
  );
}

async function signPaths(
  supabase: SupabaseClient,
  paths: string[],
): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  if (paths.length === 0) return urls;

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  // Arquivo que não assina fica sem prévia em vez de derrubar o painel.
  if (error) return urls;

  for (const item of data) {
    if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl);
  }
  return urls;
}

export type AdminMedia = StoredMedia & {
  url: string | null;
  posterUrl: string | null;
};

export type AdminPost = {
  id: string;
  type: PostType;
  caption: string;
  media: AdminMedia[];
};

export type AdminPresentationDetail = {
  id: string;
  title: string;
  token: string;
  client: { id: string; name: string; handle: string };
  posts: AdminPost[];
};

export async function getPresentation(
  id: string,
): Promise<AdminPresentationDetail | null> {
  const { supabase } = await requireStaff();
  if (!isUuid(id)) return null;

  const { data, error } = await supabase
    .from("presentations")
    .select(
      "id, title, token, client:clients!inner(id, name, handle), posts(id, position, type, caption, media)",
    )
    .eq("id", id)
    .order("position", { referencedTable: "posts" })
    .maybeSingle()
    .overrideTypes<
      Omit<AdminPresentationDetail, "posts"> & {
        posts: {
          id: string;
          position: number;
          type: PostType;
          caption: string | null;
          media: StoredMedia[];
        }[];
      },
      { merge: false }
    >();
  if (error) throw new Error(`Falha ao buscar a apresentação: ${error.message}`);
  if (!data) return null;

  const urls = await signPaths(
    supabase,
    data.posts.flatMap((post) =>
      post.media.flatMap((item) =>
        item.poster ? [item.path, item.poster] : [item.path],
      ),
    ),
  );

  return {
    id: data.id,
    title: data.title,
    token: data.token,
    client: data.client,
    posts: [...data.posts]
      .sort((a, b) => a.position - b.position)
      .map((post) => ({
        id: post.id,
        type: post.type,
        caption: post.caption ?? "",
        media: post.media.map((item) => ({
          path: item.path,
          kind: item.kind,
          ...(item.poster ? { poster: item.poster } : {}),
          url: urls.get(item.path) ?? null,
          posterUrl: (item.poster && urls.get(item.poster)) || null,
        })),
      })),
  };
}

export async function getStaffEmail(): Promise<string> {
  const { user } = await requireStaff();
  return user.email ?? "";
}
