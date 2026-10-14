import { isLinkActive } from "./presentation-rules";
import { samplePresentations } from "./sample-data";
import { numberStories } from "./stories";
import { getSupabaseAdmin, MEDIA_BUCKET } from "./supabase/server";
import type { Media, Post, Presentation } from "./types";

// Alfabeto do nanoid, entre 10 e 32 caracteres.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{10,32}$/;

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 6;

// GIF transparente de 1px, pra um cliente sem foto não virar imagem quebrada.
const EMPTY_IMAGE =
  "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

type StoredMedia = { path: string; kind: Media["kind"]; poster?: string | null };

type PresentationRow = {
  active: boolean;
  title: string;
  token: string;
  client: {
    name: string;
    handle: string;
    bio: string | null;
    avatar_path: string | null;
  };
  posts: {
    id: string;
    position: number;
    type: Post["type"];
    caption: string | null;
    media: StoredMedia[];
  }[];
  stories: { id: string; day: string; position: number; path: string }[];
};

// Único ponto de leitura da tela do cliente. Sem cache: cada requisição
// consulta o banco e assina as URLs de novo.
export async function getPresentationByToken(
  token: string,
): Promise<Presentation | null> {
  // Modo demo: os tokens de exemplo nunca tocam no Supabase.
  const sample = samplePresentations.find((p) => p.token === token);
  if (sample) return { ...sample, posts: sortByPosition(sample.posts) };

  if (!TOKEN_PATTERN.test(token)) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("presentations")
    .select(
      "active, title, token, client:clients!inner(name, handle, bio, avatar_path), posts(id, position, type, caption, media), stories(id, day, position, path)",
    )
    .eq("token", token)
    .order("position", { referencedTable: "posts" })
    .maybeSingle()
    .overrideTypes<PresentationRow, { merge: false }>();

  if (error) {
    throw new Error(`Falha ao buscar a apresentação: ${error.message}`);
  }
  // Link desativado no painel: responde como se a prévia não existisse, sem
  // assinar nenhuma URL.
  if (!data || !isLinkActive(data)) return null;

  const paths = new Set<string>();
  if (data.client.avatar_path) paths.add(data.client.avatar_path);
  for (const post of data.posts) {
    for (const item of post.media) {
      paths.add(item.path);
      if (item.poster) paths.add(item.poster);
    }
  }
  // Stories na mesma chamada de assinatura, com a mesma validade.
  for (const story of data.stories) paths.add(story.path);

  const signedUrls = new Map<string, string>();
  if (paths.size > 0) {
    const { data: signed, error: signError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls([...paths], SIGNED_URL_TTL_SECONDS);

    if (signError) {
      throw new Error(`Falha ao assinar as URLs: ${signError.message}`);
    }
    for (const item of signed) {
      if (item.path && item.signedUrl) signedUrls.set(item.path, item.signedUrl);
    }
  }

  const sign = (path: string | null | undefined) =>
    path ? signedUrls.get(path) : undefined;

  return {
    title: data.title,
    token: data.token,
    client: {
      name: data.client.name,
      handle: data.client.handle,
      bio: data.client.bio ?? "",
      avatarUrl: sign(data.client.avatar_path) ?? EMPTY_IMAGE,
    },
    posts: sortByPosition(data.posts).map((post) => ({
      id: post.id,
      position: post.position,
      type: post.type,
      caption: post.caption ?? "",
      // Arquivo que sumiu do bucket fica de fora em vez de quebrar a tela.
      media: post.media.flatMap((item): Media[] => {
        const url = sign(item.path);
        if (!url) return [];
        return [{ url, kind: item.kind, poster: sign(item.poster) }];
      }),
    })),
    // Story cujo arquivo sumiu fica de fora antes da numeração.
    stories: numberStories(
      data.stories.flatMap((story) => {
        const url = sign(story.path);
        return url ? [{ ...story, url }] : [];
      }),
    ),
  };
}

function sortByPosition<T extends { position: number }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => a.position - b.position);
}
